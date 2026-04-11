"""
SQLAlchemy ORM モデル定義
- User: ユーザーアカウント
- StatsHistory: 統計データ履歴（Steam取得データのスナップショット）
- PlayLog: 手動入力の月次プレイログ
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    steam_id = Column(String(20), nullable=True)  # Steam ID紐づけ（任意）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # リレーション
    stats_histories = relationship("StatsHistory", back_populates="user", cascade="all, delete-orphan")
    play_logs = relationship("PlayLog", back_populates="user", cascade="all, delete-orphan")


class StatsHistory(Base):
    __tablename__ = "stats_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    steam_id = Column(String(20), nullable=False)
    player_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    total_games = Column(Integer, nullable=True)
    total_playtime_hours = Column(Float, nullable=True)
    top_game_name = Column(String(255), nullable=True)
    top_game_hours = Column(Float, nullable=True)
    raw_data = Column(JSON, nullable=True)  # 生データ全体をJSON保存
    fetched_at = Column(DateTime, default=datetime.utcnow)

    # リレーション
    user = relationship("User", back_populates="stats_histories")


class PlayLog(Base):
    __tablename__ = "play_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    steam_id = Column(String(20), nullable=True)  # 紐づけられたSteam ID
    month = Column(String(7), nullable=False)   # "YYYY-MM" 形式
    game = Column(String(255), nullable=False)
    hours = Column(Float, nullable=False)
    client_id = Column(Integer, nullable=True)  # フロントエンド側のID（同期用）
    created_at = Column(DateTime, default=datetime.utcnow)

    # リレーション
    user = relationship("User", back_populates="play_logs")
