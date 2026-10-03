"""
Pytest configuration and fixtures for backend tests.
"""
import os
import pytest
from unittest.mock import MagicMock, patch
from pymongo import MongoClient
import jwt
from datetime import datetime, timedelta, timezone


# Set testing environment variables before importing app
os.environ.update({
    'FLASK_ENV': 'testing',
    'SECRET_KEY': 'test-secret-key-at-least-32-chars-long',
    'FRONTEND_URLS': 'http://localhost:3000',
    'MONGODB_HOST': 'localhost',
    'MONGODB_USERNAME': 'test_user',
    'MONGODB_PASSWORD': 'test_password',
    'MONGODB_DB_NAME': 'bgchat_test',
    'OPENAI_API_KEY': 'sk-test-key-1234567890',
    'CHAT_MODEL': 'gpt-4o-mini',
    'EMBEDDING_MODEL': 'text-embedding-ada-002',
    'AUTH0_DOMAIN': 'test.auth0.com',
    'AUTH0_AUDIENCE': 'test-audience',
    # Use HS256 so we can test with a simple secret string (RS256 requires a key pair which is overkill for testing)
    'ALGORITHM': 'HS256',
})


@pytest.fixture(scope='session')
def app():
    """Create and configure a test Flask application."""
    from app import create_app
    from app.chat_orchestrator import ChatOrchestrator

    with patch('app.mongodb_client.MongoClient') as mock_mongo_client:
        mock_client_instance = MagicMock()
        mock_client_instance.admin.command.return_value = {'ok': 1}
        mock_mongo_client.return_value = mock_client_instance

        with patch.object(ChatOrchestrator, '__init__', lambda self, config: None):
            app = create_app()
            app.orchestrator = MagicMock()

            yield app


@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture(scope='function')
def mock_mongodb():
    """Mock MongoDB client and operations."""
    mock_client = MagicMock(spec=MongoClient)
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_admin = MagicMock()

    # Set up admin mock for ping command
    mock_client.admin = mock_admin
    mock_admin.command = MagicMock(return_value={'ok': 1})

    mock_client.__getitem__.return_value = mock_db
    mock_db.__getitem__.return_value = mock_collection

    return {
        'client': mock_client,
        'db': mock_db,
        'collection': mock_collection,
    }


@pytest.fixture(scope='function')
def valid_jwt_token():
    """Generate a valid JWT token for testing."""
    payload = {
        'sub': 'test-user-123',
        'iss': f"https://{os.environ.get('AUTH0_DOMAIN')}/",
        'aud': os.environ.get('AUTH0_AUDIENCE'),
        'exp': datetime.now(timezone.utc) + timedelta(hours=1),
        'iat': datetime.now(timezone.utc),
        'azp': 'test-client-id',
        'scope': 'openid profile email',
    }

    token = jwt.encode(payload, os.environ.get('SECRET_KEY'), algorithm=os.environ.get('ALGORITHM'))
    return token


@pytest.fixture(scope='function')
def auth_headers(valid_jwt_token):
    """Generate authorization headers with valid JWT."""
    with patch('app.utils.decorators.validate_jwt'):
        with patch('app.utils.decorators.get_user_id_from_auth_header', return_value='test-user-123'):
            yield {
                'Authorization': f'Bearer {valid_jwt_token}',
                'Content-Type': 'application/json',
            }


@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset singleton instances between tests."""
    from app.mongodb_client import MongoDBClient
    MongoDBClient._instance = None
    yield
    MongoDBClient._instance = None


@pytest.fixture(scope='function')
def mock_jwks_response():
    """Mock Auth0 JWKS endpoint response."""
    return {
        'keys': [
            {
                'kty': 'RSA',
                'kid': 'test-key-id',
                'use': 'sig',
                'n': 'test-modulus',
                'e': 'AQAB',
            }
        ]
    }
