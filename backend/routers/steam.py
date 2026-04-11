"""
Steam API ルーター

/api/steam/* 配下のエンドポイントを定義する。
"""

import re
import time
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.steam_service import (
    SteamAPIError,
    SteamPrivateProfileError,
    extract_vanity_url,
    get_owned_games,
    get_player_summaries,
    invalidate_steam_id_cache,
    is_steam_id64,
    resolve_vanity_url,
)
from services.genre_service import (
    get_genre_summary,
    invalidate_genre_cache,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/steam", tags=["steam"])


# ---------------------------------------------------------------------------
# レスポンスモデル
# ---------------------------------------------------------------------------

class CacheInfo(BaseModel):
    cached: bool
    cached_at: Optional[str] = None  # ISO 8601
    age_seconds: Optional[int] = None
    age_minutes: Optional[int] = None


class PlayerInfo(BaseModel):
    steamid: str
    personaname: str
    profileurl: str
    avatar: str
    avatarmedium: str
    avatarfull: str
    communityvisibilitystate: int
    personastate: Optional[int] = None
    lastlogoff: Optional[int] = None


class GameInfo(BaseModel):
    appid: int
    name: Optional[str] = None
    playtime_forever: int  # 分単位
    playtime_2weeks: Optional[int] = None  # 分単位
    img_icon_url: Optional[str] = None
    img_logo_url: Optional[str] = None


class PlayerSummaryResponse(BaseModel):
    player: PlayerInfo
    cache_info: CacheInfo
    dev_mode: bool


class OwnedGamesResponse(BaseModel):
    game_count: int
    games: list[GameInfo]
    cache_info: CacheInfo
    dev_mode: bool


class ResolveResponse(BaseModel):
    steamid: str
    cache_info: CacheInfo
    dev_mode: bool


class PrivateProfileErrorDetail(BaseModel):
    error_code: str
    message: str
    steam_id: str
    how_to_fix: list[str]
    steam_settings_url: str


# ---------------------------------------------------------------------------
# ヘルパー
# ---------------------------------------------------------------------------

def _build_cache_info(cached: bool, cached_at: Optional[str]) -> CacheInfo:
    age_seconds = None
    age_minutes = None
    if cached and cached_at:
        try:
            dt = datetime.fromisoformat(cached_at)
            age_seconds = int(time.time() - dt.timestamp())
            age_minutes = age_seconds // 60
        except Exception:
            pass
    return CacheInfo(
        cached=cached,
        cached_at=cached_at,
        age_seconds=age_seconds,
        age_minutes=age_minutes,
    )


def _private_profile_response(steam_id: str):
    """プロフィール非公開時の 403 レスポンスを生成する"""
    detail = PrivateProfileErrorDetail(
        error_code="PROFILE_PRIVATE",
        message="Steam プロフィールが非公開に設定されています。ゲームデータを取得するにはプロフィールを公開してください。",
        steam_id=steam_id,
        how_to_fix=[
            "Steam クライアントを開くか、Steam Web サイト（https://store.steampowered.com）にアクセスします",
            "右上のアカウント名をクリックし「プロフィールを見る」を選択します",
            "「プロフィールを編集」ボタンをクリックします",
            "「プライバシー設定」タブを開きます",
            "「マイプロフィール」と「ゲームの詳細」を「公開」に設定します",
            "「変更を保存」をクリックします",
        ],
        steam_settings_url="https://steamcommunity.com/my/edit/settings",
    )
    raise HTTPException(status_code=403, detail=detail.model_dump())


def _validate_and_normalize_input(steam_input: str) -> tuple[str, str]:
    """
    入力値を検証・正規化して (steam_id_or_vanity, input_type) を返す。
    input_type: "steamid64" | "vanity_url" | "url"
    """
    steam_input = steam_input.strip()
    if not steam_input:
        raise HTTPException(status_code=400, detail="Steam ID または URL を入力してください")

    if is_steam_id64(steam_input):
        return steam_input, "steamid64"

    vanity = extract_vanity_url(steam_input)
    if vanity:
        # URL から抽出したカスタム URL
        if not re.match(r"^[a-zA-Z0-9_-]{2,32}$", vanity):
            raise HTTPException(status_code=400, detail="不正なカスタム URL です")
        return vanity, "url"

    # カスタム URL の直接入力（英数字のみ）
    if re.match(r"^[a-zA-Z0-9_-]{2,32}$", steam_input):
        return steam_input, "vanity_url"

    raise HTTPException(
        status_code=400,
        detail=(
            "入力形式が正しくありません。"
            "SteamID64（17桁の数値）、カスタムURL、"
            "または https://steamcommunity.com/id/USERNAME 形式で入力してください"
        ),
    )


async def _resolve_to_steam_id(steam_input: str, force_refresh: bool) -> tuple[str, bool, Optional[str], bool]:
    """
    入力を SteamID64 に解決して (steam_id, cached, cached_at, dev_mode) を返す。
    """
    normalized, input_type = _validate_and_normalize_input(steam_input)

    if input_type == "steamid64":
        return normalized, False, None, False

    # vanity URL or URL → resolve
    try:
        result = await resolve_vanity_url(normalized, force_refresh=force_refresh)
    except SteamAPIError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return result["steamid"], result["cached"], result.get("cached_at"), result.get("dev_mode", False)


# ---------------------------------------------------------------------------
# エンドポイント
# ---------------------------------------------------------------------------

@router.get("/player/{steam_input:path}", response_model=PlayerSummaryResponse)
async def get_player(
    steam_input: str,
    force_refresh: bool = Query(False, description="キャッシュを無視して最新データを取得する"),
):
    """
    プレイヤー情報を取得する。

    - SteamID64（17桁数値）またはカスタム URL を受け付ける
    - プロフィールが非公開の場合は 403 を返す
    """
    try:
        steam_id, _cached, _cached_at, _dev = await _resolve_to_steam_id(steam_input, force_refresh)
        result = await get_player_summaries(steam_id, force_refresh=force_refresh)
    except SteamPrivateProfileError as e:
        _private_profile_response(e.steam_id)
    except SteamAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except HTTPException:
        raise

    return PlayerSummaryResponse(
        player=PlayerInfo(**result["player"]),
        cache_info=_build_cache_info(result["cached"], result.get("cached_at")),
        dev_mode=result.get("dev_mode", False),
    )


@router.get("/games/{steam_input:path}", response_model=OwnedGamesResponse)
async def get_games(
    steam_input: str,
    force_refresh: bool = Query(False, description="キャッシュを無視して最新データを取得する"),
):
    """
    所持ゲームリストとプレイ時間を取得する。

    - SteamID64 またはカスタム URL を受け付ける
    - ゲームリストが非公開の場合は 403 を返す
    """
    try:
        steam_id, _cached, _cached_at, _dev = await _resolve_to_steam_id(steam_input, force_refresh)
        result = await get_owned_games(steam_id, force_refresh=force_refresh)
    except SteamPrivateProfileError as e:
        _private_profile_response(e.steam_id)
    except SteamAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except HTTPException:
        raise

    games = [GameInfo(**g) for g in result["games"]]

    return OwnedGamesResponse(
        game_count=result["game_count"],
        games=games,
        cache_info=_build_cache_info(result["cached"], result.get("cached_at")),
        dev_mode=result.get("dev_mode", False),
    )


@router.get("/stats/{steam_input:path}")
async def get_stats(
    steam_input: str,
    force_refresh: bool = Query(False, description="キャッシュを無視して最新データを取得する"),
):
    """
    プレイヤー情報とゲームリストを一度に取得する統合エンドポイント。

    Sprint 3 以降でフロントエンドからの主要な呼び出し口となる。
    """
    try:
        steam_id, _cached, _cached_at, _dev = await _resolve_to_steam_id(steam_input, force_refresh)
        player_result = await get_player_summaries(steam_id, force_refresh=force_refresh)
        games_result = await get_owned_games(steam_id, force_refresh=force_refresh)
    except SteamPrivateProfileError as e:
        _private_profile_response(e.steam_id)
    except SteamAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except HTTPException:
        raise

    player = player_result["player"]
    games = games_result["games"]

    # サマリー統計を計算
    total_playtime_minutes = sum(g.get("playtime_forever", 0) for g in games)
    total_playtime_hours = round(total_playtime_minutes / 60, 1)

    top_game = max(games, key=lambda g: g.get("playtime_forever", 0)) if games else None

    recent_games = [g for g in games if g.get("playtime_2weeks", 0) > 0]
    recent_games_sorted = sorted(recent_games, key=lambda g: g.get("playtime_2weeks", 0), reverse=True)

    # キャッシュ情報（player と games のどちらかがキャッシュされていれば cached=True）
    is_cached = player_result["cached"] or games_result["cached"]
    cached_at = player_result.get("cached_at") or games_result.get("cached_at")

    return {
        "steamid": steam_id,
        "player": player,
        "summary": {
            "total_games": games_result["game_count"],
            "total_playtime_minutes": total_playtime_minutes,
            "total_playtime_hours": total_playtime_hours,
            "top_game": top_game,
        },
        "recent_games": recent_games_sorted[:20],
        "top_games": sorted(games, key=lambda g: g.get("playtime_forever", 0), reverse=True)[:20],
        "cache_info": _build_cache_info(is_cached, cached_at).model_dump(),
        "dev_mode": player_result.get("dev_mode", False),
    }


@router.get("/genres/{steam_input:path}")
async def get_genres(
    steam_input: str,
    force_refresh: bool = Query(False, description="キャッシュを無視して最新データを取得する"),
):
    """
    ジャンル別プレイ時間集計を返す（F-010）。

    - SteamID64 またはカスタム URL を受け付ける
    - Steam Store API からジャンル情報を取得し、ジャンルごとに集計する
    - APIキー未設定時はモックデータを返す
    """
    try:
        steam_id, _cached, _cached_at, _dev = await _resolve_to_steam_id(steam_input, force_refresh)
        games_result = await get_owned_games(steam_id, force_refresh=force_refresh)
    except SteamPrivateProfileError as e:
        _private_profile_response(e.steam_id)
    except SteamAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except HTTPException:
        raise

    games = games_result["games"]

    genre_result = await get_genre_summary(steam_id, games, force_refresh=force_refresh)

    return {
        "steamid": steam_id,
        **genre_result,
        "cache_info": _build_cache_info(
            genre_result.get("cached", False),
            genre_result.get("cached_at"),
        ).model_dump(),
    }


@router.post("/refresh/{steam_id}")
async def refresh_cache(steam_id: str):
    """
    指定 SteamID のキャッシュを手動で無効化する（F-017: リフレッシュボタン対応）。

    次回リクエスト時に Steam API から最新データを取得する。
    """
    if not is_steam_id64(steam_id):
        raise HTTPException(status_code=400, detail="有効な SteamID64（17桁の数値）を指定してください")

    invalidate_steam_id_cache(steam_id)
    invalidate_genre_cache(steam_id)
    return {"message": f"SteamID {steam_id} のキャッシュをクリアしました", "steamid": steam_id}


@router.get("/resolve/{vanity_url}")
async def resolve_vanity(
    vanity_url: str,
    force_refresh: bool = Query(False),
):
    """
    カスタム URL（vanity URL）を SteamID64 に解決する。
    """
    if not re.match(r"^[a-zA-Z0-9_-]{2,32}$", vanity_url):
        raise HTTPException(status_code=400, detail="不正なカスタム URL です")

    try:
        result = await resolve_vanity_url(vanity_url, force_refresh=force_refresh)
    except SteamAPIError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return ResolveResponse(
        steamid=result["steamid"],
        cache_info=_build_cache_info(result["cached"], result.get("cached_at")),
        dev_mode=result.get("dev_mode", False),
    )
