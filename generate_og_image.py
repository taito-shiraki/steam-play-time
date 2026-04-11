"""
デフォルト OGP 画像生成スクリプト (Sprint 15 / F-029)
1200x630px の静的 PNG を frontend/public/og-image.png に出力する。
"""

import io
import os
import sys

from PIL import Image, ImageDraw, ImageFont

OGP_WIDTH = 1200
OGP_HEIGHT = 630

COLOR_BG = (23, 26, 33)            # #171a21
COLOR_PANEL = (27, 40, 56)         # #1b2838
COLOR_ACCENT = (26, 159, 255)      # #1a9fff
COLOR_LIGHT_BLUE = (102, 192, 244) # #66c0f4
COLOR_TEXT_WHITE = (255, 255, 255)
COLOR_TEXT_GRAY = (172, 178, 184)  # #acb2b8
COLOR_BORDER = (42, 71, 94)        # #2a475e


def _get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
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
            "C:/Windows/Fonts/meiryob.ttc",
            "C:/Windows/Fonts/meiryo.ttc",
            "C:/Windows/Fonts/msgothic.ttc",
            "C:/Windows/Fonts/arial.ttf",
        ]

    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue

    return ImageFont.load_default()


def generate_default_og_image() -> bytes:
    img = Image.new("RGB", (OGP_WIDTH, OGP_HEIGHT), color=COLOR_BG)
    draw = ImageDraw.Draw(img)

    # 背景グラデーション（左側）
    for i in range(OGP_WIDTH):
        alpha = int(40 * max(0, 1 - i / (OGP_WIDTH * 0.7)))
        color = (
            min(255, COLOR_PANEL[0] + alpha),
            min(255, COLOR_PANEL[1] + alpha),
            min(255, COLOR_PANEL[2] + alpha),
        )
        draw.line([(i, 0), (i, OGP_HEIGHT)], fill=color)

    # 上部アクセントライン
    draw.rectangle([0, 0, OGP_WIDTH, 8], fill=COLOR_ACCENT)

    # 下部ボーダーライン
    draw.rectangle([0, OGP_HEIGHT - 5, OGP_WIDTH, OGP_HEIGHT], fill=COLOR_BORDER)

    # 中央の装飾的な円（Steamロゴ風）
    circle_x, circle_y = 180, 315
    circle_r = 80
    draw.ellipse(
        [circle_x - circle_r, circle_y - circle_r,
         circle_x + circle_r, circle_y + circle_r],
        fill=COLOR_ACCENT,
        outline=COLOR_LIGHT_BLUE,
        width=3,
    )
    # 内側の円
    inner_r = 55
    draw.ellipse(
        [circle_x - inner_r, circle_y - inner_r,
         circle_x + inner_r, circle_y + inner_r],
        fill=COLOR_BG,
    )

    # テキスト配置
    font_service = _get_font(36, bold=True)
    font_heading = _get_font(62, bold=True)
    font_sub = _get_font(30)
    font_small = _get_font(24)
    font_badge = _get_font(22)

    text_x = 300

    # サービス名
    draw.text(
        (text_x, 170),
        "SteamStats",
        fill=COLOR_LIGHT_BLUE,
        font=font_service,
    )

    # メインコピー（日本語）
    draw.text(
        (text_x, 230),
        "Steam\u30d7\u30ec\u30a4\u6642\u9593\u3092",   # Steamプレイ時間を
        fill=COLOR_TEXT_WHITE,
        font=font_heading,
    )
    draw.text(
        (text_x, 310),
        "\u4e00\u76ee\u3067\u5206\u6790",              # 一目で分析
        fill=COLOR_ACCENT,
        font=font_heading,
    )

    # サブコピー
    draw.text(
        (text_x, 400),
        "Steam ID\u3092\u5165\u529b\u3059\u308b\u3060\u3051\u3002TOP20\u30c1\u30e3\u30fc\u30c8\u3001\u30b8\u30e3\u30f3\u30eb\u5206\u6790\u3001\u30b3\u30b9\u30d1\u5206\u6790\u3092\u5373\u5ea7\u306b\u8868\u793a\u3002",
        fill=COLOR_TEXT_GRAY,
        font=font_sub,
    )

    # 機能タグ
    tags = [
        ("TOP20 Chart", COLOR_ACCENT),
        ("Genre Analysis", COLOR_LIGHT_BLUE),
        ("Cost Ranking", (100, 220, 150)),
    ]
    tag_x = text_x
    tag_y = 475
    for tag_text, tag_color in tags:
        tag_font = _get_font(20, bold=True)
        bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
        tag_w = bbox[2] - bbox[0] + 24
        tag_h = 36
        draw.rounded_rectangle(
            [tag_x, tag_y, tag_x + tag_w, tag_y + tag_h],
            radius=8,
            fill=(*tag_color[:3], 40) if len(tag_color) > 3 else tuple(int(c * 0.2) for c in tag_color),
            outline=tag_color,
            width=1,
        )
        draw.text((tag_x + 12, tag_y + 8), tag_text, fill=tag_color, font=tag_font)
        tag_x += tag_w + 12

    # サービス名（右下）
    draw.text(
        (OGP_WIDTH - 260, OGP_HEIGHT - 50),
        "steam-play-time.vercel.app",
        fill=COLOR_TEXT_GRAY,
        font=_get_font(20),
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


if __name__ == "__main__":
    output_path = os.path.join(
        os.path.dirname(__file__),
        "frontend", "public", "og-image.png"
    )
    print(f"Generating OGP image -> {output_path}")
    png_bytes = generate_default_og_image()
    with open(output_path, "wb") as f:
        f.write(png_bytes)
    print(f"Done. File size: {len(png_bytes):,} bytes")
