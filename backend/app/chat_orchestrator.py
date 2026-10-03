import json
import re
import logging

import tiktoken
from urllib.parse import quote

from app.config.constants import (
    MAX_COST_PER_USER_PER_DAY_USD,
    RULEBOOK_PAGE_LIMIT,
)
from app.config.models import MODEL_PRICING_USD
from app.config.prompts import (
    SYSTEM_PROMPT,
    DETERMINE_BOARD_GAME_PROMPT_TEMPLATE,
    EXPLAIN_RULES_PROMPT_TEMPLATE,
    UNKNOWN_VALUE,
    CITATION_REGEX_PATTERN,
)
from app.llm import create_chat_client, create_embedding_client
from app.mongodb_client import MongoDBClient
from app.types import Message, RulebookPage, TokenUsage
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
        self._mongodb_client = MongoDBClient(config)
        self._known_board_games = None

    def _get_token_count(self, text: str) -> int:
        return len(self._encoding.encode(text))

    def _parse_citations(self, board_game: str, text: str) -> str:
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

            rulebook_name = citation_dict["rulebook_name"]
            page_num = citation_dict["page_num"]
            display_text = f"{rulebook_name}, Page {page_num}"
            link = f"{quote(f'{board_game}/{rulebook_name}.pdf')}#page={page_num}"
            return f"[{display_text}]({link})"

        return re.sub(CITATION_REGEX_PATTERN, add_link_to_citation, text)

    def _format_rulebook_pages(self, rulebook_pages: list[RulebookPage]) -> str:
        if not rulebook_pages:
            return "(none)"

        sections: list[str] = []
        for page in rulebook_pages:
            text = (page.get("text") or "").strip()
            rulebook_name = page.get("rulebook_name") or "unknown"
            page_num = page.get("page_num", "?")
            sections.append(f"### {rulebook_name} p.{page_num}\n{text}")

        return "\n\n".join(sections)

    def _build_model_messages(
        self,
        stored_history: list[Message],
        current_user_prompt: str,
    ) -> list[Message]:
        messages: list[Message] = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]

        for message in stored_history:
            role = message["role"]
            if role in ("user", "assistant"):
                messages.append({
                    "role": role,
                    "content": message["content"],
                })

        messages.append({
            "role": "user",
            "content": current_user_prompt,
        })
        return messages

    def _get_token_usage_cost_usd(
        self,
        model_token_usages: dict[str, TokenUsage],
    ) -> float:
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

    def get_message_history(self, user_id: str, board_game: str) -> list[Message]:
        return [
            message
            for message in self._mongodb_client.get_message_history(user_id, board_game)
            if message["role"] in ("user", "assistant")
        ]

    def determine_board_game(self, user_id: str, question: str) -> str:
        prompt = DETERMINE_BOARD_GAME_PROMPT_TEMPLATE.replace("<QUESTION>", question)
        response = self._chat_client.complete(
            [{"content": prompt, "role": "user"}],
            stream=False,
        )

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
        embedding, token_count = self._embedding_client.embed(
            question,
            task_type="RETRIEVAL_QUERY",
        )
        self._mongodb_client.increment_todays_token_usage(
            user_id=user_id,
            model_name=self._embedding_model_name,
            input_tokens=token_count,
        )

        rulebook_pages = self._mongodb_client.get_similar_rulebook_pages(
            board_game,
            embedding,
            limit=RULEBOOK_PAGE_LIMIT,
        )
        logger.info("RAG for %s: pages=%d", board_game, len(rulebook_pages))

        current_user_prompt = (
            EXPLAIN_RULES_PROMPT_TEMPLATE
            .replace("<BOARD_GAME>", board_game)
            .replace("<RULEBOOK_PAGES>", self._format_rulebook_pages(rulebook_pages))
            .replace("<QUESTION>", question)
        )

        stored_history = self._mongodb_client.get_message_history(user_id, board_game)
        model_messages = self._build_model_messages(stored_history, current_user_prompt)
        input_tokens = sum(
            self._get_token_count(message["content"])
            for message in model_messages
        )

        # Always expose web search; the system prompt tells the model to use it
        # only when <sources> are insufficient to answer.
        stream = self._chat_client.complete(
            messages=model_messages,
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

                if CITATION_REGEX_PATTERN[0] in content and not in_citation:
                    in_citation = True
                    citation_buffer = content
                    continue

                elif CITATION_REGEX_PATTERN[-1] in content and in_citation:
                    in_citation = False
                    citation_buffer += content
                    parsed = self._parse_citations(board_game, citation_buffer)

                    citation_buffer = ""
                    full_response += parsed
                    yield parsed

                elif in_citation:
                    citation_buffer += content
                    continue

                else:
                    full_response += content
                    yield content

            elif event["type"] == "web_search_completed":
                web_search_count += 1

        # Persist lean history: bare question + assistant answer (no source dumps)
        self._mongodb_client.append_messages(
            user_id=user_id,
            board_game=board_game,
            messages=[
                {"content": question, "role": "user"},
                {"content": full_response, "role": "assistant"},
            ],
        )
        self._mongodb_client.increment_todays_token_usage(
            user_id=user_id,
            model_name=self._chat_model_name,
            input_tokens=input_tokens,
            output_tokens=self._get_token_count(full_response),
            web_searches=web_search_count,
        )

    def delete_messages_from_index(
        self,
        user_id: str,
        board_game: str,
        index: int,
    ) -> None:
        self._mongodb_client.delete_messages_from_index(user_id, board_game, index)

    def clear_message_history(self, user_id: str, board_game: str) -> None:
        self._mongodb_client.clear_message_history(user_id, board_game)

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

    def user_has_exceeded_daily_token_limit(self, user_id: str) -> bool:
        model_token_usages = self._mongodb_client.get_todays_token_usage(user_id)
        if not model_token_usages:
            return False

        return self._get_token_usage_cost_usd(model_token_usages) > MAX_COST_PER_USER_PER_DAY_USD
