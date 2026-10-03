import os
import requests
import logging

from tqdm import tqdm
from pypdf import PdfReader

from app.config.paths import RULEBOOKS_PATH
from app.config.board_games import BOARD_GAMES
from app.config.constants import DEFAULT_TIMEOUT_SECONDS
from app.llm import create_embedding_client
from app.llm.embedding_types import EmbeddingClient
from app.mongodb_client import MongoDBClient
from config import config

logging.getLogger('httpx').setLevel(logging.WARNING)

DOWNLOAD_BLOCK_SIZE = 1024

def print_bold(text):
    print(f"\033[1m{text}\033[0m")


def get_environment_config():
    """Get the appropriate configuration based on FLASK_ENV."""
    flask_env = os.environ.get('FLASK_ENV')

    if flask_env is None:
        raise ValueError("FLASK_ENV environment variable is not set")

    print_bold(f"Using {flask_env} environment configuration\n")

    return config[flask_env]()


def download_rulebooks():
    os.makedirs(RULEBOOKS_PATH, exist_ok=True)

    print_bold("Downloading rulebooks for board games...")
    for board_game in BOARD_GAMES:
        print_bold(f'\n{board_game["name"]}')
        board_game_rulebooks_path = f'{RULEBOOKS_PATH}/{board_game["name"]}'
        os.makedirs(board_game_rulebooks_path, exist_ok=True)

        for rulebook in board_game["rulebooks"]:
            rulebook_path = f'{board_game_rulebooks_path}/{rulebook["name"]}.pdf'

            if not os.path.exists(rulebook_path):
                try:
                    response = requests.get(
                        rulebook["download_url"],
                        stream=True,
                        timeout=DEFAULT_TIMEOUT_SECONDS
                    )
                    response.raise_for_status()
                    response_size = int(response.headers.get("content-length", 0))

                    with tqdm(
                        total=response_size,
                        unit="B",
                        unit_scale=True,
                        desc=rulebook["name"],
                    ) as progress_bar:
                        with open(rulebook_path, "wb") as file:
                            for chunk in response.iter_content(DOWNLOAD_BLOCK_SIZE):
                                file.write(chunk)
                                progress_bar.update(len(chunk))
                except requests.exceptions.HTTPError as error:
                    print(
                        f'Failed to download "{rulebook["name"]}" for "{board_game["name"]}": {error}'
                    )
            else:
                print(f'"{rulebook_path}" already exists')
    print()


def initialise_mongodb_client(env_config):
    print_bold("Initialising MongoDB client...")
    mongodb_client = MongoDBClient(config=env_config)
    print("Done\n")

    return mongodb_client


def initialise_embedding_client(env_config):
    print_bold(f"Initializing embedding client ({env_config.EMBEDDING_MODEL})...")
    embedding_client = create_embedding_client(env_config)
    print("Done\n")

    return embedding_client


def process_and_store_rulebook_text(
    mongodb_client: MongoDBClient,
    embedding_client: EmbeddingClient,
):
    print_bold("Processing and storing text from rulebooks...")
    for board_game in BOARD_GAMES:
        for rulebook in board_game["rulebooks"]:
            print_bold(f'\n{board_game["name"]} - {rulebook["name"]}')

            reader = PdfReader(f'{RULEBOOKS_PATH}/{board_game["name"]}/{rulebook["name"]}.pdf')
            page_count = len(reader.pages)

            existing_rulebook_pages = mongodb_client.get_rulebook_pages(
                board_game["name"],
                rulebook["name"]
            )

            if len(existing_rulebook_pages) != page_count:
                # Remove existing entries if they don't match the number of pages in the PDF
                # (i.e. they've been parsed incorrectly or come from an old rulebook)
                if len(existing_rulebook_pages) > 0:
                    mongodb_client.delete_rulebook_pages(board_game["name"], rulebook["name"])

                with tqdm(
                    total=page_count,
                    desc="Extracting and embedding pages",
                    unit="page"
                ) as progress_bar:
                    pages_to_store = []
                    for page_num, page in enumerate(reader.pages, start=1):
                        text = page.extract_text()

                        try:
                            embedding, _token_count = embedding_client.embed(
                                text,
                                task_type="RETRIEVAL_DOCUMENT",
                            )

                            pages_to_store.append({
                                "board_game": board_game["name"],
                                "rulebook_name": rulebook["name"],
                                "page_num": page_num,
                                "text": text,
                                "embedding": embedding
                            })

                            progress_bar.update(1)
                        except Exception as e:
                            print(f"Error creating embedding for page {page_num}: {e}")
                            continue

                mongodb_client.store_rulebook_pages(pages_to_store)

            else:
                print("This rulebook already exists in the database")
    print()


if __name__ == "__main__":
    download_rulebooks()

    env_config = get_environment_config()
    mongodb_client = initialise_mongodb_client(env_config)
    embedding_client = initialise_embedding_client(env_config)

    process_and_store_rulebook_text(mongodb_client, embedding_client)
