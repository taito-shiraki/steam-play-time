"""
ユーザーデータルーター（要認証）
- POST /api/user/steam-id: Steam IDの紐づけ
- POST /api/user/stats-history: 統計データ保存
- GET  /api/user/stats-history: 統計データ履歴一覧
- POST /api/user/play-logs: 手動ログデータ保存
- GET  /api/user/play-logs: 手動ログデータ取得
"""
import logging
from datetime import datetime
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from auth_utils import get_current_user
import models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])


# --- Pydantic スキーマ ---

class SteamIdRequest(BaseModel):
    steam_id: str


class StatsHistoryRequest(BaseModel):
    steam_id: str
    player_name: Optional[str] = None
    avatar_url: Optional[str] = None
    total_games: Optional[int] = None
    total_playtime_hours: Optional[float] = None
    top_game_name: Optional[str] = None
    top_game_hours: Optional[float] = None
    raw_data: Optional[Any] = None


class StatsHistoryResponse(BaseModel):
    id: int
    steam_id: str
    player_name: Optional[str] = None
    avatar_url: Optional[str] = None
    total_games: Optional[int] = None
    total_playtime_hours: Optional[float] = None
    top_game_name: Optional[str] = None
    top_game_hours: Optional[float] = None
    fetched_at: datetime

    class Config:
        from_attributes = True


class PlayLogItem(BaseModel):
    id: Optional[int] = None        # サーバー側DB ID（新規時はNone）
    client_id: Optional[int] = None # フロントエンド側のID
    month: str                      # "YYYY-MM"
    game: str
    hours: float


class PlayLogResponse(BaseModel):
    id: int
    client_id: Optional[int] = None
    month: str
    game: str
    hours: float
    created_at: datetime

    class Config:
        from_attributes = True


class SyncPlayLogsRequest(BaseModel):
    steam_id: Optional[str] = None
    logs: List[PlayLogItem]


# --- エンドポイント ---

@router.post("/steam-id")
async def update_steam_id(
    request: SteamIdRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ログインユーザーのSteam IDを紐づける"""
    # 簡易バリデーション: SteamID64は17桁の数値
    steam_id = request.steam_id.strip()
    if not steam_id.isdigit() or len(steam_id) != 17:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Steam IDはSteamID64（17桁の数値）を指定してください",
        )

    current_user.steam_id = steam_id
    db.commit()
    db.refresh(current_user)

    logger.info(f"Steam ID 紐づけ: user_id={current_user.id}, steam_id={steam_id}")

    return {"message": "Steam IDを紐づけました", "steam_id": steam_id}


@router.post("/stats-history", response_model=StatsHistoryResponse, status_code=status.HTTP_201_CREATED)
async def save_stats_history(
    request: StatsHistoryRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """統計データをサーバーに保存する"""
    entry = models.StatsHistory(
        user_id=current_user.id,
        steam_id=request.steam_id,
        player_name=request.player_name,
        avatar_url=request.avatar_url,
        total_games=request.total_games,
        total_playtime_hours=request.total_playtime_hours,
        top_game_name=request.top_game_name,
        top_game_hours=request.top_game_hours,
        raw_data=request.raw_data,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    logger.info(
        f"統計保存: user_id={current_user.id}, steam_id={request.steam_id}, "
        f"total_hours={request.total_playtime_hours}"
    )

    return StatsHistoryResponse.model_validate(entry)


@router.get("/stats-history", response_model=List[StatsHistoryResponse])
async def get_stats_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ログインユーザーの統計データ履歴一覧を返す（新しい順）"""
    histories = (
        db.query(models.StatsHistory)
        .filter(models.StatsHistory.user_id == current_user.id)
        .order_by(models.StatsHistory.fetched_at.desc())
        .all()
    )
    return [StatsHistoryResponse.model_validate(h) for h in histories]


@router.post("/play-logs/sync", response_model=List[PlayLogResponse])
async def sync_play_logs(
    request: SyncPlayLogsRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    localStorageのログデータをサーバーに一括同期する。
    既存のログをすべて置き換える（上書き同期）。
    """
    # 既存ログを削除
    db.query(models.PlayLog).filter(
        models.PlayLog.user_id == current_user.id
    ).delete()

    # 新しいログを保存
    saved = []
    for item in request.logs:
        log = models.PlayLog(
            user_id=current_user.id,
            steam_id=request.steam_id or current_user.steam_id,
            month=item.month,
            game=item.game,
            hours=item.hours,
            client_id=item.client_id,
        )
        db.add(log)
        saved.append(log)

    db.commit()
    for log in saved:
        db.refresh(log)

    logger.info(f"プレイログ同期: user_id={current_user.id}, count={len(saved)}")

    return [PlayLogResponse.model_validate(log) for log in saved]


@router.post("/play-logs", response_model=PlayLogResponse, status_code=status.HTTP_201_CREATED)
async def add_play_log(
    item: PlayLogItem,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プレイログを1件追加する"""
    log = models.PlayLog(
        user_id=current_user.id,
        steam_id=current_user.steam_id,
        month=item.month,
        game=item.game,
        hours=item.hours,
        client_id=item.client_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return PlayLogResponse.model_validate(log)


@router.get("/play-logs", response_model=List[PlayLogResponse])
async def get_play_logs(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ログインユーザーのプレイログ一覧を返す"""
    logs = (
        db.query(models.PlayLog)
        .filter(models.PlayLog.user_id == current_user.id)
        .order_by(models.PlayLog.month.asc(), models.PlayLog.created_at.asc())
        .all()
    )
    return [PlayLogResponse.model_validate(log) for log in logs]


@router.delete("/play-logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_play_log(
    log_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プレイログを1件削除する"""
    log = db.query(models.PlayLog).filter(
        models.PlayLog.id == log_id,
        models.PlayLog.user_id == current_user.id,
    ).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ログが見つかりません")
    db.delete(log)
    db.commit()
