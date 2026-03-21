import os
from dotenv import load_dotenv


class Config:
    """Base configuration class."""

    def __init__(self):
        self._load_env_vars()
        self._validate_env_vars()

    def _load_env_vars(self):
        """Load environment variables into class attributes."""
        frontend_urls = os.environ.get('FRONTEND_URLS', '')
        self.FRONTEND_URLS = [url.strip() for url in frontend_urls.split(',') if url.strip()]
        self.SECRET_KEY = os.environ.get('SECRET_KEY')
        self.SESSION_COOKIE_SECURE = True
        self.SESSION_COOKIE_HTTPONLY = True
        self.SESSION_COOKIE_SAMESITE = 'Strict'
        self.SESSION_COOKIE_MAX_AGE = 3600
        self.PERMANENT_SESSION_LIFETIME = 3600

        # MongoDB
        self.MONGODB_HOST = os.environ.get('MONGODB_HOST')
        self.MONGODB_USERNAME = os.environ.get('MONGODB_USERNAME')
        self.MONGODB_PASSWORD = os.environ.get('MONGODB_PASSWORD')
        self.MONGODB_DB_NAME = os.environ.get('MONGODB_DB_NAME')

        # OpenAI
        self.OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

        # Auth0
        self.AUTH0_DOMAIN = os.environ.get('AUTH0_DOMAIN')
        self.AUTH0_AUDIENCE = os.environ.get('AUTH0_AUDIENCE')
        self.ALGORITHM = os.environ.get('ALGORITHM', 'RS256')

        # Comma-separated Auth0 user IDs (JWT `sub`) that skip daily token limits (e.g. owner testing in prod)
        bypass_raw = os.environ.get('TOKEN_LIMIT_BYPASS_USER_IDS', '')
        self.TOKEN_LIMIT_BYPASS_USER_IDS = frozenset(
            uid.strip() for uid in bypass_raw.split(',') if uid.strip()
        )

    def _validate_env_vars(self):
        """Validate environment variables."""
        missing_vars = []

        # Security
        if not self.SECRET_KEY:
            missing_vars.append('SECRET_KEY')
        elif len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")

        # Database configuration
        if not self.MONGODB_HOST:
            missing_vars.append('MONGODB_HOST')
        if not self.MONGODB_USERNAME:
            missing_vars.append('MONGODB_USERNAME')
        if not self.MONGODB_PASSWORD:
            missing_vars.append('MONGODB_PASSWORD')
        if not self.MONGODB_DB_NAME:
            missing_vars.append('MONGODB_DB_NAME')

        # OpenAI configuration
        if not self.OPENAI_API_KEY:
            missing_vars.append('OPENAI_API_KEY')

        # Auth0 configuration
        if not self.AUTH0_DOMAIN:
            missing_vars.append('AUTH0_DOMAIN')
        if not self.AUTH0_AUDIENCE:
            missing_vars.append('AUTH0_AUDIENCE')

        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")


class DevelopmentConfig(Config):
    """Development configuration."""

    def __init__(self):
        if os.path.exists('.env.development'):
            load_dotenv('.env.development')
        super().__init__()
        self.FLASK_ENV = 'development'
        self.FLASK_DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""

    def __init__(self):
        if os.path.exists('.env.production'):
            load_dotenv('.env.production')
        super().__init__()
        self.FLASK_ENV = 'production'
        self.FLASK_DEBUG = False


class TestingConfig(Config):
    """Testing configuration."""

    def __init__(self):
        # Environment variables should be set by conftest.py
        super().__init__()
        self.FLASK_ENV = 'testing'
        self.FLASK_DEBUG = False
        self.TESTING = True


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
