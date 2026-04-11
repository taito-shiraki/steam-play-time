"""
Steam ジャンル情報取得サービス

Steam Store API からジャンル情報を取得し、ゲームをジャンル別に集計する。
APIキー未設定時はモックデータを返す開発モードで動作する。
"""

import os
import asyncio
import logging
from typing import Optional
from datetime import datetime

import httpx
from cachetools import TTLCache
from cachetools import keys as cachekeys

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# キャッシュ設定
# ---------------------------------------------------------------------------
# ジャンル情報はアプリごとに長めにキャッシュ（1時間）
_GENRE_CACHE_TTL_SECONDS = 3600
_genre_cache: TTLCache = TTLCache(maxsize=5000, ttl=_GENRE_CACHE_TTL_SECONDS)
_genre_cache_timestamps: dict[str, float] = {}

# ジャンル集計結果のキャッシュ（30分）
_SUMMARY_CACHE_TTL_SECONDS = 1800
_summary_cache: TTLCache = TTLCache(maxsize=200, ttl=_SUMMARY_CACHE_TTL_SECONDS)
_summary_cache_timestamps: dict[str, float] = {}

# Steam Store API の同時リクエスト数を制限
_STORE_API_SEMAPHORE_LIMIT = 5


# ---------------------------------------------------------------------------
# モックデータ（APIキー未設定時の開発モード用）
# ---------------------------------------------------------------------------

# appid → ジャンルリストのモックマッピング（モック所持ゲームに対応）
_MOCK_APP_GENRES = {
    730:     ["Action", "Free to Play"],                        # CS2
    570:     ["Action", "Free to Play", "Strategy"],           # Dota 2
    440:     ["Action", "Free to Play"],                        # TF2
    1172470: ["Action", "Free to Play"],                        # Apex Legends
    292030:  ["Action", "RPG"],                                # Witcher 3
    271590:  ["Action"],                                        # GTA V
    1086940: ["RPG"],                                           # BG3
    814380:  ["Action"],                                        # Sekiro
    1091500: ["Action", "RPG"],                                 # Cyberpunk 2077
    578080:  ["Action", "Free to Play"],                        # PUBG
    1245620: ["Action", "RPG"],                                 # ELDEN RING
    413150:  ["Simulation", "RPG"],                            # Stardew Valley
    367520:  ["Action"],                                        # Hollow Knight
    1144200: ["Action"],                                        # Ready or Not
    1332010: ["Strategy", "Simulation"],                       # Backpack Battles
    359550:  ["Action"],                                        # R6 Siege
    236390:  ["Action", "Simulation", "Free to Play"],          # War Thunder
    252950:  ["Action", "Sports", "Free to Play"],              # Rocket League
    4000:    ["Action"],                                        # Garry's Mod
    107410:  ["Action", "Simulation"],                          # Arma 3
    239140:  ["Action", "RPG"],                                 # Dying Light
    381210:  ["Action"],                                        # Dead by Daylight
    105600:  ["Action", "RPG", "Simulation"],                   # Terraria
    632360:  ["Action"],                                        # Risk of Rain 2
    1938090: ["Action"],                                        # CoD MW3
}

