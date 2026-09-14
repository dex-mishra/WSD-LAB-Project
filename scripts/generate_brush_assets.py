#!/usr/bin/env python3
"""
Procedural Calligraphy Paint Brush & Ink Splatter Asset Generator
Generates alpha-masked paint brush strokes and ink splatters for web and gaming cutscenes.
"""

import math
import random
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Pillow not installed. Run: pip install Pillow")
    exit(0)

OUTPUT_DIR = Path(__file__).resolve().parent / "brush_assets"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def draw_brush_stroke(draw: ImageDraw.ImageDraw, start, end, color=(255, 255, 255, 255), width=45, bristles=20):
    x0, y0 = start
    x1, y1 = end
    dist = math.hypot(x1 - x0, y1 - y0)
    steps = int(dist * 2)

    for b in range(bristles):
        offset = (b / max(1, bristles - 1) - 0.5) * width
        alpha = int(color[3] * (0.3 + 0.7 * random.random()))
        stroke_color = (color[0], color[1], color[2], alpha)

        pts = []
        for s in range(steps):
            t = s / max(1, steps - 1)
            # Add bezier-like arc and bristle jitter
            arc = math.sin(t * math.pi) * 35
            jitter = (random.random() - 0.5) * 4
            px = x0 + t * (x1 - x0) + offset * math.cos(t * math.pi * 0.5) + jitter
            py = y0 + t * (y1 - y0) + arc + offset * math.sin(t * math.pi * 0.5) + jitter
            pts.append((px, py))

        if len(pts) > 1:
            draw.line(pts, fill=stroke_color, width=max(2, int(width / bristles * 1.5)))


def generate_slash_texture(filename="brush_slash.png", size=(1200, 400), color=(245, 158, 11, 240)):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Main stroke
    draw_brush_stroke(draw, (40, 280), (1160, 100), color=color, width=70, bristles=26)
    # Secondary counter-bristles
    draw_brush_stroke(draw, (80, 295), (1120, 115), color=(34, 197, 94, 200), width=40, bristles=16)

    # Ink splatters
    cx, cy = size[0] // 2, size[1] // 2
    for _ in range(80):
        angle = random.random() * math.pi * 2
        r = random.gauss(100, 70)
        sx = cx + math.cos(angle) * r
        sy = cy + math.sin(angle) * r
        rad = random.uniform(1.5, 6.0)
        draw.ellipse([sx - rad, sy - rad, sx + rad, sy + rad], fill=color)

    blurred = img.filter(ImageFilter.SMOOTH_MORE)
    out_path = OUTPUT_DIR / filename
    blurred.save(out_path, "PNG")
    print(f"Generated brush asset: {out_path}")


if __name__ == "__main__":
    generate_slash_texture("harvest_brush_slash.png", color=(34, 197, 94, 245))
    generate_slash_texture("wheat_brush_slash.png", color=(245, 158, 11, 245))
    generate_slash_texture("frost_brush_slash.png", color=(56, 189, 248, 245))
    print("All brush assets generated successfully.")
