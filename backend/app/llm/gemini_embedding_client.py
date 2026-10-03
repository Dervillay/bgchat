from google import genai
from google.genai import types

from app.config.models import MODEL_PRICING_USD
from app.llm.embedding_types import EmbeddingClient
from app.llm.errors import raise_provider_error


class GeminiEmbeddingClient(EmbeddingClient):
    def __init__(self, api_key: str, model_name: str):
        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name
        self._dimensions = MODEL_PRICING_USD[model_name].get("dimensions")

    def embed(
        self,
        text: str,
        *,
        task_type: str = "RETRIEVAL_QUERY",
    ) -> tuple[list[float], int]:
        try:
            config_kwargs = {"task_type": task_type}
            if self._dimensions is not None:
                config_kwargs["output_dimensionality"] = self._dimensions

            response = self._client.models.embed_content(
                model=self._model_name,
                contents=text,
                config=types.EmbedContentConfig(**config_kwargs),
            )

            embedding = response.embeddings[0].values
            usage = getattr(response, "metadata", None) or getattr(response, "usage_metadata", None)
            token_count = getattr(usage, "prompt_token_count", None) if usage else None
            if token_count is None:
                token_count = max(1, len(text) // 4)

            return list(embedding), int(token_count)
        except Exception as e:
            raise_provider_error(e, "embedding creation", "gemini")
