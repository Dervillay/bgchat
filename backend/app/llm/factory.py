from app.config.models import get_model_provider
from app.llm.anthropic_client import AnthropicChatClient
from app.llm.embedding_types import EmbeddingClient
from app.llm.gemini_client import GeminiChatClient
from app.llm.gemini_embedding_client import GeminiEmbeddingClient
from app.llm.openai_client import OpenAIChatClient
from app.llm.openai_embedding_client import OpenAIEmbeddingClient
from app.llm.types import ChatClient
from config import Config


def create_chat_client(config: Config) -> ChatClient:
    provider = get_model_provider(config.CHAT_MODEL)

    if provider == "openai":
        return OpenAIChatClient(
            api_key=config.OPENAI_API_KEY,
            model_name=config.CHAT_MODEL,
        )

    if provider == "anthropic":
        return AnthropicChatClient(
            api_key=config.ANTHROPIC_API_KEY,
            model_name=config.CHAT_MODEL,
        )

    if provider == "gemini":
        return GeminiChatClient(
            api_key=config.GEMINI_API_KEY,
            model_name=config.CHAT_MODEL,
        )

    raise ValueError(f"Unsupported chat provider: {provider}")


def create_embedding_client(config: Config) -> EmbeddingClient:
    provider = get_model_provider(config.EMBEDDING_MODEL)

    if provider == "openai":
        return OpenAIEmbeddingClient(
            api_key=config.OPENAI_API_KEY,
            model_name=config.EMBEDDING_MODEL,
        )

    if provider == "gemini":
        return GeminiEmbeddingClient(
            api_key=config.GEMINI_API_KEY,
            model_name=config.EMBEDDING_MODEL,
        )

    raise ValueError(
        f"Provider '{provider}' does not support embeddings. "
        "Use an OpenAI or Gemini embedding model."
    )
