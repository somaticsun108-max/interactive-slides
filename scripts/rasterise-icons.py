#!/usr/bin/env python3
"""Rasterise the brand mark.

Called by scripts/build-brand-icons.mjs. ImageMagick here cannot read SVG (no
rsvg delegate), so the shapes are drawn directly with Pillow — which also means
the sun's gold gradient can be reproduced exactly as the artwork has it.

Writes:
  src/app/favicon.ico           16/32/48/64, legacy browsers
  src/app/apple-icon.png        180px square, for iOS home screens
  src/app/icon.png              512px, fallback for browsers without SVG icons
  public/brand/sun-{1024,512,180}.png

The single-colour lockup is only ever used as SVG (public/brand/sun-mono-*.svg),
drawn by build-brand-icons.mjs from the same geometry as the React component, so
there is no raster copy to drift.
"""
import math
from PIL import Image, ImageDraw

NAVY = (18, 37, 61, 255)
GOLD_L, GOLD_M, GOLD_D = (240, 208, 137), (212, 154, 48), (169, 118, 27)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gold_at(t):
    """Three-stop brushed-metal gradient, same stops as GOLD_GRADIENT."""
    t = min(1.0, max(0.0, t))
    return lerp(GOLD_L, GOLD_M, t * 2) if t < 0.5 else lerp(GOLD_M, GOLD_D, (t - 0.5) * 2)


def sun(size, ground=True, ss=4):
    """Gold disc with 12 rays, optionally on a rounded navy ground."""
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if ground:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=NAVY)
    cx = cy = S / 2
    disc_r = S * 0.172

    # The disc, filled with the gold gradient through an elliptical mask.
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse([cx - disc_r, cy - disc_r, cx + disc_r, cy + disc_r], fill=255)
    grad = Image.new("RGBA", (S, S))
    gd = ImageDraw.Draw(grad)
    for x in range(S):
        gd.line([(x, 0), (x, S)], fill=gold_at(x / (S - 1)) + (255,))
    img.paste(grad, (0, 0), mask)

    # Rays: every third one longer and thicker, as in the artwork.
    for i in range(12):
        ang = i * math.pi / 6
        inner = S * 0.272
        outer = S * (0.42 if i % 3 == 0 else 0.365)
        w = int(S * (0.052 if i % 3 == 0 else 0.037))
        x1, y1 = cx + math.cos(ang) * inner, cy + math.sin(ang) * inner
        x2, y2 = cx + math.cos(ang) * outer, cy + math.sin(ang) * outer
        col = gold_at(x2 / S) + (255,)
        d.line([(x1, y1), (x2, y2)], fill=col, width=max(2, w))
        for px, py in ((x1, y1), (x2, y2)):
            d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=col)

    return img.resize((size, size), Image.LANCZOS)


# The .ico carries its own sizes so a legacy browser never upscales.
sun(16).save("src/app/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
             append_images=[sun(32), sun(48), sun(64)])
sun(512).save("src/app/icon.png")
sun(180).convert("RGB").save("src/app/apple-icon.png")
sun(1024).save("public/brand/sun-1024.png")
sun(512).save("public/brand/sun-512.png")
sun(180).save("public/brand/sun-180.png")
print("  rasterised app icons and brand PNGs")
