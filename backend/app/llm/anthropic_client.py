import anthropic

from app.llm.errors import raise_provider_error
from app.llm.types import ChatClient, ChatStream
from app.types import Message

# Basic Anthropic web search tool; see Anthropic docs for newer variants.
_WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5,
}

_DEFAULT_MAX_TOKENS = 4096


class AnthropicChatClient(ChatClient):
    def __init__(self, api_key: str, model_name: str):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model_name = model_name

    def _split_system_messages(
        self,
        messages: list[Message],
    ) -> tuple[str | None, list[Message]]:
        system_parts: list[str] = []
        conversation: list[Message] = []

        for message in messages:
            if message["role"] == "system":
                system_parts.append(message["content"])
            else:
                conversation.append(message)

        system = "\n\n".join(system_parts) if system_parts else None
        return system, conversation

    def _stream_events(self, stream) -> ChatStream:
        for event in stream:
            event_type = getattr(event, "type", None)

            if event_type == "content_block_delta":
                delta = getattr(event, "delta", None)
                text = getattr(delta, "text", None) if delta is not None else None
                if text:
                    yield {"type": "text_delta", "text": text}

            elif event_type == "content_block_start":
                content_block = getattr(event, "content_block", None)
                block_type = getattr(content_block, "type", None)
                block_name = getattr(content_block, "name", None)
                if block_type == "server_tool_use" and block_name == "web_search":
                    yield {"type": "web_search_completed"}

    def complete(
        self,
        messages: list[Message],
        *,
        stream: bool,
        allow_web_search: bool = False,
    ) -> str | ChatStream:
        try:
            system, conversation = self._split_system_messages(messages)
            kwargs = {
                "model": self._model_name,
                "max_tokens": _DEFAULT_MAX_TOKENS,
                "messages": conversation,
                "tools": [_WEB_SEARCH_TOOL] if allow_web_search else [],
            }
            if system:
                kwargs["system"] = system

            if stream:
                response = self._client.messages.create(**kwargs, stream=True)
                return self._stream_events(response)

            response = self._client.messages.create(**kwargs, stream=False)
            text_parts = [
                block.text
                for block in response.content
                if getattr(block, "type", None) == "text"
            ]
            return "".join(text_parts)
        except Exception as e:
            raise_provider_error(e, "chat completion", "anthropic")
