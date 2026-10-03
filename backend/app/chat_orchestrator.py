import json
import re
import logging

import tiktoken
from urllib.parse import quote

from app.config.constants import MAX_COST_PER_USER_PER_DAY_USD
from app.config.models import MODEL_PRICING_USD
from app.config.prompts import (
    SYSTEM_PROMPT,
    DETERMINE_BOARD_GAME_PROMPT_TEMPLATE,
    EXPLAIN_RULES_PROMPT_TEMPLATE,
    UNKNOWN_VALUE,
    CITATION_REGEX_PATTERN,
    USER_QUESTION_STRING,
    THE_BOARD_GAME_IS_STRING,
    THE_RULEBOOK_PAGES_ARE_STRING,
)
from app.llm import create_chat_client, create_embedding_client
from app.mongodb_client import MongoDBClient
from app.types import Message, TokenUsage
from config import Config

logger = logging.getLogger(__name__)

class ChatOrchestrator:
    def __init__(self, config: Config):
        self._chat_client = create_chat_client(config)
        self._embedding_client = create_embedding_client(config)
        self._chat_model_name = config.CHAT_MODEL
        self._embedding_model_name = config.EMBEDDING_MODEL
        # cl100k_base is a reasonable tokenizer approximation for non-OpenAI chat models
        try:
            self._encoding = tiktoken.encoding_for_model(self._chat_model_name)
        except KeyError:
            self._encoding = tiktoken.get_encoding("cl100k_base")
        self._mongodb_client = MongoDBClient(config=config)
        self._known_board_games = None

    def _get_embedding_and_token_count(
        self,
        question: str,
    ):
        return self._embedding_client.embed(
            question,
            task_type="RETRIEVAL_QUERY",
        )

    def _get_token_count(
        self,
        text: str,
    ):
        encoding = self._encoding.encode(text)

        return len(encoding)

    def _call_chat_model(
        self,
        messages: list[Message],
        stream: bool,
        allow_web_search: bool = False,
    ):
        return self._chat_client.complete(
            messages,
            stream=stream,
            allow_web_search=allow_web_search,
        )

    def _construct_rulebook_link(
        self,
        board_game: str,
        citation: dict,
    ):
        rulebook_name = citation.get("rulebook_name")
        page_num = citation.get("page_num")

        if not rulebook_name or not page_num:
            raise ValueError(f"Malformed citation detected:\n{json.dumps(citation)}")

        return f"{quote(f'{board_game}/{rulebook_name}.pdf')}#page={page_num}"

    def _parse_citations(
        self,
        board_game: str,
        text: str
    ):
        def add_link_to_citation(match):
            citation_str = match.group(0)
            json_str = citation_str.replace("'", '"')
            citation_dict = json.loads(json_str)
            
            if not isinstance(citation_dict, dict):
                raise ValueError("Citation must be a dictionary")
            if "rulebook_name" not in citation_dict or "page_num" not in citation_dict:
                raise ValueError("Citation missing required fields")
            if not isinstance(citation_dict["rulebook_name"], str):
                raise ValueError("rulebook_name must be a string")
            if not isinstance(citation_dict["page_num"], (int, str)):
                raise ValueError("page_num must be an integer or string")
            if not citation_dict["rulebook_name"].strip():
                raise ValueError("rulebook_name cannot be empty")
            
            display_text = f"{citation_dict['rulebook_name']}, Page {citation_dict['page_num']}"
            link = self._construct_rulebook_link(board_game, citation_dict)

            return f"[{display_text}]({link})"

        return re.sub(
            CITATION_REGEX_PATTERN,
            add_link_to_citation,
            text,
        )

    def _convert_to_user_facing_message(
        self,
        message: Message,
    ):
        content = message["content"]
        if message["role"] == "user":

            if content.startswith(SYSTEM_PROMPT):
                content = content[len(SYSTEM_PROMPT):]

            if (
                THE_BOARD_GAME_IS_STRING in content and
                THE_RULEBOOK_PAGES_ARE_STRING in content and
                USER_QUESTION_STRING in content
            ):
                content = content.split(USER_QUESTION_STRING)[1].strip()

            return {"content": content, "role": "user"}

        if message["role"] == "assistant":
            return {"content": content, "role": "assistant"}

        raise ValueError(f"Invalid role value '{message['role']}', expected 'user' or 'assistant'")

    def _get_token_usage_cost_usd(
        self,
        model_token_usages: dict[str, TokenUsage],
    ):
        total_cost = 0.0

        for model_name, model_usage in model_token_usages.items():
            if model_name not in MODEL_PRICING_USD:
                logger.warning(
                    "Unknown model pricing for %s, skipping cost calculation",
                    model_name
                )
                continue

            model_pricing = MODEL_PRICING_USD[model_name]

            input_token_cost = (
                model_pricing["one_million_input_tokens"]
                * model_usage["input_tokens"]
                / 1_000_000
            )

            output_token_cost = 0
            if "output_tokens" in model_usage:
                output_token_cost = (
                    model_pricing["one_million_output_tokens"]
                    * model_usage["output_tokens"]
                    / 1_000_000
                )

            web_search_cost = 0
            if "web_searches" in model_usage:
                web_search_rate = model_pricing.get("one_thousand_web_searches", 0.0)
                web_search_cost = (
                    web_search_rate
                    * model_usage["web_searches"]
                    / 1_000
                )

            total_cost += input_token_cost + output_token_cost + web_search_cost

        return total_cost

    def get_known_board_games(self) -> list[str]:
        if self._known_board_games is None:
            self._known_board_games = self._mongodb_client.get_all_board_games()

        return self._known_board_games

    def get_message_history(
        self,
        user_id: str,
        board_game: str,
    ):
        message_history = self._mongodb_client.get_message_history(user_id, board_game)

        return [
            self._convert_to_user_facing_message(message)
            for message in message_history
        ]

    def delete_messages_from_index(
        self,
        user_id: str,
        board_game: str,
        index: int,
    ):
        if index < 0:
            raise ValueError(f"Index must be non-negative, but got {index}")

        self._mongodb_client.delete_messages_from_index(user_id, board_game, index)

    def clear_message_history(
        self,
        user_id: str,
        board_game: str,
    ):
        self._mongodb_client.clear_message_history(user_id, board_game)

    def determine_board_game(
        self,
        user_id: str,
        question: str
    ):
        prompt = DETERMINE_BOARD_GAME_PROMPT_TEMPLATE.replace("<QUESTION>", question)
        message = {
            "content": prompt,
            "role": "user",
        }
        response = self._call_chat_model([message], stream=False)

        self._mongodb_client.increment_todays_token_usage(
            user_id=user_id,
            model_name=self._chat_model_name,
            input_tokens=self._get_token_count(prompt),
            output_tokens=self._get_token_count(response),
        )

        if response in self.get_known_board_games() or response == UNKNOWN_VALUE:
            return response

        raise ValueError(
            f"Received an unexpected response when attempting to determine board game: {response}"
        )

    def ask_question(
        self,
        user_id: str,
        board_game: str,
        question: str,
    ):
        embedding, token_count = self._get_embedding_and_token_count(question)
        self._mongodb_client.increment_todays_token_usage(
            user_id=user_id,
            model_name=self._embedding_model_name,
            input_tokens=token_count,
        )

        # Get N most relevant pages of rulebooks for the selected board game
        # and construct a prompt with these pages in them
        rulebook_pages = self._mongodb_client.get_similar_rulebook_pages(
            board_game,
            embedding,
            limit=5
        )

        rulebook_pages_as_string = "\n".join(
            json.dumps(page)
            for page in rulebook_pages
        )

        prompt = (
            EXPLAIN_RULES_PROMPT_TEMPLATE
            .replace("<BOARD_GAME>", board_game)
            .replace("<RULEBOOK_PAGES>", rulebook_pages_as_string)
            .replace("<QUESTION>", question)
        )

        message_history = self._mongodb_client.get_message_history(user_id, board_game)

        # Prepend the system prompt if this is the first message
        if len(message_history) == 0:
            prompt = SYSTEM_PROMPT + prompt

        user_message = {
            "content": prompt,
            "role": "user"
        }
        input_tokens = self._get_token_count(prompt)

        stream = self._call_chat_model(
            messages=message_history + [user_message],
            stream=True,
            allow_web_search=True,
        )

        full_response = ""
        citation_buffer = ""
        in_citation = False
        web_search_count = 0

        # Buffer the stream when we hit a citation so we can parse it before returning
        for event in stream:
            if event["type"] == "text_delta":
                content = event["text"]

                # Check if we're entering a citation
                if CITATION_REGEX_PATTERN[0] in content and not in_citation:
                    in_citation = True
                    citation_buffer = content
                    continue

                # Check if we're exiting a citation
                elif CITATION_REGEX_PATTERN[-1] in content and in_citation:
                    in_citation = False
                    citation_buffer += content
                    parsed = self._parse_citations(board_game, citation_buffer)

                    citation_buffer = ""
                    full_response += parsed
                    yield parsed

                # We're in the middle of a citation
                elif in_citation:
                    citation_buffer += content
                    continue

                # Regular content
                else:
                    full_response += content
                    yield content

            elif event["type"] == "web_search_completed":
                web_search_count += 1

        assistant_message = {
            "content": full_response,
            "role": "assistant"
        }
        output_tokens = self._get_token_count(full_response)

        self._mongodb_client.append_messages(
            user_id=user_id,
            board_game=board_game,
            messages=[user_message, assistant_message],
        )
        self._mongodb_client.increment_todays_token_usage(
            user_id=user_id,
            model_name=self._chat_model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            web_searches=web_search_count,
        )

    def submit_feedback(
        self,
        user_id: str,
        content: str,
        email: str | None = None,
    ) -> None:
        self._mongodb_client.store_feedback(
            user_id=user_id,
            content=content,
            email=email,
        )

    def get_user_theme(self, user_id: str) -> int | None:
        return self._mongodb_client.get_user_theme(user_id)

    def set_user_theme(self, user_id: str, theme: int) -> None:
        self._mongodb_client.set_user_theme(user_id, theme)

    def user_has_exceeded_daily_token_limit(
        self,
        user_id: str,
    ):
        model_token_usages = self._mongodb_client.get_todays_token_usage(user_id)
        if not model_token_usages:
            return False

        cost_usd = self._get_token_usage_cost_usd(model_token_usages)

        return cost_usd > MAX_COST_PER_USER_PER_DAY_USD
