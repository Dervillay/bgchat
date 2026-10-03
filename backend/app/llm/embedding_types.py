class EmbeddingClient:
    """Provider-agnostic embedding client interface."""

    def embed(
        self,
        text: str,
        *,
        task_type: str = "RETRIEVAL_QUERY",
    ) -> tuple[list[float], int]:
        """Return (embedding, input_token_count)."""
        raise NotImplementedError
