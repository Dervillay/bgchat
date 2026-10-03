import json
import os
from typing import Literal

ModelProvider = Literal["openai", "anthropic", "gemini"]
ModelModality = Literal["chat", "embedding"]

SUPPORTED_MODEL_PROVIDERS = ("openai", "anthropic", "gemini")

_PRICING_PATH = os.path.join(os.path.dirname(__file__), "model_pricing.json")

with open(_PRICING_PATH, encoding="utf-8") as _pricing_file:
    MODEL_PRICING_USD: dict[str, dict] = json.load(_pricing_file)


def get_model_provider(model_name: str) -> ModelProvider:
    pricing = MODEL_PRICING_USD.get(model_name)
    if not pricing or "provider" not in pricing:
        raise ValueError(f"Unknown model pricing/provider for '{model_name}'")

    provider = pricing["provider"]
    if provider not in SUPPORTED_MODEL_PROVIDERS:
        raise ValueError(f"Unsupported provider '{provider}' for model '{model_name}'")

    return provider


def get_model_modality(model_name: str) -> ModelModality:
    if model_name not in MODEL_PRICING_USD:
        raise ValueError(f"Unknown model pricing for '{model_name}'")

    modality = MODEL_PRICING_USD[model_name].get("modality", "chat")
    if modality not in ("chat", "embedding"):
        raise ValueError(f"Unsupported modality '{modality}' for model '{model_name}'")

    return modality


def validate_chat_model(model_name: str) -> str:
    if get_model_modality(model_name) != "chat":
        raise ValueError(
            f"CHAT_MODEL '{model_name}' is not a chat model. "
            "Choose a chat model from model_pricing.json."
        )
    get_model_provider(model_name)
    return model_name


def validate_embedding_model(model_name: str) -> str:
    if get_model_modality(model_name) != "embedding":
        raise ValueError(
            f"EMBEDDING_MODEL '{model_name}' is not an embedding model. "
            "Choose an embedding model from model_pricing.json."
        )
    get_model_provider(model_name)
    return model_name
