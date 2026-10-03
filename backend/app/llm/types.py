from typing import Iterator, Literal, TypedDict, Union

from app.types import Message


class TextDeltaEvent(TypedDict):
    type: Literal["text_delta"]
    text: str


class WebSearchCompletedEvent(TypedDict):
    type: Literal["web_search_completed"]


ChatStreamEvent = Union[TextDeltaEvent, WebSearchCompletedEvent]
ChatStream = Iterator[ChatStreamEvent]


class ChatClient:
    """Provider-agnostic chat client interface."""

    def complete(
        self,
        messages: list[Message],
        *,
        stream: bool,
        allow_web_search: bool = False,
    ) -> str | ChatStream:
        raise NotImplementedError
