import openai

from app.llm.embedding_types import EmbeddingClient
from app.llm.errors import raise_provider_error


class OpenAIEmbeddingClient(EmbeddingClient):
    def __init__(self, api_key: str, model_name: str):
        self._client = openai.OpenAI(api_key=api_key)
        self._model_name = model_name

    def embed(
        self,
        text: str,
        *,
        task_type: str = "RETRIEVAL_QUERY",
    ) -> tuple[list[float], int]:
        del task_type  # OpenAI embeddings do not use task types
        try:
            response = self._client.embeddings.create(
                model=self._model_name,
                input=text,
            )
            return response.data[0].embedding, response.usage.prompt_tokens
        except Exception as e:
            raise_provider_error(e, "embedding creation", "openai")
