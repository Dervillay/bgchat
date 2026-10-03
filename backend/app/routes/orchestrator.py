"""
API routes for interacting with the board game rulebook chat orchestrator.
"""
import logging
import os
import json

from flask import (
    Blueprint,
    request,
    current_app,
    Response,
    stream_with_context,
    send_from_directory,
)

from app.config.paths import RULEBOOKS_PATH
from app.utils.decorators import check_daily_token_limit, validate_auth_token, validate_json_body
from app.utils.responses import success_response, validation_error, not_found_error, internal_error

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

orchestrator_bp = Blueprint("orchestrator", __name__)


@orchestrator_bp.route("/known-board-games", methods=["GET"])
@validate_auth_token
def get_known_board_games():
    try:
        board_games = current_app.orchestrator.get_known_board_games()
        return success_response(data=board_games)
    except Exception as e:
        logger.error("Error getting board games: %s", str(e))
        return internal_error("Failed to retrieve board games")


@orchestrator_bp.route("/message-history", methods=["POST"])
@validate_json_body(board_game=str)
@validate_auth_token
def get_message_history():
    try:
        data = request.get_json()
        board_game = data["board_game"]

        if board_game not in current_app.orchestrator.get_known_board_games():
            return validation_error("Unrecognised board game")

        message_history = current_app.orchestrator.get_message_history(request.user_id, board_game)

        return success_response(data=message_history)
    except Exception as e:
        logger.error("Error getting message history: %s", str(e))
        return internal_error("Failed to retrieve message history")


@orchestrator_bp.route("/pdfs/<path:filepath>")
@validate_auth_token
def serve_pdf(filepath: str):
    try:
        normalized_filepath = os.path.normpath(filepath)
        if '..' in normalized_filepath or normalized_filepath.startswith('/') or normalized_filepath.startswith('\\'):
            logger.warning("Path traversal attempt detected: %s", filepath)
            return validation_error("Invalid file path")

        # Ensure the path is within the rulebooks directory using realpath
        full_path = os.path.join(RULEBOOKS_PATH, normalized_filepath)
        real_path = os.path.realpath(full_path)
        rulebooks_real_path = os.path.realpath(RULEBOOKS_PATH)

        # Security check: ensure the real path is still within RULEBOOKS_PATH
        if not real_path.startswith(rulebooks_real_path):
            logger.warning("Path traversal attempt detected (realpath): %s -> %s", filepath, real_path)
            return validation_error("Invalid file path")

        if not os.path.exists(real_path):
            logger.warning("File not found: %s", real_path)
            return not_found_error("File not found")

        if not real_path.lower().endswith('.pdf'):
            logger.warning("Invalid file type requested: %s", real_path)
            return validation_error("Invalid file type")

        # Use the real path for serving the file
        directory = os.path.dirname(real_path)
        filename = os.path.basename(real_path)

        response = send_from_directory(
            directory,
            filename,
            mimetype="application/pdf",
            as_attachment=False,
        )

        return response

    except Exception as e:
        logger.error("Error serving PDF: %s", str(e))
        return internal_error("Error serving file")


@orchestrator_bp.route("/determine-board-game", methods=["POST"])
@validate_json_body(question=str)
@check_daily_token_limit
@validate_auth_token
def determine_board_game():
    try:
        data = request.get_json()
        question = data["question"]
        board_game = current_app.orchestrator.determine_board_game(request.user_id, question)

        return success_response(data=board_game)
    except Exception as e:
        logger.error("Error determining board game: %s", str(e))
        return internal_error("Failed to determine board game")


@orchestrator_bp.route("/ask-question", methods=["POST"])
@validate_json_body(question=str, board_game=str)
@check_daily_token_limit
@validate_auth_token
def ask_question():
    try:
        data = request.get_json()
        question = data["question"]
        board_game = data["board_game"]

        if board_game not in current_app.orchestrator.get_known_board_games():
            return validation_error("Unrecognised board game")

        logger.info("Received question from user %s for %s", request.user_id, board_game)

        iterator = current_app.orchestrator.ask_question(request.user_id, board_game, question)

        def generate():
            for chunk in iterator:
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

        response = Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            }
        )
        return response
    except Exception as e:
        logger.error("Error asking question: %s", str(e))
        return internal_error("Failed to process question")


@orchestrator_bp.route("/delete-messages-from-index", methods=["POST"])
@validate_json_body(board_game=str, index=int)
@validate_auth_token
def delete_messages_from_index():
    try:
        data = request.get_json()
        board_game = data["board_game"]
        index = data["index"]

        if board_game not in current_app.orchestrator.get_known_board_games():
            return validation_error("Unrecognised board game")

        if index < 0:
            return validation_error("Index must be non-negative")

        current_app.orchestrator.delete_messages_from_index(
            request.user_id, board_game, index
        )

        return success_response()
    except Exception as e:
        logger.error("Error deleting messages: %s", str(e))
        return internal_error("Failed to delete messages")


@orchestrator_bp.route("/clear-message-history", methods=["POST"])
@validate_json_body(board_game=str)
@validate_auth_token
def clear_message_history():
    try:
        data = request.get_json()
        board_game = data["board_game"]

        if board_game not in current_app.orchestrator.get_known_board_games():
            return validation_error("Unrecognised board game")

        current_app.orchestrator.clear_message_history(request.user_id, board_game)

        return success_response()
    except Exception as e:
        logger.error("Error clearing message history: %s", str(e))
        return internal_error("Failed to clear message history")


@orchestrator_bp.route("/submit-feedback", methods=["POST"])
@validate_json_body(content=str, email=str | None)
@validate_auth_token
def submit_feedback():
    try:
        data = request.get_json()
        content = data["content"]
        email = data.get("email")

        current_app.orchestrator.submit_feedback(
            request.user_id,
            content,
            email,
        )

        return success_response()
    except Exception as e:
        logger.error("Error submitting feedback: %s", str(e))
        return internal_error("Failed to submit feedback")


@orchestrator_bp.route("/user-theme", methods=["GET"])
@validate_auth_token
def get_user_theme():
    try:
        theme = current_app.orchestrator.get_user_theme(request.user_id)
        return success_response(data=theme)
    except Exception as e:
        logger.error("Error getting user theme: %s", str(e))
        return internal_error("Failed to get user theme")


@orchestrator_bp.route("/user-theme", methods=["POST"])
@validate_json_body(theme=int)
@validate_auth_token
def set_user_theme():
    try:
        data = request.get_json()
        theme = data["theme"]

        current_app.orchestrator.set_user_theme(request.user_id, theme)

        return success_response()
    except Exception as e:
        logger.error("Error setting user theme: %s", str(e))
        return internal_error("Failed to set user theme")


# Global error handlers
@orchestrator_bp.errorhandler(404)
def resource_not_found(e):
    return not_found_error("Resource not found")


@orchestrator_bp.errorhandler(405)
def method_not_allowed(e):
    return validation_error("Method not allowed")


@orchestrator_bp.errorhandler(500)
def internal_server_error(e):
    logger.error("Internal server error: %s", str(e))
    return internal_error("Internal server error")


@orchestrator_bp.errorhandler(Exception)
def unexpected_error(e):
    logger.error("An unexpected error occurred: %s", str(e))
    return internal_error("An unexpected error occurred")