# 開発モード用のモックジャンル集計レスポンス
# SPEC.md で指定されたモックデータ値（Action:300h, RPG:200h, Strategy:150h, Simulation:100h, Sports:50h, その他:30h）
_MOCK_GENRE_SUMMARY = {
    "genres": [
        {
            "genre": "Action",
            "total_playtime_minutes": 18000,  # 300h
            "total_playtime_hours": 300.0,
            "game_count": 15,
            "games": [
                {
                    "appid": 730,
                    "name": "Counter-Strike 2",
                    "playtime_forever": 12500,
                    "playtime_hours": 208.3,
                    "img_icon_url": "8dbc71957312bbd3baea65848b545be9eae2a355",
                },
                {
                    "appid": 570,
                    "name": "Dota 2",
                    "playtime_forever": 8900,
                    "playtime_hours": 148.3,
                    "img_icon_url": "0bbb630d63262dd66d2fdd0f7d37e8661a410075",
                },
                {
                    "appid": 440,
                    "name": "Team Fortress 2",
                    "playtime_forever": 6200,
                    "playtime_hours": 103.3,
                    "img_icon_url": "e3f595a92552da3d664ad00277bce77e0807d020",
                },
            ],
        },
        {
            "genre": "RPG",
            "total_playtime_minutes": 12000,  # 200h
            "total_playtime_hours": 200.0,
            "game_count": 5,
            "games": [
                {
                    "appid": 1086940,
                    "name": "Baldur's Gate 3",
                    "playtime_forever": 2900,
                    "playtime_hours": 48.3,
                    "img_icon_url": "2c6f6253a0338da0b8e8e8d5e67bfaa68c6f1a53",
                },
                {
                    "appid": 292030,
                    "name": "The Witcher 3: Wild Hunt",
                    "playtime_forever": 3800,
                    "playtime_hours": 63.3,
                    "img_icon_url": "4be6a5b28b84f4fb48d55a3fd95e3870efc03e5a",
                },
                {
                    "appid": 1245620,
                    "name": "ELDEN RING",
                    "playtime_forever": 1500,
                    "playtime_hours": 25.0,
                    "img_icon_url": "b40b9f6a39bb9b17e2e06b03df0b1f3b08b98f54",
                },
            ],
        },
        {
            "genre": "Strategy",
            "total_playtime_minutes": 9000,  # 150h
            "total_playtime_hours": 150.0,
            "game_count": 2,
            "games": [
                {
                    "appid": 1332010,
                    "name": "Backpack Battles",
                    "playtime_forever": 720,
                    "playtime_hours": 12.0,
                    "img_icon_url": "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
                },
                {
                    "appid": 570,
                    "name": "Dota 2",
                    "playtime_forever": 8900,
                    "playtime_hours": 148.3,
                    "img_icon_url": "0bbb630d63262dd66d2fdd0f7d37e8661a410075",
                },
            ],
        },
        {
            "genre": "Simulation",
            "total_playtime_minutes": 6000,  # 100h
            "total_playtime_hours": 100.0,
            "game_count": 4,
            "games": [
                {
                    "appid": 413150,
                    "name": "Stardew Valley",
                    "playtime_forever": 1200,
                    "playtime_hours": 20.0,
                    "img_icon_url": "b1cbe0b86b5e21e60ef0ecb6e7c5e0a89e9d7f12",
                },
                {
                    "appid": 107410,
                    "name": "Arma 3",
                    "playtime_forever": 490,
                    "playtime_hours": 8.2,
                    "img_icon_url": "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
                },
            ],
        },
        {
            "genre": "Sports",
            "total_playtime_minutes": 3000,  # 50h
            "total_playtime_hours": 50.0,
            "game_count": 1,
            "games": [
                {
                    "appid": 252950,
                    "name": "Rocket League",
                    "playtime_forever": 580,
                    "playtime_hours": 9.7,
                    "img_icon_url": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
                },
            ],
        },
        {
            "genre": "その他",
            "total_playtime_minutes": 1800,  # 30h
            "total_playtime_hours": 30.0,
            "game_count": 3,
            "games": [
                {
                    "appid": 105600,
                    "name": "Terraria",
                    "playtime_forever": 350,
                    "playtime_hours": 5.8,
                    "img_icon_url": "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
                },
            ],
        },
    ],
    "total_games_classified": 25,
    "dev_mode": True,
}


# ---------------------------------------------------------------------------
# キャッシュユーティリティ
# ---------------------------------------------------------------------------

def _cache_key(*args) -> str:
    return str(cachekeys.hashkey(*args))


def _get_genre_from_cache(appid: int) -> Optional[list]:
    key = _cache_key("app_genre", appid)
    return _genre_cache.get(key)


def _set_genre_cache(appid: int, genres: list) -> None:
    key = _cache_key("app_genre", appid)
    _genre_cache[key] = genres
    _genre_cache_timestamps[key] = __import__("time").time()


def _get_summary_from_cache(steam_id: str) -> Optional[tuple[dict, float]]:
    key = _cache_key("genre_summary", steam_id)
    if key in _summary_cache:
        return _summary_cache[key], _summary_cache_timestamps.get(key, __import__("time").time())
    return None


def _set_summary_cache(steam_id: str, data: dict) -> None:
    import time
    key = _cache_key("genre_summary", steam_id)
    _summary_cache[key] = data
    _summary_cache_timestamps[key] = time.time()


def invalidate_genre_cache(steam_id: str) -> None:
    key = _cache_key("genre_summary", steam_id)
    _summary_cache.pop(key, None)
    _summary_cache_timestamps.pop(key, None)
    logger.info("Genre cache invalidated for steam_id=%s", steam_id)


# ---------------------------------------------------------------------------
# Steam Store API からジャンル取得
# ---------------------------------------------------------------------------

