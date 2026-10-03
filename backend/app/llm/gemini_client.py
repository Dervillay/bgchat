from google import genai
from google.genai import types

from app.llm.errors import raise_provider_error
from app.llm.types import ChatClient, ChatStream
from app.types import Message


class GeminiChatClient(ChatClient):
    def __init__(self, api_key: str, model_name: str):
        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name

    def _to_gemini_contents(self, messages: list[Message]) -> list[types.Content]:
        contents: list[types.Content] = []
        for message in messages:
            role = "model" if message["role"] == "assistant" else "user"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=message["content"])],
                )
            )
        return contents

    def _build_config(self, allow_web_search: bool) -> types.GenerateContentConfig:
        tools = None
        if allow_web_search:
            tools = [types.Tool(google_search=types.GoogleSearch())]

        return types.GenerateContentConfig(tools=tools)

    def _count_web_searches(self, response) -> int:
        candidates = getattr(response, "candidates", None) or []
        search_count = 0

        for candidate in candidates:
            grounding = getattr(candidate, "grounding_metadata", None)
            if grounding is None:
                continue

            queries = getattr(grounding, "web_search_queries", None) or []
            search_count += len(queries)

            # Some SDK versions expose grounding chunks instead of queries.
            if not queries:
                chunks = getattr(grounding, "grounding_chunks", None) or []
                search_count += sum(
                    1 for chunk in chunks if getattr(chunk, "web", None) is not None
                )

        return search_count

    def _stream_events(self, stream) -> ChatStream:
        emitted_searches = 0

        for chunk in stream:
            text = getattr(chunk, "text", None)
            if text:
                yield {"type": "text_delta", "text": text}

            search_count = self._count_web_searches(chunk)
            while emitted_searches < search_count:
                emitted_searches += 1
                yield {"type": "web_search_completed"}

    def complete(
        self,
        messages: list[Message],
        *,
        stream: bool,
        allow_web_search: bool = False,
    ) -> str | ChatStream:
        try:
            contents = self._to_gemini_contents(messages)
            config = self._build_config(allow_web_search)

            if stream:
                response = self._client.models.generate_content_stream(
                    model=self._model_name,
                    contents=contents,
                    config=config,
                )
                return self._stream_events(response)

            response = self._client.models.generate_content(
                model=self._model_name,
                contents=contents,
                config=config,
            )
            return response.text or ""
        except Exception as e:
            raise_provider_error(e, "chat completion", "gemini")
