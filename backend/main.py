from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="SteamStats API",
    description="Steam プレイ時間ビジュアライザー バックエンド API",
    version="0.3.0",
)

# CORS設定 - フロントエンドからのリクエストを許可
# 開発環境: localhost:5173 を許可
# 本番環境: 環境変数 ALLOWED_ORIGINS でカンマ区切りのオリジンを指定
#   例: ALLOWED_ORIGINS=https://steamstats.vercel.app,https://www.example.com
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

_allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
if _allowed_origins_env:
    # 環境変数が設定されている場合: 環境変数のオリジン + デフォルト（開発用）を合わせて使う
    _extra_origins = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
    origins = list(set(_default_origins + _extra_origins))
else:
    origins = _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DBテーブルを自動作成
from database import engine, Base  # noqa: E402
import models  # noqa: E402, F401 — モデルを登録するためimport
Base.metadata.create_all(bind=engine)

# ルーターを登録
from routers.steam import router as steam_router      # noqa: E402
from routers.ogp import router as ogp_router         # noqa: E402
from routers.badge import router as badge_router     # noqa: E402
from routers.auth import router as auth_router       # noqa: E402
from routers.user_data import router as user_data_router  # noqa: E402

app.include_router(steam_router)
app.include_router(ogp_router)
app.include_router(badge_router)
app.include_router(auth_router)
app.include_router(user_data_router)


async def _health_response():
    """ヘルスチェックレスポンスを生成する共通関数"""
    steam_api_key = os.environ.get("STEAM_API_KEY", "")
    dev_mode = not steam_api_key or steam_api_key == "your_steam_api_key_here"
    return {
        "status": "ok",
        "service": "SteamStats API",
        "dev_mode": dev_mode,
        "steam_api_configured": not dev_mode,
    }


@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント（/health）"""
    return await _health_response()


@app.get("/api/health")
async def health_check_api():
    """ヘルスチェックエンドポイント（/api/health — フロントエンドプロキシ対応）"""
    return await _health_response()


@app.get("/")
async def root():
    return {"message": "SteamStats API", "docs": "/docs"}
