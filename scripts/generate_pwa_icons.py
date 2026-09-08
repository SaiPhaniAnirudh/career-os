"""
Career OS — PWA & Android Icon Generator
Generates high-resolution PNG icons for PWA, iOS, and Android Capacitor.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont


def create_gradient_icon(size: int, is_maskable: bool = False, corner_radius_ratio: float = 0.2) -> Image.Image:
    # Create image with RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Padding for maskable safe area
    pad = int(size * 0.1) if is_maskable else 0
    box_size = size - (pad * 2)

    radius = int(box_size * corner_radius_ratio) if not is_maskable else 0

    # Draw diagonal linear gradient from #667eea (102, 126, 234) to #764ba2 (118, 75, 162)
    start_col = (102, 126, 234)
    end_col = (118, 75, 162)

    gradient = Image.new("RGBA", (size, size))

    for y in range(size):
        for x in range(size):
            t = (x + y) / (2.0 * size)
            r = int(start_col[0] + (end_col[0] - start_col[0]) * t)
            g = int(start_col[1] + (end_col[1] - start_col[1]) * t)
            b = int(start_col[2] + (end_col[2] - start_col[2]) * t)
            gradient.putpixel((x, y), (r, g, b, 255))

    # Create mask for rounded corners
    mask = Image.new("L", (size, size), 0)
    m_draw = ImageDraw.Draw(mask)
    if is_maskable:
        m_draw.rectangle([0, 0, size, size], fill=255)
    else:
        m_draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=255)

    img.paste(gradient, (0, 0), mask)

    # Draw centered "C" logo
    font_size = int(box_size * 0.55)
    font = None
    for font_name in ["arialbd.ttf", "arial.ttf", "segui.ttf", "DejaVuSans-Bold.ttf"]:
        try:
            font = ImageFont.truetype(font_name, font_size)
            break
        except Exception:
            pass

    if font is None:
        font = ImageFont.load_default()

    draw = ImageDraw.Draw(img)
    text = "C"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (size - text_w) // 2 - bbox[0]
    text_y = (size - text_h) // 2 - bbox[1]

    # Draw subtle drop shadow
    shadow_offset = max(2, int(size * 0.015))
    draw.text((text_x, text_y + shadow_offset), text, fill=(0, 0, 0, 90), font=font)
    draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)

    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)

    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable.png", 512, True),
        ("apple-touch-icon.png", 180, False),
        ("favicon-32.png", 32, False),
    ]

    for filename, size, maskable in targets:
        filepath = os.path.join(out_dir, filename)
        icon = create_gradient_icon(size, is_maskable=maskable)
        icon.save(filepath, "PNG")
        print(f"Generated {filename} ({size}x{size})")

    print("\nAll PWA icons generated successfully!")


if __name__ == "__main__":
    main()
