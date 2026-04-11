"""
Steam Web API クライアントサービス

APIキーが設定されていない場合はモックデータを返す開発モードで動作する。
"""

import os
import time
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
# TTLCache: maxsize=200エントリ, ttl=30分(1800秒)
_CACHE_TTL_SECONDS = 1800  # 30分（仕様: 15分〜1時間）
_cache: TTLCache = TTLCache(maxsize=200, ttl=_CACHE_TTL_SECONDS)

# キャッシュのタイムスタンプを別途保持（「XX分前のデータ」表示用）
_cache_timestamps: dict[str, float] = {}


def _cache_key(*args) -> str:
    """キャッシュキーを生成する"""
    return str(cachekeys.hashkey(*args))


def _get_from_cache(key: str) -> Optional[tuple[dict, float]]:
    """キャッシュからデータを取得する。(data, cached_at) または None を返す"""
    if key in _cache:
        cached_at = _cache_timestamps.get(key, time.time())
        return _cache[key], cached_at
    return None


def _set_cache(key: str, data: dict) -> None:
    """データをキャッシュに保存する"""
    _cache[key] = data
    _cache_timestamps[key] = time.time()


def _invalidate_cache(key: str) -> None:
    """特定キーのキャッシュを削除する"""
    _cache.pop(key, None)
    _cache_timestamps.pop(key, None)


def invalidate_steam_id_cache(steam_id: str) -> None:
    """指定 SteamID に関するすべてのキャッシュを削除する"""
    keys_to_delete = [k for k in list(_cache.keys()) if steam_id in str(k)]
    for k in keys_to_delete:
        _cache.pop(k, None)
        _cache_timestamps.pop(k, None)
    logger.info("Cache invalidated for steam_id=%s (%d entries)", steam_id, len(keys_to_delete))


# ---------------------------------------------------------------------------
# Steam API 定数
# ---------------------------------------------------------------------------
STEAM_API_BASE = "https://api.steampowered.com"

# プロフィール公開状態
COMMUNITY_VISIBILITY_PUBLIC = 3


# ---------------------------------------------------------------------------
# モックデータ（APIキー未設定時の開発モード用）
# ---------------------------------------------------------------------------
_MOCK_PLAYER_SUMMARIES = {
    "76561198000000001": {
        "steamid": "76561198000000001",
        "personaname": "MockPlayer (Dev Mode)",
        "profileurl": "https://steamcommunity.com/id/mockplayer/",
        "avatar": "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
        "avatarmedium": "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg",
        "avatarfull": "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
        "communityvisibilitystate": 3,
        "profilestate": 1,
        "lastlogoff": 1700000000,
        "personastate": 0,
    }
}

