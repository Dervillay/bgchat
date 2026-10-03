import logging
import time
from datetime import datetime, timezone

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from pymongo.results import UpdateResult
from urllib.parse import quote_plus

from app.types import Message, RulebookPage, TokenUsage
from config import Config

logger = logging.getLogger(__name__)

class MongoDBClient:
    """
    Singleton client for MongoDB database operations.
    Handles connection management and data persistence.
    """
    _instance = None
    _initialized = False

    def __new__(cls, config: Config):
        if cls._instance is None:
            cls._instance = super(MongoDBClient, cls).__new__(cls)
        return cls._instance

    def __init__(self, config: Config):
        if not self._initialized:
            self.config = config
            self.client = None
            self.db = None
            self._connect()
            self._initialized = True

    def _get_mongodb_uri(self) -> str:
        """Get the MongoDB connection URI with proper encoding."""
        username = quote_plus(self.config.MONGODB_USERNAME)
        password = quote_plus(self.config.MONGODB_PASSWORD)
        host = self.config.MONGODB_HOST

        return f"mongodb+srv://{username}:{password}@{host}/?retryWrites=true&w=majority"

    def _connect(self) -> None:
        """Establish connection to MongoDB with retry logic."""
        max_retries = 3
        retry_count = 0
        while retry_count < max_retries:
            try:
                self.client = MongoClient(self._get_mongodb_uri())
                self.client.admin.command("ping")
                logger.info("Successfully connected to MongoDB server")

                self.db = self.client[self.config.MONGODB_DB_NAME]
                logger.info("Successfully loaded database '%s'", self.config.MONGODB_DB_NAME)

                return

            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                retry_count += 1
                if retry_count == max_retries:
                    logger.error(
                        "Failed to connect to MongoDB after %d attempts: %s", max_retries, str(e)
                    )
                    raise

                logger.warning(
                    "Failed to connect to MongoDB, attempt %d/%d", retry_count, max_retries
                )

                time.sleep(2 ** retry_count)

    def _ensure_connection(self) -> None:
        """Ensure MongoDB connection is active, reconnect if necessary."""
        try:
            self.client.admin.command("ping")

        except (ConnectionFailure, ServerSelectionTimeoutError):
            logger.warning("MongoDB connection lost, attempting to reconnect...")
            self._connect()

    def _get_current_datetime_utc(self) -> datetime:
        """Get the current UTC time."""
        return datetime.now(timezone.utc)

    def _raise_on_no_user_id_match(self, result: UpdateResult, user_id: str | None = None) -> None:
        """Raise an error if an update did not find any documents for the given user_id."""
        if result.matched_count == 0:
            error_message = (
                f"No document found for user_id: {user_id}"
                if user_id is not None
                else "No document found for user_id"
            )
            logger.error(error_message)
            raise ValueError(error_message)

    def append_messages(
        self,
        user_id: str,
        board_game: str,
        messages: list[Message],
    ) -> None:
        """
        Append messages to the message history for a given user and board game.

        If the user does not exist, creates and populates a new document for them.
        If the user exists, updates the last_active field.
        """
        self._ensure_connection()
        try:
            request_datetime_utc = self._get_current_datetime_utc()
            self.db.user_data.update_one(
                {"user_id": user_id},
                {
                    "$setOnInsert": {
                        "user_id": user_id,
                        "created_at": request_datetime_utc,
                    },
                    "$set": {
                        "last_active": request_datetime_utc
                    },
                    "$push": {
                        f"messages.{board_game}": {
                            "$each": messages
                        }
                    }
                },
                upsert=True
            )

        except Exception as e:
            logger.error("Error storing messages: %s", str(e))
            raise

    def get_message_history(
            self,
            user_id: str,
            board_game: str
    ) -> list[Message]:
        """Get message history for a given user and board game."""
        self._ensure_connection()
        try:
            result = self.db.user_data.find_one(
                {"user_id": user_id},
                {f"messages.{board_game}": 1, "_id": 0}
            )

            if result is None:
                return []

            return result.get("messages", {}).get(board_game, [])

        except Exception as e:
            logger.error("Error retrieving message history: %s", str(e))
            raise

    def clear_message_history(
            self,
            user_id: str,
            board_game: str
    ) -> None:
        """Clear the message history for a given user and board game."""
        self._ensure_connection()
        try:
            # Idempotent: if the user doc is missing, there is nothing to clear.
            self.db.user_data.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        f"messages.{board_game}": [],
                        "last_active": self._get_current_datetime_utc()
                    }
                }
            )
        except Exception as e:
            logger.error("Error clearing message history: %s", str(e))
            raise

    def delete_messages_from_index(
            self,
            user_id: str,
            board_game: str,
            index: int
    ) -> None:
        """
        Delete all messages with index greater than or equal to the specified index (0-based)
        for a given user and board game.
        """
        self._ensure_connection()
        try:
            result = self.db.user_data.update_one(
                {"user_id": user_id},
                {
                    "$push": {
                        f"messages.{board_game}": {
                            "$each": [],
                            "$slice": index
                        },
                    },
                    "$set": {
                        "last_active": self._get_current_datetime_utc()
                    }
                }
            )
            self._raise_on_no_user_id_match(result, user_id=user_id)

        except Exception as e:
            logger.error("Error deleting messages: %s", str(e))
            raise

    def store_rulebook_pages(self, pages: list[RulebookPage]
    ) -> None:
        """
        Store rulebook pages for a given board game and rulebook.
        Each page is stored as a separate document in the rulebook_pages collection.
        """
        self._ensure_connection()
        try:
            self.db.rulebook_pages.insert_many(pages)

        except Exception as e:
            logger.error("Error storing rulebook pages: %s", str(e))
            raise

    def delete_rulebook_pages(
        self,
        board_game: str,
        rulebook: str
    ) -> None:
        """Delete all pages for a given board game and rulebook."""
        self._ensure_connection()
        try:
            result = self.db.rulebook_pages.delete_many({
                "board_game": board_game,
                "rulebook_name": rulebook
            })
            logger.info("Deleted %d pages for rulebook '%s' in '%s'",
                       result.deleted_count, rulebook, board_game)
        except Exception as e:
            logger.error("Error deleting rulebook pages for '%s' in '%s': %s",
                        rulebook, board_game, str(e))
            raise

    def get_rulebook_pages(
        self,
        board_game: str,
        rulebook: str
    ) -> list[RulebookPage]:
        """
        Get all pages for a given board game and rulebook.
        """
        self._ensure_connection()
        try:
            results = self.db.rulebook_pages.find(
                {"board_game": board_game, "rulebook_name": rulebook},
                {"_id": 0, "embedding": 0}
            )

            return list(results)

        except Exception as e:
            logger.error("Error retrieving rulebook pages for '%s': %s", board_game, str(e))
            raise

    def get_similar_rulebook_pages(
        self,
        board_game: str,
        query_embedding: list[float],
        limit: int
    ) -> list[RulebookPage]:
        """
        Find rulebook pages for a given board game with similar embeddings to the query embedding.
        """
        self._ensure_connection()
        try:
            results = self.db.rulebook_pages.aggregate([
                {
                    "$vectorSearch": {
                        "index": "embedding_index",
                        "path": "embedding",
                        "filter": {
                            "board_game": {
                                "$eq": board_game
                            }
                        },
                        "queryVector": query_embedding,
                        "numCandidates": 100,
                        "limit": limit,
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "embedding": 0,
                    }
                }
            ])

            return list(results)

        except Exception as e:
            logger.error("Error performing vector search: %s", str(e))
            raise

    def increment_todays_token_usage(
        self,
        user_id: str,
        model_name: str,
        input_tokens: int,
        output_tokens: int = 0,
        web_searches: int = 0,
    ) -> None:
        """
        Increment today's token usage for a given user.

        If the user does not exist, creates and populates a new document for them.
        If the user exists, updates the last_active field and increments the token usage for today.
        """
        self._ensure_connection()
        try:
            request_datetime_utc = self._get_current_datetime_utc()
            todays_date = request_datetime_utc.strftime("%Y-%m-%d")

            fields_to_increment = {
                f"token_usage.{todays_date}.{model_name}.input_tokens": input_tokens,
            }

            if output_tokens > 0:
                fields_to_increment[f"token_usage.{todays_date}.{model_name}.output_tokens"] = output_tokens

            if web_searches > 0:
                fields_to_increment[f"token_usage.{todays_date}.{model_name}.web_searches"] = web_searches

            self.db.user_data.update_one(
                {"user_id": user_id},
                {
                    "$setOnInsert": {
                        "user_id": user_id,
                        "created_at": request_datetime_utc,
                    },
                    "$set": {
                        "last_active": request_datetime_utc,
                    },
                    "$inc": fields_to_increment,
                },
                upsert=True
            )

        except Exception as e:
            logger.error("Error incrementing token usage: %s", str(e))
            raise

    def get_todays_token_usage(self, user_id: str) -> dict[str, TokenUsage]:
        """
        Get today's token usage broken down by model for a given user.

        Returns a dictionary of model names to token usage.
        Returns None if the user doesn't have an entry in the database for today.
        """
        self._ensure_connection()
        try:
            todays_date = self._get_current_datetime_utc().strftime("%Y-%m-%d")
            result = self.db.user_data.find_one(
                {"user_id": user_id},
                {f"token_usage.{todays_date}": 1, "_id": 0}
            )

            if result is None:
                return {}

            return result.get("token_usage", {}).get(todays_date, {})
        except Exception as e:
            logger.error("Error retrieving token usage for user '%s': %s", user_id, str(e))
            raise

    def get_all_board_games(self) -> list[str]:
        """
        Get a list of all unique board games that have rulebook pages stored in the database.
        Returns an empty list if no board games are found.
        """
        self._ensure_connection()
        try:
            board_games = self.db.rulebook_pages.distinct("board_game")
            return sorted(board_games)
        except Exception as e:
            logger.error("Error retrieving board games list: %s", str(e))
            raise

    def get_user_theme(self, user_id: str) -> int | None:
        """
        Get the user's saved theme preference.
        Returns None if no theme is saved.
        """
        self._ensure_connection()
        try:
            result = self.db.user_data.find_one(
                {"user_id": user_id},
                {"theme": 1, "_id": 0}
            )
            
            if result is None:
                return None
            
            return result.get("theme")
        except Exception as e:
            logger.error("Error retrieving theme for user '%s': %s", user_id, str(e))
            raise

    def set_user_theme(self, user_id: str, theme: int) -> None:
        """
        Save the user's selected theme.
        """
        self._ensure_connection()
        try:
            request_datetime_utc = self._get_current_datetime_utc()
            
            self.db.user_data.update_one(
                {"user_id": user_id},
                {
                    "$setOnInsert": {
                        "user_id": user_id,
                        "created_at": request_datetime_utc,
                    },
                    "$set": {
                        "theme": theme,
                        "last_active": request_datetime_utc,
                    }
                },
                upsert=True
            )
            logger.info("Theme '%s' saved for user %s", theme, user_id)
        except Exception as e:
            logger.error("Error saving theme for user '%s': %s", user_id, str(e))
            raise

    def store_feedback(
        self,
        user_id: str,
        content: str,
        email: str | None = None,
    ) -> None:
        """
        Submit user feedback.

        If the user does not exist, creates and populates a new document for them.
        If the user already exists, updates their email (if provided) and appends their feedback.
        """
        self._ensure_connection()
        try:
            request_datetime_utc = self._get_current_datetime_utc()
            request_date = request_datetime_utc.strftime("%Y-%m-%d")
            
            update_query = {
                "$setOnInsert": {
                    "user_id": user_id,
                },
                "$push": {
                    f"feedback.{request_date}": {
                        "$each": [content],
                    }
                }
            }
            
            if email is not None:
                update_query["$set"] = {"email": email}
            
            self.db.feedback.update_one(
                {"user_id": user_id},
                update_query,
                upsert=True
            )
            logger.info("Feedback submitted successfully for user %s", user_id)
            
        except Exception as e:
            logger.error("Error submitting feedback for user '%s': %s", user_id, str(e))
            raise

    def __del__(self):
        """Cleanup MongoDB connection on object deletion."""
        try:
            if self.client:
                self.client.close()
        except ImportError:
            # Python is shutting down, ignore the error
            pass
        except Exception as e:
            logger.error("Error closing MongoDB connection: %s", str(e))
