"""
認証ルーター
- POST /api/auth/register: アカウント登録
- POST /api/auth/login: ログイン（JWT返却）
- GET  /api/auth/me: 現在のユーザー情報取得
- POST /api/auth/logout: ログアウト（クライアント側でトークン破棄）
"""
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from database import get_db
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
import models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- Pydantic スキーマ ---

class RegisterRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or len(v) < 5:
            raise ValueError("有効なメールアドレスを入力してください")
        return v

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("パスワードは6文字以上で設定してください")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    steam_id: str | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- エンドポイント ---

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    メールアドレスとパスワードでアカウントを作成する。
    成功時はJWTトークンを返す。
    """
    # 既存メールチェック
    existing = db.query(models.User).filter(models.User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスは既に登録されています",
        )

    # ユーザー作成
    user = models.User(
        email=request.email,
        hashed_password=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # JWTトークン生成
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    logger.info(f"新規ユーザー登録: {user.email} (id={user.id})")

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    メールアドレスとパスワードでログインする。
    成功時はJWTトークンを返す。
    """
    email = request.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )

    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    logger.info(f"ログイン成功: {user.email} (id={user.id})")

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: models.User = Depends(get_current_user)):
    """現在のログインユーザー情報を返す"""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout():
    """
    ログアウト。
    JWTはステートレスなのでサーバー側では何もしない。
    クライアント側でトークンを削除する。
    """
    return {"message": "ログアウトしました"}
