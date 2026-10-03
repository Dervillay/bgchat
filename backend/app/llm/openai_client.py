import openai

from app.llm.errors import raise_provider_error
from app.llm.types import ChatClient, ChatStream
from app.types import Message


class OpenAIChatClient(ChatClient):
    def __init__(self, api_key: str, model_name: str):
        self._client = openai.OpenAI(api_key=api_key)
        self._model_name = model_name

    def _get_output_message_from_response(
        self,
        response: openai.types.responses.Response,
    ) -> str:
        try:
            output_message = next(
                item for item in response.output
                if isinstance(item, openai.types.responses.ResponseOutputMessage)
            )
            return output_message.content[0].text
        except StopIteration as e:
            raise ValueError(f"No output message found in response: {response}") from e

    def _stream_events(self, stream) -> ChatStream:
        for event in stream:
            if event.type == "response.output_text.delta":
                if event.delta:
                    yield {"type": "text_delta", "text": event.delta}
            elif event.type == "response.web_search_call.completed":
                yield {"type": "web_search_completed"}

    def complete(
        self,
        messages: list[Message],
        *,
        stream: bool,
        allow_web_search: bool = False,
    ) -> str | ChatStream:
        try:
            response = self._client.responses.create(
                model=self._model_name,
                input=messages,
                stream=stream,
                tools=[{"type": "web_search"}] if allow_web_search else [],
                store=False,
            )
            if stream:
                return self._stream_events(response)

            return self._get_output_message_from_response(response)
        except Exception as e:
            raise_provider_error(e, "chat completion", "openai")