async def _fetch_app_genres(client: httpx.AsyncClient, appid: int, semaphore: asyncio.Semaphore) -> list[str]:
    """
    Steam Store API から1つのアプリのジャンル情報を取得する。

    Returns:
        ジャンル名のリスト。取得できない場合は空リスト。
    """
    # キャッシュ確認
    cached = _get_genre_from_cache(appid)
    if cached is not None:
        return cached

    async with semaphore:
        try:
            resp = await client.get(
                "https://store.steampowered.com/api/appdetails",
                params={"appids": appid, "l": "english", "filters": "genres"},
                timeout=10.0,
            )

            if resp.status_code == 429:
                logger.warning("Steam Store API rate limited for appid=%s", appid)
                _set_genre_cache(appid, [])
                return []

            if not resp.is_success:
                logger.warning("Steam Store API error for appid=%s: %s", appid, resp.status_code)
                _set_genre_cache(appid, [])
                return []

            data = resp.json()
            app_data = data.get(str(appid), {})

            if not app_data.get("success", False):
                _set_genre_cache(appid, [])
                return []

            app_info = app_data.get("data", {})
            genres_raw = app_info.get("genres", [])
            genres = [g.get("description", "") for g in genres_raw if g.get("description")]

            _set_genre_cache(appid, genres)
            return genres

        except Exception as e:
            logger.warning("Failed to fetch genres for appid=%s: %s", appid, e)
            _set_genre_cache(appid, [])
            return []


# ---------------------------------------------------------------------------
# ジャンル集計メイン関数
# ---------------------------------------------------------------------------

async def get_genre_summary(steam_id: str, games: list[dict], force_refresh: bool = False) -> dict:
    """
    ゲームリストをジャンル別に集計して返す。

    Args:
        steam_id: Steam ID（キャッシュキーとして使用）
        games: ゲームリスト（各要素は appid, name, playtime_forever, img_icon_url を持つ dict）
        force_refresh: キャッシュを無視して再取得するか

    Returns:
        {
            "genres": [
                {
                    "genre": str,
                    "total_playtime_minutes": int,
                    "total_playtime_hours": float,
                    "game_count": int,
                    "games": [ { appid, name, playtime_forever, playtime_hours, img_icon_url } ]
                }
            ],
            "total_games_classified": int,
            "cached": bool,
            "cached_at": Optional[str],
            "dev_mode": bool
        }
    """
    import time

    # キャッシュ確認
    if not force_refresh:
        cached = _get_summary_from_cache(steam_id)
        if cached:
            data, cached_at = cached
            cached_at_str = datetime.fromtimestamp(cached_at).isoformat()
            return {**data, "cached": True, "cached_at": cached_at_str}

    api_key = os.environ.get("STEAM_API_KEY", "").strip()
    dev_mode = not api_key or api_key == "your_steam_api_key_here"

    if dev_mode:
        logger.info("[DEV MODE] get_genre_summary: steam_id=%s", steam_id)
        result = {**_MOCK_GENRE_SUMMARY, "dev_mode": True}
        _set_summary_cache(steam_id, result)
        return {**result, "cached": False, "cached_at": None}

    # 本番モード: Steam Store API からジャンル取得
    semaphore = asyncio.Semaphore(_STORE_API_SEMAPHORE_LIMIT)

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_app_genres(client, g["appid"], semaphore) for g in games]
        all_genres = await asyncio.gather(*tasks)

    # ジャンル別に集計
    genre_map: dict[str, dict] = {}

    for game, genres in zip(games, all_genres):
        playtime = game.get("playtime_forever", 0)
        if playtime == 0:
            continue  # プレイ時間0のゲームはスキップ

        # ジャンルが取得できない場合は「その他」
        effective_genres = genres if genres else ["その他"]

        # ゲームが複数ジャンルに属する場合、最初のジャンルのみ使用（重複を避けるため）
        primary_genre = effective_genres[0] if effective_genres else "その他"

        game_entry = {
            "appid": game["appid"],
            "name": game.get("name", f"App {game['appid']}"),
            "playtime_forever": playtime,
            "playtime_hours": round(playtime / 60, 1),
            "img_icon_url": game.get("img_icon_url", ""),
        }

        if primary_genre not in genre_map:
            genre_map[primary_genre] = {
                "genre": primary_genre,
                "total_playtime_minutes": 0,
                "game_count": 0,
                "games": [],
            }

        genre_map[primary_genre]["total_playtime_minutes"] += playtime
        genre_map[primary_genre]["game_count"] += 1
        genre_map[primary_genre]["games"].append(game_entry)

    # 「その他」が存在しない場合でも空エントリは不要なのでそのまま

    # ジャンルリストをプレイ時間降順でソート
    sorted_genres = sorted(genre_map.values(), key=lambda g: g["total_playtime_minutes"], reverse=True)

    # 各ジャンル内のゲームもプレイ時間降順でソート
    for genre_data in sorted_genres:
        genre_data["games"].sort(key=lambda g: g["playtime_forever"], reverse=True)
        genre_data["total_playtime_hours"] = round(genre_data["total_playtime_minutes"] / 60, 1)

    total_classified = sum(1 for _, genres in zip(games, all_genres) if games)

    result = {
        "genres": sorted_genres,
        "total_games_classified": len(games),
        "dev_mode": False,
    }

    _set_summary_cache(steam_id, result)
    return {**result, "cached": False, "cached_at": None}
