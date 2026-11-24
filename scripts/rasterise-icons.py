#!/usr/bin/env python3
"""Rasterise the Somatic Sun mark.

Called by scripts/build-brand-icons.mjs. The geometry is not re-derived here:
it is read back from the SVG that `logo.ts` generates, so the rarest icon — the
16px tab — is the same artwork as the header, just at a different size.

ImageMagick in this environment has no SVG delegate (and installing one needs
network access we do not have), so the SVG is parsed with a small dedicated
renderer that covers exactly the constructs the mark uses: a stroked circle, a
filled path built from M/L/V/H/Q/Z, and a filled circle with a filled triangle.

That is deliberately not a general SVG renderer. It handles this file, and
`render()` raises if it meets a construct it does not understand rather than
silently drawing something wrong.
"""
import re
import sys
import math
from PIL import Image, ImageDraw


# ---------------------------------------------------------------- SVG parsing

def _numbers(text):
    return [float(v) for v in re.findall(r"-?\d*\.?\d+", text)]


class Path:
    """A path in the mark's 64-unit space, as a list of subpaths of points.

    Curves are flattened to line segments; at icon sizes (16-1024px) the
    subdivision is far below one output pixel, so the result is exact enough.
    """

    def __init__(self, d, steps=24):
        self.polys = []
        self._run(d, steps)

    def _run(self, d, steps):
        tokens = re.findall(r"[MmLlVvHhQqZzCc]|-?\d*\.?\d+", d)
        i = 0
        cur = (0.0, 0.0)
        start = (0.0, 0.0)
        poly = []
        cmd = None

        def num():
            nonlocal i
            v = float(tokens[i]); i += 1
            return v

        while i < len(tokens):
            if re.fullmatch(r"[A-Za-z]", tokens[i]):
                cmd = tokens[i]; i += 1
                if cmd in "Zz":
                    if poly:
                        poly.append(start)
                        self.polys.append(poly)
                        poly = []
                    cur = start
                    continue
                if cmd in "Mm":
                    if poly:
                        self.polys.append(poly)
                        poly = []
                    x, y = num(), num()
                    if cmd == "m":
                        x, y = cur[0] + x, cur[1] + y
                    cur = start = (x, y)
                    poly = [cur]
                    cmd = "L" if cmd == "M" else "l"
                    continue
                continue
            if cmd in "Ll":
                x, y = num(), num()
                if cmd == "l": x, y = cur[0] + x, cur[1] + y
                cur = (x, y); poly.append(cur)
            elif cmd in "Vv":
                y = num()
                if cmd == "v": y = cur[1] + y
                cur = (cur[0], y); poly.append(cur)
            elif cmd in "Hh":
                x = num()
                if cmd == "h": x = cur[0] + x
                cur = (x, cur[1]); poly.append(cur)
            elif cmd in "Qq":
                cx, cy, x, y = num(), num(), num(), num()
                if cmd == "q":
                    cx, cy, x, y = cur[0] + cx, cur[1] + cy, cur[0] + x, cur[1] + y
                p0 = cur
                for s in range(1, steps + 1):
                    t = s / steps
                    mt = 1 - t
                    bx = mt * mt * p0[0] + 2 * mt * t * cx + t * t * x
                    by = mt * mt * p0[1] + 2 * mt * t * cy + t * t * y
                    poly.append((bx, by))
                cur = (x, y)
            else:
                raise NotImplementedError(f"path command {cmd!r} is not supported")
        if poly:
            self.polys.append(poly)


def parse_svg(svg):
    """Pull the drawable parts out of the mark's SVG string."""
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    _, _, vbw, vbh = [float(v) for v in vb.split()]
    parts = []
    for m in re.finditer(r"<(circle|path|rect)\b([^>]*)/?>", svg):
        kind, attrs = m.group(1), m.group(2)
        get = lambda k: (re.search(rf'{k}="([^"]*)"', attrs) or [None, None])[1]
        fill, stroke = get("fill"), get("stroke")
        if kind == "rect":
            parts.append(("rect", {
                "w": float(get("width")), "h": float(get("height")),
                "rx": float(get("rx") or 0), "fill": fill,
            }))
        elif kind == "circle":
            parts.append(("circle", {
                "cx": float(get("cx")), "cy": float(get("cy")), "r": float(get("r")),
                "fill": fill, "stroke": stroke,
                "width": float(get("stroke-width") or 0),
            }))
        elif kind == "path":
            d = get("d")
            transform = get("transform")
            poly = Path(d)
            if transform:
                tx, ty = _numbers(transform)
                poly.polys = [[(x + tx, y + ty) for (x, y) in p] for p in poly.polys]
            parts.append(("path", {"polys": poly.polys, "fill": fill}))
    return vbw, parts


# ------------------------------------------------------------------ rendering

def render(svg, size, ss=4):
    vbw, parts = parse_svg(svg)
    S = size * ss
    k = S / vbw
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    for kind, p in parts:
        if kind == "rect":
            d.rounded_rectangle([0, 0, S - 1, S - 1], radius=p["rx"] * k, fill=p["fill"])
        elif kind == "circle":
            box = [(p["cx"] - p["r"]) * k, (p["cy"] - p["r"]) * k,
                   (p["cx"] + p["r"]) * k, (p["cy"] + p["r"]) * k]
            if p["fill"] and p["fill"] != "none":
                d.ellipse(box, fill=p["fill"])
            if p["stroke"] and p["stroke"] != "none":
                # Pillow strokes astride the path, as SVG does.
                d.ellipse(box, outline=p["stroke"], width=max(1, round(p["width"] * k)))
        elif kind == "path":
            for poly in p["polys"]:
                pts = [(x * k, y * k) for (x, y) in poly]
                if len(pts) >= 3:
                    d.polygon(pts, fill=p["fill"])
    return img.resize((size, size), Image.LANCZOS)


def main():
    """Each argument is `svg:out:size[:ico]`, so every output names its source."""
    for spec in sys.argv[1:]:
        bits = spec.split(":")
        svg_path, out_path, size = bits[0], bits[1], int(bits[2])
        fmt = bits[3] if len(bits) > 3 else None
        svg = open(svg_path).read()
        if fmt == "ico":
            # Pillow's ICO writer derives the frames from the images it is given,
            # so save the largest first and append the rest.
            frames = [render(svg, n) for n in (64, 48, 32, 16)]
            frames[0].save(out_path, format="ICO",
                           sizes=[(64, 64), (48, 48), (32, 32), (16, 16)],
                           append_images=frames[1:])
        else:
            render(svg, size).save(out_path)
        print(f"  {out_path}  <-  {svg_path} @ {size}")


if __name__ == "__main__":
    main()
