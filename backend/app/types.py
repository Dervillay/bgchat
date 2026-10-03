from typing import TypedDict, Literal

class Message(TypedDict):
    """Type definition for a chat message."""
    role: Literal["system", "user", "assistant"]
    content: str

class RulebookPage(TypedDict):
    """Type definition for a rulebook page."""
    rulebook_name: str
    page_num: int
    text: str

class TokenUsage(TypedDict):
    """Type definition for token usage for a single model."""
    input_tokens: int
    output_tokens: int
    web_searches: int
