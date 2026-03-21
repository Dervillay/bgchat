import os

from flask import Flask, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.chat_orchestrator import ChatOrchestrator
from app.routes.orchestrator import orchestrator_bp
from config import config


def add_security_headers(response):
    """Add security headers to all responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    response.headers['X-Frame-Options'] = 'DENY'

    csp_parts = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "connect-src 'self' https://*.auth0.com https://api.openai.com",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ]
    response.headers['Content-Security-Policy'] = "; ".join(csp_parts)

    # Only allow iframe embedding for PDF routes
    if '/pdfs/' in request.path:
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Content-Security-Policy'] = response.headers['Content-Security-Policy'].replace(
            "frame-ancestors 'none'", 
            "frame-ancestors 'self'"
        )

    return response


def create_app():
    app = Flask(__name__)

    flask_env = os.environ.get('FLASK_ENV', 'development')
    if flask_env not in config:
        raise ValueError(
            f"Invalid FLASK_ENV={flask_env!r}. "
            f"Use one of: {', '.join(sorted(config))}"
        )
    loaded_config = config[flask_env]()

    allowed_origins = []
    if loaded_config.FRONTEND_URLS:
        allowed_origins.extend(loaded_config.FRONTEND_URLS)
    if flask_env == 'development':
        allowed_origins.append('http://localhost:3000')
        allowed_origins.append('http://127.0.0.1:3000')
    
    CORS(
        app,
        origins=allowed_origins,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST"],
    )

    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["100 per hour"],
        storage_uri="memory://",
        strategy="fixed-window"
    )

    app.config.from_object(loaded_config)
    app.orchestrator = ChatOrchestrator(config=loaded_config)
    app.limiter = limiter
    app.register_blueprint(orchestrator_bp)
    app.after_request(add_security_headers)

    return app
