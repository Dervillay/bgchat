# Board game definitions and related utilities
BOARD_GAMES = [
    {
        "name": "Gloomhaven: Jaws of the Lion",
        "rulebooks": [
            {
                "name": "Glossary",
                "download_url": "https://comparajogos-forum.s3.dualstack.sa-east-1.amazonaws.com/uploads/original/2X/e/e6fb769d1c8b7730e40cbe95d93c641ed83638c0.pdf",
            },
            {
                "name": "Learn to Play Guide",
                "download_url": "https://cdn.1j1ju.com/medias/c1/6f/d7-gloomhaven-jaws-of-the-lion-rulebook.pdf",
            },
        ]
    },
    {
        "name": "Root",
        "rulebooks": [
            {
                "name": "Law of Root",
                "download_url": "https://cdn.shopify.com/s/files/1/0106/0162/7706/files/Root_Base_Law_of_Root_Sep_5_2024.pdf?v=1729175648",
            },
            {
                "name": "Learning to Play",
                "download_url": "https://cdn.shopify.com/s/files/1/0106/0162/7706/files/Root_Base_Learn_to_Play_web_Oct_15_2020.pdf?v=1603389572",
            }
        ]
    },
    {
        "name": "Dominion",
        "rulebooks": [
            {
                "name": "Dominion Rulebook",
                "download_url": "https://cdn.1j1ju.com/medias/59/e6/c2-dominion-rulebook.pdf",
            }
        ]
    },
    {
        "name": "Dune: Imperium",
        "rulebooks": [
            {
                "name": "Rules",
                "download_url": "https://d19y2ttatozxjp.cloudfront.net/pdfs/DUNE_IMPERIUM_Rules_2020_10_26.pdf",
            },
            {
                "name": "Dune Imperium - Rise of Ix",
                "download_url": "https://cdn.1j1ju.com/medias/f1/d5/28-dune-imperium-rise-of-ix-rulebook.pdf",
            },
            {
                "name": "Dune Imperium - Immortality",
                "download_url": "https://cdn.1j1ju.com/medias/aa/6e/73-dune-imperium-immortality-rulebook.pdf",
            },
        ]
    },
    {
        "name": "Diplomacy",
        "rulebooks": [
            {
                "name": "The Rules of Diplomacy",
                "download_url": "https://media.wizards.com/2015/downloads/ah/diplomacy_rules.pdf",
            }
        ]
    },
    {
        "name": "The Lord of the Rings: Duel for Middle-earth",
        "rulebooks": [
            {
                "name": "Rules",
                "download_url": "https://cdn.svc.asmodee.net/production-rprod/storage/games/7-wonders-LOTR/rules/7dume-en01-rules-1725540544zdnes.pdf",
            }
        ]
    },
    {
        "name": "Sky Team",
        "rulebooks": [
            {
                "name": "Landing Procedure",
                "download_url": "https://www.scorpionmasque.com/sites/scorpionmasque.com/files/st_rules01_en_06jun2023.pdf",
            },
            {
                "name": "Flight Log",
                "download_url": "https://www.scorpionmasque.com/sites/scorpionmasque.com/files/st_rules02_en_06jun2023.pdf",
            },
        ]
    },
    {
        "name": "Spirit Island",
        "rulebooks": [
            {
                "name": "Spirit Island Rulebook",
                "download_url": "https://cdn.1j1ju.com/medias/87/39/54-spirit-island-rulebook.pdf",
            }
        ]
    },
    {
        "name": "Race for the Galaxy",
        "rulebooks": [
            {
                "name": "Race for the Galaxy Rulebook",
                "download_url": "https://cdn.1j1ju.com/medias/6a/44/a4-race-for-the-galaxy-rulebook.pdf",
            }
        ]
    },
    {
        "name": "Twilight Imperium (4th Edition)",
        "rulebooks": [
            {
                "name": "Rules Reference",
                "download_url": "https://images-cdn.fantasyflightgames.com/filer_public/c2/69/c269b9e2-8d9a-420b-a807-2b164dd54977/ti-k0289_rules_referencecompressed.pdf",
            },
            {
                "name": "Learn to Play",
                "download_url": "https://images-cdn.fantasyflightgames.com/filer_public/f3/c6/f3c66512-8e19-4f30-a0d4-d7d75701fd37/ti-k0289_learn_to_playcompressed.pdf",
            },
            {
                "name": "Prophecy of Kings Expansion Rules",
                "download_url": "https://images-cdn.fantasyflightgames.com/filer_public/bd/a2/bda2d75d-0481-4563-a443-d45e4dea46f8/ti10_rulebook_web-good.pdf",
            },
        ]
    },
    {
        "name": "Arcs",
        "rulebooks": [
            {
                "name": "Arcs Base Rulebook",
                "download_url": "https://cdn.shopify.com/s/files/1/0106/0162/7706/files/Arcs_Base_Rulebook.pdf",
            }
        ]
    },
    {
        "name": "Wingspan",
        "rulebooks": [
            {
                "name": "Wingspan",
                "download_url": "https://www.szellemlovas.hu/szabalyok/fesztavEN.pdf",
            },
            {
                "name": "Wingspan Appendix",
                "download_url": "https://cdn.1j1ju.com/medias/c3/2d/f0-wingspan-appendix-rulebook.pdf",
            }
        ]
    },
    {
        "name": "The Quacks of Quedlinburg",
        "rulebooks": [
            {
                "name": "The Quacks of Quedlinburg",
                "download_url": "https://cdn.1j1ju.com/medias/ba/73/db-the-quacks-of-quedlinburg-rulebook.pdf",
            }
        ]
    },
]

BOARD_GAMES_STRING_LIST = "\n".join([f"- {board_game['name']}" for board_game in BOARD_GAMES])
