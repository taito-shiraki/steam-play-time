"""
OGP 画像生成ルーター (F-018)

GET /api/ogp/image/{steam_id}  →  PNG 画像を動的生成して返す
"""

import io
import logging
import os
import textwrap

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont

from services.steam_service import (
    SteamAPIError,
    SteamPrivateProfileError,
    get_owned_games,
    get_player_summaries,
    is_steam_id64,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ogp", tags=["ogp"])

# OGP 推奨サイズ
OGP_WIDTH = 1200
OGP_HEIGHT = 630

# カラーパレット（Steam ダークテーマ）
COLOR_BG = (23, 26, 33)           # #171a21
COLOR_PANEL = (27, 40, 56)        # #1b2838
COLOR_ACCENT = (26, 159, 255)     # #1a9fff
COLOR_TEXT_WHITE = (255, 255, 255)
COLOR_TEXT_GRAY = (172, 178, 184) # #acb2b8
COLOR_BORDER = (42, 71, 94)       # #2a475e
COLOR_STEAM_BLUE = (102, 192, 244) # #66c0f4


def _get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """
    システムフォントを探して返す。
    見つからない場合は Pillow デフォルトフォントにフォールバックする。
    """
    candidates = []
    if bold:
        candidates = [
            # Linux
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            # macOS
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            # Windows - 日本語フォントを先に
            "C:/Windows/Fonts/meiryob.ttc",
            "C:/Windows/Fonts/msgothic.ttc",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/Arial Bold.ttf",
        ]
    else:
        candidates = [
            # Linux
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            # macOS
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            # Windows - 日本語フォントを先に
            "C:/Windows/Fonts/msgothic.ttc",
            "C:/Windows/Fonts/meiryo.ttc",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/Arial.ttf",
        ]

    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue

    # フォールバック
    return ImageFont.load_default()


def _truncate_text(text: str, max_chars: int) -> str:
    """テキストを最大文字数に切り詰める"""
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1] + "…"


def _get_game_name_font(text: str) -> ImageFont.FreeTypeFont:
    """
    ゲーム名の文字数に応じてフォントサイズを動的に選択する。
    カード幅（約350px）に収まるよう段階的に縮小する。
    """
    char_count = len(text)
    if char_count <= 10:
        return _get_font(36, bold=False)
    elif char_count <= 16:
        return _get_font(28, bold=False)
    elif char_count <= 22:
        return _get_font(22, bold=False)
    else:
        return _get_font(18, bold=False)


