"""
プレイ時間バッジ画像生成ルーター (F-013)

GET /api/badge/image/{steam_id}  ->  PNG バッジ画像を動的生成して返す

段階別称号:
  0   ~ 99h  : ビギナー   (灰色)
  100 ~ 499h : レギュラー (緑)
  500 ~ 999h : ベテラン   (青)
  1000~ 4999h: マスター   (紫)
  5000h~     : レジェンド (金)
"""

import io
import logging
import math
import os

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

router = APIRouter(prefix="/api/badge", tags=["badge"])

# バッジサイズ（SNSアイコン向け正方形）
BADGE_SIZE = 400

# 称号定義: (最小時間, 称号名, メインカラー, サブカラー, 説明)
TITLE_TIERS = [
    (5000, "レジェンド",   (255, 215,   0), (255, 180,   0), "伝説的なゲーマー"),
    (1000, "マスター",     (180,   0, 255), (140,   0, 200), "達人の域に達したプレイヤー"),
    ( 500, "ベテラン",     ( 30, 144, 255), ( 20, 100, 200), "経験豊富なプレイヤー"),
    ( 100, "レギュラー",   ( 50, 200,  80), ( 30, 150,  60), "安定したプレイヤー"),
    (   0, "ビギナー",     (160, 160, 170), (110, 110, 120), "ゲームを楽しみ始めたプレイヤー"),
]

# カラーパレット（Steam ダークテーマ）
COLOR_BG_OUTER  = (10,  12,  18)
COLOR_BG_INNER  = (23,  26,  33)
COLOR_PANEL     = (27,  40,  56)
COLOR_TEXT_WHITE = (255, 255, 255)
COLOR_TEXT_GRAY  = (172, 178, 184)
COLOR_STEAM_BLUE = (102, 192, 244)


def _get_tier(total_hours: float) -> tuple:
    """総プレイ時間から称号情報を返す"""
    for min_hours, title, color_main, color_sub, desc in TITLE_TIERS:
        if total_hours >= min_hours:
            return title, color_main, color_sub, desc
    return TITLE_TIERS[-1][1], TITLE_TIERS[-1][2], TITLE_TIERS[-1][3], TITLE_TIERS[-1][4]


def _get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """
    システムフォントを探して返す。
    OGP と同じフォント選択ロジック（日本語フォントを優先）。
    """
    if bold:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "C:/Windows/Fonts/meiryob.ttc",
            "C:/Windows/Fonts/msgothic.ttc",
            "C:/Windows/Fonts/arialbd.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "C:/Windows/Fonts/msgothic.ttc",
            "C:/Windows/Fonts/meiryo.ttc",
            "C:/Windows/Fonts/arial.ttf",
        ]

    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue

    return ImageFont.load_default()


def _draw_star(draw: ImageDraw.ImageDraw, cx: float, cy: float, r_outer: float, r_inner: float,
               points: int, fill: tuple, outline: tuple | None = None) -> None:
    """多角星を描画する"""
    coords = []
    for i in range(points * 2):
        angle = math.pi / points * i - math.pi / 2
        r = r_outer if i % 2 == 0 else r_inner
        coords.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(coords, fill=fill, outline=outline)


def _draw_shield(draw: ImageDraw.ImageDraw, cx: float, cy: float, size: float,
                 fill: tuple, outline: tuple, outline_width: int = 3) -> None:
    """盾型シールドを描画する"""
    w = size
    h = size * 1.2
    x = cx - w / 2
    y = cy - h / 2

    # 盾の形状: 上部は四角、下部は三角形
    shield_points = [
        (x,          y),
        (x + w,      y),
        (x + w,      y + h * 0.6),
        (cx,         y + h),
        (x,          y + h * 0.6),
    ]
    draw.polygon(shield_points, fill=fill, outline=outline)
    # アウトライン再描画（Pillowのpolygonアウトラインが細いため）
    for i in range(outline_width):
        offset = i
        pts = [
            (x - offset,     y - offset),
            (x + w + offset, y - offset),
            (x + w + offset, y + h * 0.6 + offset * 0.5),
            (cx,             y + h + offset),
            (x - offset,     y + h * 0.6 + offset * 0.5),
        ]
        draw.polygon(pts, fill=None, outline=outline)