_MOCK_OWNED_GAMES = [
    {"appid": 730, "name": "Counter-Strike 2", "playtime_forever": 12500, "playtime_2weeks": 180,
     "img_icon_url": "8dbc71957312bbd3baea65848b545be9eae2a355"},
    {"appid": 570, "name": "Dota 2", "playtime_forever": 8900, "playtime_2weeks": 0,
     "img_icon_url": "0bbb630d63262dd66d2fdd0f7d37e8661a410075"},
    {"appid": 440, "name": "Team Fortress 2", "playtime_forever": 6200, "playtime_2weeks": 120,
     "img_icon_url": "e3f595a92552da3d664ad00277bce77e0807d020"},
    {"appid": 1172470, "name": "Apex Legends", "playtime_forever": 4500, "playtime_2weeks": 300,
     "img_icon_url": "6b5f4a6e2c2cf4bcbe8e42a4a937c78e3c42c48d"},
    {"appid": 292030, "name": "The Witcher 3: Wild Hunt", "playtime_forever": 3800, "playtime_2weeks": 0,
     "img_icon_url": "4be6a5b28b84f4fb48d55a3fd95e3870efc03e5a"},
    {"appid": 271590, "name": "Grand Theft Auto V", "playtime_forever": 3200, "playtime_2weeks": 60,
     "img_icon_url": "1e72f87eb927fa1485e68aefb9f5a7d2d907e6a9"},
    {"appid": 1086940, "name": "Baldur's Gate 3", "playtime_forever": 2900, "playtime_2weeks": 450,
     "img_icon_url": "2c6f6253a0338da0b8e8e8d5e67bfaa68c6f1a53"},
    {"appid": 814380, "name": "Sekiro: Shadows Die Twice", "playtime_forever": 2100, "playtime_2weeks": 0,
     "img_icon_url": "f1be23cb3f2dcff61be6e20ad7898d4d53c11d61"},
    {"appid": 1091500, "name": "Cyberpunk 2077", "playtime_forever": 1800, "playtime_2weeks": 0,
     "img_icon_url": "d68e83cbbbccddb5e25dd70e80d7e6f33c1d2f23"},
    {"appid": 578080, "name": "PUBG: BATTLEGROUNDS", "playtime_forever": 1600, "playtime_2weeks": 0,
     "img_icon_url": "27388e9ad35cc8bb02aa4a2a63b94e87e9a43f53"},
    {"appid": 1245620, "name": "ELDEN RING", "playtime_forever": 1500, "playtime_2weeks": 240,
     "img_icon_url": "b40b9f6a39bb9b17e2e06b03df0b1f3b08b98f54"},
    {"appid": 413150, "name": "Stardew Valley", "playtime_forever": 1200, "playtime_2weeks": 90,
     "img_icon_url": "b1cbe0b86b5e21e60ef0ecb6e7c5e0a89e9d7f12"},
    {"appid": 367520, "name": "Hollow Knight", "playtime_forever": 980, "playtime_2weeks": 0,
     "img_icon_url": "a44f87d6f9d3c67cb7dfc8e8af6fc1b4e7c5f9a3"},
    {"appid": 1144200, "name": "Ready or Not", "playtime_forever": 850, "playtime_2weeks": 0,
     "img_icon_url": "c3a5a7b2d0e1f6c8a9b3d4e5f6a7b8c9d0e1f2a3"},
    {"appid": 1332010, "name": "Backpack Battles", "playtime_forever": 720, "playtime_2weeks": 180,
     "img_icon_url": "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4"},
    {"appid": 359550, "name": "Tom Clancy's Rainbow Six Siege", "playtime_forever": 680, "playtime_2weeks": 0,
     "img_icon_url": "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"},
    {"appid": 236390, "name": "War Thunder", "playtime_forever": 620, "playtime_2weeks": 0,
     "img_icon_url": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"},
    {"appid": 252950, "name": "Rocket League", "playtime_forever": 580, "playtime_2weeks": 0,
     "img_icon_url": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1"},
    {"appid": 4000, "name": "Garry's Mod", "playtime_forever": 520, "playtime_2weeks": 0,
     "img_icon_url": "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2"},
    {"appid": 107410, "name": "Arma 3", "playtime_forever": 490, "playtime_2weeks": 0,
     "img_icon_url": "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"},
    {"appid": 239140, "name": "Dying Light", "playtime_forever": 420, "playtime_2weeks": 0,
     "img_icon_url": "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4"},
    {"appid": 381210, "name": "Dead by Daylight", "playtime_forever": 380, "playtime_2weeks": 60,
     "img_icon_url": "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"},
    {"appid": 105600, "name": "Terraria", "playtime_forever": 350, "playtime_2weeks": 0,
     "img_icon_url": "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6"},
    {"appid": 632360, "name": "Risk of Rain 2", "playtime_forever": 310, "playtime_2weeks": 0,
     "img_icon_url": "b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"},
    {"appid": 1938090, "name": "Call of Duty: Modern Warfare III", "playtime_forever": 280, "playtime_2weeks": 0,
     "img_icon_url": "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8"},
]


# ---------------------------------------------------------------------------
# Steam ID バリデーション
# ---------------------------------------------------------------------------
def is_steam_id64(value: str) -> bool:
    """SteamID64（17桁の数値）かどうかを判定する"""
    return value.isdigit() and len(value) == 17


def extract_vanity_url(url_or_id: str) -> Optional[str]:
    """
    Steam プロフィール URL からカスタム URL 部分を抽出する。
    https://steamcommunity.com/id/USERNAME/ → USERNAME
    """
    url_or_id = url_or_id.strip().rstrip("/")
    prefixes = [
        "https://steamcommunity.com/id/",
        "http://steamcommunity.com/id/",
        "steamcommunity.com/id/",
    ]
    for prefix in prefixes:
        if url_or_id.startswith(prefix):
            remainder = url_or_id[len(prefix):]
            # /overview などの追加パスを除去して先頭部分のみ取得
            vanity = remainder.split("/")[0]
            return vanity if vanity else None
    # /id/ を含む URL パターン
    if "/id/" in url_or_id:
        parts = url_or_id.split("/id/")
        if len(parts) == 2 and parts[1]:
            vanity = parts[1].split("/")[0]
            return vanity if vanity else None
    return None


# ---------------------------------------------------------------------------
# Steam API 呼び出し関数
# ---------------------------------------------------------------------------

async def resolve_vanity_url(vanity_url: str, force_refresh: bool = False) -> dict:
    """
    カスタム URL（vanity URL）を SteamID64 に解決する。

    Returns:
        {
            "steamid": str,
            "cached": bool,
            "cached_at": Optional[str],  # ISO 8601
            "dev_mode": bool
        }
    """
    cache_key = _cache_key("resolve_vanity", vanity_url)

    if not force_refresh:
        cached = _get_from_cache(cache_key)
        if cached:
            data, cached_at = cached
            return {**data, "cached": True, "cached_at": _format_cached_at(cached_at)}

    api_key = os.environ.get("STEAM_API_KEY", "").strip()
    dev_mode = not api_key or api_key == "your_steam_api_key_here"

    if dev_mode:
        # 開発モード: 固定のモック SteamID を返す
        logger.info("[DEV MODE] resolve_vanity_url: %s → mock steamid", vanity_url)
        result = {"steamid": "76561198000000001", "dev_mode": True}
        _set_cache(cache_key, result)
        return {**result, "cached": False, "cached_at": None}

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v0001/",
            params={"key": api_key, "vanityurl": vanity_url},
        )
        resp.raise_for_status()
        data = resp.json()

    response_data = data.get("response", {})
    if response_data.get("success") != 1:
        message = response_data.get("message", "カスタム URL が見つかりません")
        raise SteamAPIError(f"VanityURL の解決に失敗しました: {message}", error_code="VANITY_NOT_FOUND")

    result = {"steamid": response_data["steamid"], "dev_mode": False}
    _set_cache(cache_key, result)
    return {**result, "cached": False, "cached_at": None}


async def get_player_summaries(steam_id: str, force_refresh: bool = False) -> dict:
    """
    プレイヤーの基本情報（アバター・プレイヤー名・公開設定）を取得する。

    Returns:
        {
            "player": dict,
            "cached": bool,
            "cached_at": Optional[str],
            "dev_mode": bool
        }
    Raises:
        SteamPrivateProfileError: プロフィールが非公開の場合
        SteamAPIError: API エラーの場合
    """
    cache_key = _cache_key("player_summaries", steam_id)

    if not force_refresh:
        cached = _get_from_cache(cache_key)
        if cached:
            data, cached_at = cached
            _check_profile_visibility(data["player"])
            return {**data, "cached": True, "cached_at": _format_cached_at(cached_at)}

    api_key = os.environ.get("STEAM_API_KEY", "").strip()
    dev_mode = not api_key or api_key == "your_steam_api_key_here"

    if dev_mode:
        logger.info("[DEV MODE] get_player_summaries: steam_id=%s", steam_id)
        mock_player = _MOCK_PLAYER_SUMMARIES.get(
            steam_id,
            {**_MOCK_PLAYER_SUMMARIES["76561198000000001"], "steamid": steam_id},
        )
        result = {"player": mock_player, "dev_mode": True}
        _set_cache(cache_key, result)
        return {**result, "cached": False, "cached_at": None}

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/",
            params={"key": api_key, "steamids": steam_id},
        )
        resp.raise_for_status()
        data = resp.json()

    players = data.get("response", {}).get("players", [])
    if not players:
        raise SteamAPIError(
            "指定された SteamID のプレイヤーが見つかりません",
            error_code="PLAYER_NOT_FOUND",
        )

    player = players[0]
    _check_profile_visibility(player)

    result = {"player": player, "dev_mode": False}
    _set_cache(cache_key, result)
    return {**result, "cached": False, "cached_at": None}


