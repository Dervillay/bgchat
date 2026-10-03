def raise_provider_error(error: Exception, operation: str, provider: str) -> None:
    error_name = type(error).__name__
    message = str(error)

    if error_name in {"AuthenticationError", "PermissionDeniedError"}:
        raise ValueError(
            f"Authentication failed during {operation} ({provider}): {message}"
        ) from error

    if error_name in {"BadRequestError", "InvalidArgumentError", "ClientError"}:
        raise ValueError(
            f"Bad request during {operation} ({provider}): {message}"
        ) from error

    if error_name in {"RateLimitError", "ResourceExhausted"}:
        raise ValueError(
            f"Rate limit exceeded during {operation} ({provider}): {message}"
        ) from error

    if error_name in {"APIConnectionError", "APITimeoutError", "ConnectError"}:
        raise ValueError(
            f"API connection error during {operation} ({provider}): {message}"
        ) from error

    raise ValueError(
        f"Unexpected error during {operation} ({provider}): {message}"
    ) from error