def _generate_badge_image(
    player_name: str,
    total_hours: float,
    tier_title: str,
    tier_color_main: tuple,
    tier_color_sub: tuple,
    tier_desc: str,
) -> bytes:
    """バッジ PNG 画像を生成してバイト列を返す"""

    size = BADGE_SIZE
    img = Image.new("RGB", (size, size), color=COLOR_BG_OUTER)
    draw = ImageDraw.Draw(img)

    # --- 外枠（グラデーション風カラーリング）---
    border_w = 10
    # 外側ボーダー
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=32,
        fill=COLOR_BG_OUTER,
        outline=tier_color_main,
        width=border_w,
    )

    # 内側背景
    inner_margin = border_w + 4
    draw.rounded_rectangle(
        [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
        radius=24,
        fill=COLOR_BG_INNER,
    )

    # --- 上部アクセントライン ---
    accent_y = inner_margin + 2
    draw.rounded_rectangle(
        [inner_margin, accent_y, size - inner_margin, accent_y + 5],
        radius=4,
        fill=tier_color_main,
    )

    # --- 称号タイトル（上部） ---
    font_tier = _get_font(36, bold=True)
    font_hours = _get_font(44, bold=True)
    font_unit = _get_font(22)
    font_player = _get_font(24, bold=False)
    font_service = _get_font(18)
    font_desc = _get_font(18)

    # "STEAM BADGE" サービスラベル
    service_text = "STEAM BADGE"
    bbox = draw.textbbox((0, 0), service_text, font=font_service)
    sw = bbox[2] - bbox[0]
    draw.text(
        ((size - sw) // 2, inner_margin + 14),
        service_text,
        fill=COLOR_TEXT_GRAY,
        font=font_service,
    )

    # --- 盾アイコン（中央上部） ---
    shield_cx = size // 2
    shield_cy = 155
    shield_size = 58

    # 盾の色（称号カラー）
    shield_fill = tuple(max(0, c - 80) for c in tier_color_main)  # 少し暗く
    _draw_shield(draw, shield_cx, shield_cy, shield_size,
                 fill=shield_fill, outline=tier_color_main, outline_width=4)

    # 盾の中に星
    _draw_star(draw, shield_cx, shield_cy - 4, 18, 8, 5,
               fill=tier_color_main)

    # --- 称号名 ---
    bbox = draw.textbbox((0, 0), tier_title, font=font_tier)
    tw = bbox[2] - bbox[0]
    tier_y = shield_cy + shield_size * 0.6 + 10
    draw.text(
        ((size - tw) // 2, tier_y),
        tier_title,
        fill=tier_color_main,
        font=font_tier,
    )

    # --- 区切り線 ---
    sep_y = int(tier_y + 50)
    draw.line(
        [(size // 2 - 80, sep_y), (size // 2 + 80, sep_y)],
        fill=tier_color_sub,
        width=2,
    )

    # --- 総プレイ時間 ---
    hours_int = int(total_hours)
    hours_str = f"{hours_int:,}"
    bbox = draw.textbbox((0, 0), hours_str, font=font_hours)
    hw = bbox[2] - bbox[0]
    hours_y = sep_y + 14

    draw.text(
        ((size - hw) // 2, hours_y),
        hours_str,
        fill=COLOR_TEXT_WHITE,
        font=font_hours,
    )

    unit_text = "時間"
    bbox_u = draw.textbbox((0, 0), unit_text, font=font_unit)
    uw = bbox_u[2] - bbox_u[0]
    draw.text(
        ((size - uw) // 2, hours_y + 52),
        unit_text,
        fill=COLOR_TEXT_GRAY,
        font=font_unit,
    )

    # --- 称号説明 ---
    bbox = draw.textbbox((0, 0), tier_desc, font=font_desc)
    dw = bbox[2] - bbox[0]
    draw.text(
        ((size - dw) // 2, hours_y + 88),
        tier_desc,
        fill=COLOR_TEXT_GRAY,
        font=font_desc,
    )

    # --- プレイヤー名 ---
    player_display = player_name if len(player_name) <= 20 else player_name[:19] + "…"
    bbox = draw.textbbox((0, 0), player_display, font=font_player)
    pw = bbox[2] - bbox[0]
    player_y = hours_y + 122
    draw.text(
        ((size - pw) // 2, player_y),
        player_display,
        fill=COLOR_STEAM_BLUE,
        font=font_player,
    )

    # --- 下部アクセントライン ---
    bottom_y = size - inner_margin - 7
    draw.rounded_rectangle(
        [inner_margin, bottom_y, size - inner_margin, bottom_y + 5],
        radius=4,
        fill=tier_color_sub,
    )

    # PNG 変換
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# エンドポイント
# ---------------------------------------------------------------------------

@router.get("/image/{steam_id}")
async def get_badge_image(steam_id: str):
    """
    指定 SteamID のプレイ時間バッジ画像（PNG 400x400）を動的生成して返す。

    開発モード（APIキー未設定）では 956.3h / ベテランのモックデータを使用する。
    """
    if not is_steam_id64(steam_id):
        raise HTTPException(
            status_code=400,
            detail="有効な SteamID64（17桁の数値）を指定してください",
        )

    # Steam データ取得
    try:
        player_result = await get_player_summaries(steam_id)
        games_result = await get_owned_games(steam_id)
    except SteamPrivateProfileError:
        player_result = None
        games_result = None
    except SteamAPIError as e:
        logger.error("Steam API error while generating badge: %s", e)
        raise HTTPException(status_code=502, detail="Steam データの取得に失敗しました")

    if player_result and games_result:
        player = player_result["player"]
        player_name = player.get("personaname", "Steamユーザー")
        games = games_result["games"]
        total_minutes = sum(g.get("playtime_forever", 0) for g in games)
        total_hours = round(total_minutes / 60, 1)
    else:
        # 開発モード / プロフィール非公開 のデフォルト値
        player_name = "Steamユーザー"
        total_hours = 956.3  # ベテラン相当のモックデータ

    tier_title, tier_color_main, tier_color_sub, tier_desc = _get_tier(total_hours)

    try:
        png_bytes = _generate_badge_image(
            player_name=player_name,
            total_hours=total_hours,
            tier_title=tier_title,
            tier_color_main=tier_color_main,
            tier_color_sub=tier_color_sub,
            tier_desc=tier_desc,
        )
    except Exception as e:
        logger.error("Failed to generate badge image: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="バッジ画像の生成に失敗しました")

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=1800",
            "Content-Disposition": 'inline; filename="steam_badge.png"',
            "X-Steam-ID": steam_id,
            "X-Total-Hours": str(total_hours),
        },
    )


@router.get("/info/{steam_id}")
async def get_badge_info(steam_id: str):
    """
    称号情報と総プレイ時間を JSON で返す（フロントエンドの称号表示用）。
    """
    if not is_steam_id64(steam_id):
        raise HTTPException(
            status_code=400,
            detail="有効な SteamID64（17桁の数値）を指定してください",
        )

    try:
        player_result = await get_player_summaries(steam_id)
        games_result = await get_owned_games(steam_id)
    except SteamPrivateProfileError:
        player_result = None
        games_result = None
    except SteamAPIError as e:
        logger.error("Steam API error while fetching badge info: %s", e)
        raise HTTPException(status_code=502, detail="Steam データの取得に失敗しました")

    if player_result and games_result:
        games = games_result["games"]
        total_minutes = sum(g.get("playtime_forever", 0) for g in games)
        total_hours = round(total_minutes / 60, 1)
    else:
        total_hours = 956.3  # 開発モードのモックデータ

    tier_title, color_main, color_sub, tier_desc = _get_tier(total_hours)

    # 次の称号までの残り時間を計算（TITLE_TIERSは降順なので昇順に変換して検索）
    next_tier = None
    for min_hours, title, _, _, desc in reversed(TITLE_TIERS):
        if min_hours > total_hours:
            next_tier = {"title": title, "hours_needed": round(min_hours - total_hours, 1)}
            break

    return {
        "total_hours": total_hours,
        "tier_title": tier_title,
        "tier_desc": tier_desc,
        "tier_color": "#{:02x}{:02x}{:02x}".format(*color_main),
        "next_tier": next_tier,
        "tiers": [
            {"min_hours": mh, "title": t, "desc": d}
            for mh, t, _, _, d in TITLE_TIERS
        ],
    }