async def get_owned_games(steam_id: str, force_refresh: bool = False) -> dict:
    """
    所持ゲーム一覧とプレイ時間を取得する。

    Returns:
        {
            "game_count": int,
            "games": list[dict],
            "cached": bool,
            "cached_at": Optional[str],
            "dev_mode": bool
        }
    Raises:
        SteamPrivateProfileError: プロフィール/ゲームリストが非公開の場合
        SteamAPIError: API エラーの場合
    """
    cache_key = _cache_key("owned_games", steam_id)

    if not force_refresh:
        cached = _get_from_cache(cache_key)
        if cached:
            data, cached_at = cached
            return {**data, "cached": True, "cached_at": _format_cached_at(cached_at)}

    api_key = os.environ.get("STEAM_API_KEY", "").strip()
    dev_mode = not api_key or api_key == "your_steam_api_key_here"

    if dev_mode:
        logger.info("[DEV MODE] get_owned_games: steam_id=%s", steam_id)
        result = {
            "game_count": len(_MOCK_OWNED_GAMES),
            "games": _MOCK_OWNED_GAMES,
            "dev_mode": True,
        }
        _set_cache(cache_key, result)
        return {**result, "cached": False, "cached_at": None}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{STEAM_API_BASE}/IPlayerService/GetOwnedGames/v0001/",
            params={
                "key": api_key,
                "steamid": steam_id,
                "include_appinfo": 1,
                "include_played_free_games": 1,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    response_data = data.get("response", {})

    # game_count がなければ非公開と判断
    if "game_count" not in response_data:
        raise SteamPrivateProfileError(steam_id)

    games = response_data.get("games", [])
    result = {
        "game_count": response_data["game_count"],
        "games": games,
        "dev_mode": False,
    }
    _set_cache(cache_key, result)
    return {**result, "cached": False, "cached_at": None}


# ---------------------------------------------------------------------------
# ユーティリティ
# ---------------------------------------------------------------------------

def _check_profile_visibility(player: dict) -> None:
    """プロフィール公開設定を確認し、非公開なら例外を投げる"""
    visibility = player.get("communityvisibilitystate", 0)
    if visibility != COMMUNITY_VISIBILITY_PUBLIC:
        raise SteamPrivateProfileError(player.get("steamid", "unknown"))


def _format_cached_at(cached_at: float) -> str:
    """Unix timestamp を ISO 8601 文字列に変換する"""
    return datetime.fromtimestamp(cached_at).isoformat()


# ---------------------------------------------------------------------------
# カスタム例外
# ---------------------------------------------------------------------------

class SteamAPIError(Exception):
    """Steam API に関する汎用エラー"""
    def __init__(self, message: str, error_code: str = "STEAM_API_ERROR"):
        super().__init__(message)
        self.error_code = error_code


class SteamPrivateProfileError(SteamAPIError):
    """プロフィールが非公開の場合のエラー"""
    def __init__(self, steam_id: str):
        super().__init__(
            f"Steam プロフィール（{steam_id}）が非公開に設定されています",
            error_code="PROFILE_PRIVATE",
        )
        self.steam_id = steam_id
