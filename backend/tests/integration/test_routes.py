"""
Integration tests for API routes.
"""
import json
from unittest.mock import Mock, patch

import pytest
from flask import Response


@pytest.fixture(autouse=True)
def reset_token_limit_bypass(app):
    """TOKEN_LIMIT_BYPASS_USER_IDS is mutable app config; reset so tests do not leak."""
    app.config["TOKEN_LIMIT_BYPASS_USER_IDS"] = frozenset()
    yield


class TestKnownBoardGames:
    """Test /known-board-games endpoint."""

    def test_get_known_board_games_success(self, client, app, auth_headers):
        """Test successful retrieval of known board games."""
        mock_games = ["Wingspan", "Azul", "Catan"]
        app.orchestrator.get_known_board_games = Mock(return_value=mock_games)

        response = client.get('/known-board-games', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == mock_games

    def test_get_known_board_games_unauthenticated(self, client, app):
        """Test unauthenticated access returns 401."""
        response = client.get('/known-board-games')
        assert response.status_code == 401

    def test_get_known_board_games_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.get_known_board_games = Mock(side_effect=Exception("Database error"))

        response = client.get('/known-board-games', headers=auth_headers)

        assert response.status_code == 500


class TestMessageHistory:
    """Test message history endpoints."""

    def test_get_message_history_success(self, client, app, auth_headers):
        """Test successful retrieval of message history."""
        mock_messages = [
            {"role": "user", "content": "Question"},
            {"role": "assistant", "content": "Answer"},
        ]
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.get_message_history = Mock(return_value=mock_messages)

        response = client.post(
            '/message-history',
            json={"board_game": "Wingspan"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == mock_messages

    def test_get_message_history_invalid_game(self, client, app, auth_headers):
        """Test error for unrecognised board game."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])

        response = client.post(
            '/message-history',
            json={"board_game": "Not Wingspan"},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_get_message_history_missing_field(self, client, auth_headers):
        """Test error for missing board_game field."""
        response = client.post(
            '/message-history',
            json={},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_get_message_history_unauthenticated(self, client):
        """Test unauthenticated access to message history."""
        response = client.post(
            '/message-history',
            json={"board_game": "Wingspan"}
        )
        assert response.status_code == 401

    def test_get_message_history_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.get_message_history = Mock(side_effect=Exception("Database error"))

        response = client.post(
            '/message-history',
            json={"board_game": "Wingspan"},
            headers=auth_headers
        )

        assert response.status_code == 500

    def test_clear_message_history_success(self, client, app, auth_headers):
        """Test successful clearing of message history."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.clear_message_history = Mock()

        response = client.post(
            '/clear-message-history',
            json={"board_game": "Wingspan"},
            headers=auth_headers
        )

        assert response.status_code == 200
        app.orchestrator.clear_message_history.assert_called_once()

    def test_clear_message_history_invalid_game(self, client, app, auth_headers):
        """Test error for unrecognised board game."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])

        response = client.post(
            '/clear-message-history',
            json={"board_game": "Not Wingspan"},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_clear_message_history_missing_field(self, client, auth_headers):
        """Test error for missing board_game field."""
        response = client.post(
            '/clear-message-history',
            json={},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_clear_message_history_unauthenticated(self, client):
        """Test unauthenticated access to clear message history."""
        response = client.post(
            '/clear-message-history',
            json={"board_game": "Wingspan"}
        )
        assert response.status_code == 401

    def test_clear_message_history_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.clear_message_history = Mock(side_effect=Exception("Database error"))

        response = client.post(
            '/clear-message-history',
            json={"board_game": "Wingspan"},
            headers=auth_headers
        )

        assert response.status_code == 500

    def test_delete_messages_from_index_success(self, client, app, auth_headers):
        """Test successful deletion of messages from index."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.delete_messages_from_index = Mock()

        response = client.post(
            '/delete-messages-from-index',
            json={"board_game": "Wingspan", "index": 5},
            headers=auth_headers
        )

        assert response.status_code == 200
        app.orchestrator.delete_messages_from_index.assert_called_once()

    def test_delete_messages_negative_index(self, client, app, auth_headers):
        """Test error for negative index."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])

        response = client.post(
            '/delete-messages-from-index',
            json={"board_game": "Wingspan", "index": -1},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_delete_messages_invalid_game(self, client, app, auth_headers):
        """Test error for unrecognised board game."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])

        response = client.post(
            '/delete-messages-from-index',
            json={"board_game": "Not Wingspan", "index": 5},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_delete_messages_missing_fields(self, client, auth_headers):
        """Test error for missing required fields."""
        response = client.post(
            '/delete-messages-from-index',
            json={"board_game": "Wingspan"},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_delete_messages_unauthenticated(self, client):
        """Test unauthenticated access to delete messages."""
        response = client.post(
            '/delete-messages-from-index',
            json={"board_game": "Wingspan", "index": 5}
        )
        assert response.status_code == 401

    def test_delete_messages_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.delete_messages_from_index = Mock(side_effect=Exception("Database error"))

        response = client.post(
            '/delete-messages-from-index',
            json={"board_game": "Wingspan", "index": 5},
            headers=auth_headers
        )

        assert response.status_code == 500


class TestDetermineBoardGame:
    """Test /determine-board-game endpoint."""

    def test_determine_board_game_success(self, client, app, auth_headers):
        """Test successful board game determination."""
        app.orchestrator.determine_board_game = Mock(return_value="Wingspan")
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=False)

        response = client.post(
            '/determine-board-game',
            json={"question": "How do I play bird cards?"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == "Wingspan"

    def test_determine_board_game_token_limit_exceeded(self, client, app, auth_headers):
        """Test rate limiting when token limit exceeded."""
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=True)

        response = client.post(
            '/determine-board-game',
            json={"question": "How do I play?"},
            headers=auth_headers
        )

        assert response.status_code == 403

    def test_determine_board_game_token_limit_bypass_user(self, client, app, auth_headers):
        """Bypass list skips daily limit check for matching Auth0 sub."""
        app.config['TOKEN_LIMIT_BYPASS_USER_IDS'] = frozenset(['test-user-123'])
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=True)
        app.orchestrator.determine_board_game = Mock(return_value="Wingspan")

        response = client.post(
            '/determine-board-game',
            json={"question": "How do I play?"},
            headers=auth_headers
        )

        assert response.status_code == 200
        app.orchestrator.user_has_exceeded_daily_token_limit.assert_not_called()

    def test_determine_board_game_missing_field(self, client, auth_headers):
        """Test error for missing question field."""
        response = client.post(
            '/determine-board-game',
            json={},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_determine_board_game_unauthenticated(self, client):
        """Test unauthenticated access to determine board game."""
        response = client.post(
            '/determine-board-game',
            json={"question": "How do I play?"}
        )
        assert response.status_code == 401

    def test_determine_board_game_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=False)
        app.orchestrator.determine_board_game = Mock(side_effect=Exception("AI service error"))

        response = client.post(
            '/determine-board-game',
            json={"question": "How do I play?"},
            headers=auth_headers
        )

        assert response.status_code == 500


class TestAskQuestion:
    """Test /ask-question endpoint."""

    def test_ask_question_streaming_response(self, client, app, auth_headers):
        """Test streaming response for ask question."""
        def mock_stream():
            yield "This is "
            yield "a test "
            yield "response."

        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.ask_question = Mock(return_value=mock_stream())
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=False)

        response = client.post(
            '/ask-question',
            json={
                "question": "How do I play bird cards?",
                "board_game": "Wingspan"
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.mimetype == "text/event-stream"
        assert b"data:" in response.data

    def test_ask_question_invalid_game(self, client, app, auth_headers):
        """Test error for unrecognised board game."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=False)

        response = client.post(
            '/ask-question',
            json={
                "question": "How do I play?",
                "board_game": "Not Wingspan"
            },
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_ask_question_missing_fields(self, client, auth_headers):
        """Test error for missing required fields."""
        response = client.post(
            '/ask-question',
            json={"question": "How do I play?"},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_ask_question_unauthenticated(self, client):
        """Test unauthenticated access to ask question."""
        response = client.post(
            '/ask-question',
            json={"question": "How do I play?", "board_game": "Wingspan"}
        )
        assert response.status_code == 401

    def test_ask_question_token_limit_exceeded(self, client, app, auth_headers):
        """Test rate limiting when token limit exceeded."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=True)

        response = client.post(
            '/ask-question',
            json={
                "question": "How do I play?",
                "board_game": "Wingspan"
            },
            headers=auth_headers
        )

        assert response.status_code == 403

    def test_ask_question_token_limit_bypass_user(self, client, app, auth_headers):
        """Bypass list skips daily limit check for matching Auth0 sub."""
        def mock_stream():
            yield "ok"

        app.config['TOKEN_LIMIT_BYPASS_USER_IDS'] = frozenset(['test-user-123'])
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=True)
        app.orchestrator.ask_question = Mock(return_value=mock_stream())

        response = client.post(
            '/ask-question',
            json={
                "question": "How do I play?",
                "board_game": "Wingspan"
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        app.orchestrator.user_has_exceeded_daily_token_limit.assert_not_called()

    def test_ask_question_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.get_known_board_games = Mock(return_value=["Wingspan"])
        app.orchestrator.user_has_exceeded_daily_token_limit = Mock(return_value=False)
        app.orchestrator.ask_question = Mock(side_effect=Exception("AI service error"))

        response = client.post(
            '/ask-question',
            json={
                "question": "How do I play?",
                "board_game": "Wingspan"
            },
            headers=auth_headers
        )

        assert response.status_code == 500


class TestPDFServing:
    """Test PDF serving endpoint."""

    @patch('app.routes.orchestrator.RULEBOOKS_PATH', '/rulebooks')
    @patch('app.routes.orchestrator.send_from_directory')
    @patch('os.path.realpath')
    @patch('os.path.exists')
    def test_serve_pdf_success(self, mock_exists, mock_realpath, mock_send, client, app, auth_headers):
        """Test successful PDF serving."""
        import os
        rulebooks_path = '/rulebooks'
        file_path = os.path.join(rulebooks_path, 'wingspan', 'rules.pdf')

        # Mock path resolution - both calls to realpath must return paths starting with rulebooks_path
        def mock_realpath_side_effect(path):
            if path == rulebooks_path:
                return rulebooks_path
            return file_path

        mock_realpath.side_effect = mock_realpath_side_effect
        mock_exists.return_value = True

        mock_response = Response('PDF content', mimetype='application/pdf', status=200)
        mock_send.return_value = mock_response

        response = client.get(
            '/pdfs/wingspan/rules.pdf',
            headers=auth_headers
        )

        assert response.status_code == 200
        mock_send.assert_called_once()

    def test_serve_pdf_path_traversal_attempt(self, client, app, auth_headers):
        """Test path traversal protection."""
        response = client.get(
            '/pdfs/../../../etc/passwd',
            headers=auth_headers
        )

        assert response.status_code == 400

    @patch('os.path.exists')
    @patch('os.path.realpath')
    def test_serve_pdf_not_found(self, mock_realpath, mock_exists, client, app, auth_headers):
        """Test error when PDF doesn't exist."""
        mock_realpath.side_effect = lambda x: x
        mock_exists.return_value = False

        response = client.get(
            '/pdfs/nonexistent.pdf',
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_serve_pdf_invalid_file_type(self, client, app, auth_headers):
        """Test error for non-PDF files."""
        with patch('os.path.exists') as mock_exists:
            with patch('os.path.realpath') as mock_realpath:
                mock_realpath.side_effect = lambda x: x
                mock_exists.return_value = True

                response = client.get(
                    '/pdfs/malicious.exe',
                    headers=auth_headers
                )

                assert response.status_code == 400

    def test_serve_pdf_unauthenticated(self, client):
        """Test unauthenticated access to serve PDF."""
        response = client.get('/pdfs/wingspan/rules.pdf')
        assert response.status_code == 401

    def test_serve_pdf_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        with patch('os.path.exists') as mock_exists:
            with patch('os.path.realpath') as mock_realpath:
                with patch('app.routes.orchestrator.send_from_directory') as mock_send:
                    mock_realpath.side_effect = lambda x: x
                    mock_exists.return_value = True
                    mock_send.side_effect = Exception("File system error")

                    response = client.get(
                        '/pdfs/wingspan/rules.pdf',
                        headers=auth_headers
                    )

                    assert response.status_code == 500


class TestUserTheme:
    """Test user theme endpoints."""

    def test_get_user_theme_success(self, client, app, auth_headers):
        """Test successful retrieval of user theme."""
        app.orchestrator.get_user_theme = Mock(return_value=1)

        response = client.get('/user-theme', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == 1

    def test_set_user_theme_success(self, client, app, auth_headers):
        """Test successful setting of user theme."""
        app.orchestrator.set_user_theme = Mock()

        response = client.post(
            '/user-theme',
            json={"theme": 1},
            headers=auth_headers
        )

        assert response.status_code == 200
        app.orchestrator.set_user_theme.assert_called_once()

    def test_set_user_theme_missing_field(self, client, auth_headers):
        """Test error for missing theme field."""
        response = client.post(
            '/user-theme',
            json={},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_get_user_theme_unauthenticated(self, client):
        """Test unauthenticated access to get user theme."""
        response = client.get('/user-theme')
        assert response.status_code == 401

    def test_set_user_theme_unauthenticated(self, client):
        """Test unauthenticated access to set user theme."""
        response = client.post(
            '/user-theme',
            json={"theme": 1}
        )
        assert response.status_code == 401

    def test_get_user_theme_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.get_user_theme = Mock(side_effect=Exception("Database error"))

        response = client.get('/user-theme', headers=auth_headers)

        assert response.status_code == 500

    def test_set_user_theme_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.set_user_theme = Mock(side_effect=Exception("Database error"))

        response = client.post(
            '/user-theme',
            json={"theme": 1},
            headers=auth_headers
        )

        assert response.status_code == 500


class TestFeedback:
    """Test feedback submission endpoint."""

    def test_submit_feedback_with_email(self, client, app, auth_headers):
        """Test successful feedback submission with email."""
        app.orchestrator.submit_feedback = Mock()

        response = client.post(
            '/submit-feedback',
            json={
                "content": "Great app!",
                "email": "test@example.com"
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        app.orchestrator.submit_feedback.assert_called_once_with(
            'test-user-123',
            'Great app!',
            'test@example.com'
        )

    def test_submit_feedback_without_email(self, client, app, auth_headers):
        """Test feedback submission without email."""
        app.orchestrator.submit_feedback = Mock()

        response = client.post(
            '/submit-feedback',
            json={
                "content": "Nice work!",
                "email": None
            },
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_submit_feedback_invalid_content(self, client, app, auth_headers):
        """Test error for invalid content."""
        response = client.post(
            '/submit-feedback',
            json={
                "content": "",
                "email": None
            },
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_submit_feedback_missing_content(self, client, auth_headers):
        """Test error for missing content field."""
        response = client.post(
            '/submit-feedback',
            json={"email": None},
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_submit_feedback_unauthenticated(self, client):
        """Test unauthenticated access to submit feedback."""
        response = client.post(
            '/submit-feedback',
            json={"content": "Great app!", "email": None}
        )
        assert response.status_code == 401

    def test_submit_feedback_internal_error(self, client, app, auth_headers):
        """Test internal error handling."""
        app.orchestrator.submit_feedback = Mock(side_effect=Exception("Database error"))

        response = client.post(
            '/submit-feedback',
            json={
                "content": "Great app!",
                "email": "test@example.com"
            },
            headers=auth_headers
        )

        assert response.status_code == 500


class TestErrorHandlers:
    """Test global error handlers."""

    def test_404_error_handler(self, client):
        """Test 404 error handler."""
        response = client.get('/nonexistent-endpoint')
        assert response.status_code == 404

    def test_405_method_not_allowed(self, client, app, auth_headers):
        """Test 405 error for wrong HTTP method."""
        response = client.put('/known-board-games', headers=auth_headers)
        assert response.status_code == 405

    def test_500_internal_server_error(self, client, app, auth_headers):
        """Test 500 error handler."""
        app.orchestrator.get_known_board_games = Mock(side_effect=Exception("Internal error"))

        response = client.get('/known-board-games', headers=auth_headers)
        assert response.status_code == 500

    def test_unexpected_error_handler(self, client, app, auth_headers):
        """Test unexpected error handler."""
        app.orchestrator.get_user_theme = Mock(side_effect=ValueError("Unexpected error"))

        response = client.get('/user-theme', headers=auth_headers)
        assert response.status_code == 500
