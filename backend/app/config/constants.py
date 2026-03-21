# Configuration constants
DEFAULT_TIMEOUT_SECONDS = 5
MAX_COST_PER_USER_PER_DAY_USD = 0.01
JWT_VALIDATION_LEEWAY_SECONDS = 60

# Error message constants
# User ID validation errors
ERROR_USER_ID_CANNOT_BE_EMPTY = "User ID cannot be empty"
ERROR_USER_ID_TOO_LONG = "User ID too long"
ERROR_INVALID_USER_ID_FORMAT = "Invalid user ID format"

# Authentication errors
ERROR_AUTHORIZATION_HEADER_EXPECTED_BUT_NOT_FOUND = "Authorization header expected but not found"
ERROR_AUTHORIZATION_HEADER_MUST_START_WITH_BEARER = "Authorization header must start with 'Bearer'"
ERROR_TOKEN_NOT_FOUND = "Token not found"
ERROR_AUTHORIZATION_HEADER_MUST_BE_BEARER_TOKEN = "Authorization header must be Bearer token"
ERROR_TOKEN_DOES_NOT_CONTAIN_USER_ID = "Token does not contain a user ID"
ERROR_INVALID_USER_ID = "Invalid user ID"
ERROR_INVALID_HEADER_NO_KID = "Invalid header: No KID"
ERROR_UNABLE_TO_FIND_APPROPRIATE_KEY = "Unable to find appropriate key"
ERROR_INVALID_TOKEN = "Invalid token"
ERROR_AUTH0_CONFIGURATION_NOT_PROPERLY_SET_UP = "Auth0 configuration is not properly set up"
ERROR_ERROR_EXTRACTING_USER_ID = "Error extracting user ID"

# Validation errors (generic patterns used in multiple validators)
ERROR_CANNOT_BE_EMPTY = "cannot be empty"
ERROR_TOO_LONG = "too long"
ERROR_EMAIL_FORMAT_IS_INVALID = "Email format is invalid"

# Board game validation errors
ERROR_BOARD_GAME_NAME_CANNOT_BE_EMPTY = "Board game name cannot be empty"
ERROR_BOARD_GAME_NAME_TOO_LONG = "Board game name too long"

# Question validation errors
ERROR_QUESTION_CANNOT_BE_EMPTY = "Question cannot be empty"
ERROR_QUESTION_TOO_LONG = "Question too long"

# Content validation errors
ERROR_CONTENT_CANNOT_BE_EMPTY = "Content cannot be empty"
ERROR_CONTENT_TOO_LONG = "Content too long"