async def _fetch_avatar(url: str) -> Image.Image | None:
    """アバター画像を URL から取得して PIL Image を返す"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return Image.open(io.BytesIO(resp.content)).convert("RGBA")
    except Exception as e:
        logger.warning("Failed to fetch avatar from %s: %s", url, e)
        return None


def _draw_rounded_rect(draw: ImageDraw.ImageDraw, xy: tuple, radius: int, fill: tuple) -> None:
    """角丸矩形を描画する"""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill)


def _generate_ogp_image(
    player_name: str,
    total_hours: float,
    top_game_name: str,
    total_games: int,
    avatar_image: Image.Image | None,
) -> bytes:
    """OGP 画像を生成して PNG バイト列を返す"""

    # ベース画像
    img = Image.new("RGB", (OGP_WIDTH, OGP_HEIGHT), color=COLOR_BG)
    draw = ImageDraw.Draw(img)

    # --- 背景グラデーション風のパネル ---
    # 左側のグラデーション効果（濃いパネル）
    for i in range(OGP_WIDTH // 2):
        alpha = int(30 * (1 - i / (OGP_WIDTH // 2)))
        color = (
            COLOR_PANEL[0],
            COLOR_PANEL[1],
            min(255, COLOR_PANEL[2] + alpha),
        )
        draw.line([(i, 0), (i, OGP_HEIGHT)], fill=color)

    # アクセントライン（上部）
    draw.rectangle([0, 0, OGP_WIDTH, 6], fill=COLOR_ACCENT)

    # ボーダーライン（下部）
    draw.rectangle([0, OGP_HEIGHT - 4, OGP_WIDTH, OGP_HEIGHT], fill=COLOR_BORDER)

    # フォント準備
    font_title = _get_font(52, bold=True)
    font_large = _get_font(44, bold=True)
    font_medium = _get_font(32)
    font_small = _get_font(26)
    font_label = _get_font(22)
    font_service = _get_font(24, bold=True)

    # --- アバター ---
    avatar_size = 120
    avatar_x, avatar_y = 70, 70
    if avatar_image:
        avatar_resized = avatar_image.resize((avatar_size, avatar_size), Image.LANCZOS)
        # 丸くクリップ
        mask = Image.new("L", (avatar_size, avatar_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([0, 0, avatar_size, avatar_size], fill=255)
        avatar_rgba = avatar_resized.convert("RGBA")
        img.paste(avatar_rgba, (avatar_x, avatar_y), mask)
        # アバター枠線
        draw.ellipse(
            [avatar_x - 3, avatar_y - 3, avatar_x + avatar_size + 3, avatar_y + avatar_size + 3],
            outline=COLOR_ACCENT,
            width=3,
        )
    else:
        # デフォルトアバター（円形プレースホルダー）
        draw.ellipse(
            [avatar_x, avatar_y, avatar_x + avatar_size, avatar_y + avatar_size],
            fill=COLOR_PANEL,
            outline=COLOR_ACCENT,
            width=3,
        )

    # --- プレイヤー名 ---
    name_x = avatar_x + avatar_size + 30
    name_y = avatar_y + 10
    player_name_display = _truncate_text(player_name, 24)
    draw.text((name_x, name_y), player_name_display, fill=COLOR_TEXT_WHITE, font=font_title)

    # サブテキスト（Steam プレイ統計）
    draw.text(
        (name_x, name_y + 65),
        "Steam プレイ統計",
        fill=COLOR_STEAM_BLUE,
        font=font_small,
    )

    # --- 区切り線 ---
    separator_y = 230
    draw.line([(60, separator_y), (OGP_WIDTH - 60, separator_y)], fill=COLOR_BORDER, width=2)

    # --- 統計カード 3つ ---
    card_y = 260
    card_height = 240
    card_margin = 40
    card_width = (OGP_WIDTH - card_margin * 4) // 3

    stats = [
        {
            "label": "総プレイ時間",
            "value": f"{total_hours:,.0f}",
            "unit": "時間",
            "color": COLOR_ACCENT,
        },
        {
            "label": "最多プレイゲーム",
            "value": top_game_name,
            "unit": "",
            "color": COLOR_STEAM_BLUE,
            "dynamic_font": True,
        },
        {
            "label": "所持ゲーム数",
            "value": str(total_games),
            "unit": "本",
            "color": (100, 220, 150),
        },
    ]

    for i, stat in enumerate(stats):
        cx = card_margin + i * (card_width + card_margin)
        cy = card_y

        # カードの背景
        _draw_rounded_rect(
            draw,
            (cx, cy, cx + card_width, cy + card_height),
            radius=16,
            fill=COLOR_PANEL,
        )

        # カード上部のアクセントバー
        draw.rounded_rectangle(
            [cx, cy, cx + card_width, cy + 6],
            radius=4,
            fill=stat["color"],
        )

        # ラベル
        draw.text(
            (cx + 20, cy + 30),
            stat["label"],
            fill=COLOR_TEXT_GRAY,
            font=font_label,
        )

        # 値（大きく表示）
        if stat.get("dynamic_font"):
            value_font = _get_game_name_font(stat["value"])
        else:
            value_font = font_large if len(stat["value"]) <= 8 else font_medium
        draw.text(
            (cx + 20, cy + 70),
            stat["value"],
            fill=stat["color"],
            font=value_font,
        )

        # 単位
        if stat["unit"]:
            draw.text(
                (cx + 20, cy + 130),
                stat["unit"],
                fill=COLOR_TEXT_GRAY,
                font=font_medium,
            )

    # --- サービス名（右下） ---
    service_text = "SteamStats"
    service_x = OGP_WIDTH - 220
    service_y = OGP_HEIGHT - 55
    draw.text((service_x, service_y), service_text, fill=COLOR_TEXT_GRAY, font=font_service)

    # --- PNG バイト列に変換 ---
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


@router.get("/image/{steam_id}")
async def get_ogp_image(steam_id: str):
    """
    指定 SteamID の統計情報を含む OGP 画像（PNG）を動的生成して返す。

    SNS に URL を貼り付けた際に og:image としてプレビュー表示される。
    """
    if not is_steam_id64(steam_id):
        raise HTTPException(status_code=400, detail="有効な SteamID64（17桁の数値）を指定してください")

    # Steam データ取得
    try:
        player_result = await get_player_summaries(steam_id)
        games_result = await get_owned_games(steam_id)
    except SteamPrivateProfileError:
        # プロフィール非公開の場合はデフォルト画像を返す
        player_result = None
        games_result = None
    except SteamAPIError as e:
        logger.error("Steam API error while generating OGP image: %s", e)
        raise HTTPException(status_code=502, detail="Steam データの取得に失敗しました")

    # データが取れなかった場合のデフォルト値
    if player_result and games_result:
        player = player_result["player"]
        player_name = player.get("personaname", "Steamユーザー")
        avatar_url = player.get("avatarfull") or player.get("avatar", "")

        games = games_result["games"]
        total_playtime_minutes = sum(g.get("playtime_forever", 0) for g in games)
        total_playtime_hours = round(total_playtime_minutes / 60, 1)
        total_games = games_result["game_count"]
        top_game = max(games, key=lambda g: g.get("playtime_forever", 0)) if games else None
        top_game_name = top_game.get("name", "N/A") if top_game else "N/A"
    else:
        player_name = "Steamユーザー"
        avatar_url = ""
        total_playtime_hours = 0.0
        total_games = 0
        top_game_name = "N/A"

    # アバター取得
    avatar_image = None
    if avatar_url:
        avatar_image = await _fetch_avatar(avatar_url)

    # OGP 画像生成
    try:
        png_bytes = _generate_ogp_image(
            player_name=player_name,
            total_hours=total_playtime_hours,
            top_game_name=top_game_name,
            total_games=total_games,
            avatar_image=avatar_image,
        )
    except Exception as e:
        logger.error("Failed to generate OGP image: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="OGP 画像の生成に失敗しました")

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=1800",  # 30分キャッシュ
            "X-Steam-ID": steam_id,
        },
    )
