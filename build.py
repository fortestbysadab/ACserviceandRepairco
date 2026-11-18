#!/usr/bin/env python3
"""
Build script — Sheetal AC Service & Repair.

Concatenates the editable sources in src/ into a single self-contained
index.html at the repo root:

  * src/part1.html  head, design-system CSS, icon sprite, header, hero, rail
  * src/part2.html  all page sections + footer
  * src/part3.html  cart drawer, booking modal, toast, all JavaScript
  * src/more.css    section-level CSS, merged into the <head> at build time

Every image in assets/ is resized, converted to WebP and inlined as a base64
data URI, so the built file has zero network dependencies and works offline,
on Vercel, on Render, or straight from disk.

Usage:
    python3 build.py
"""
import base64
import io
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
ASSETS = ROOT / "assets"
OUT = ROOT / "index.html"

PARTS = ("part1.html", "part2.html", "part3.html")

# template token -> (source file, max width, webp quality)
IMAGES = {
    "hero":    ("hero.jpg",         1280, 80),
    "foam":    ("foam-jet.jpg",      980, 76),
    "gas":     ("gas-refill.jpg",    980, 76),
    "install": ("installation.jpg",  980, 76),
    "repair":  ("repair.jpg",        980, 76),
    "team":    ("team.jpg",          920, 78),
    "window":  ("window-ac.jpg",     900, 76),
    "spares":  ("spares.jpg",       1000, 76),
    "living":  ("living-room.jpg",  1280, 78),
}


def data_uri(name: str, max_w: int, quality: int) -> str:
    """Resize an asset and return it as an inline WebP data URI."""
    im = Image.open(ASSETS / name).convert("RGB")
    if im.width > max_w:
        height = round(im.height * max_w / im.width)
        im = im.resize((max_w, height), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> None:
    html = "".join((SRC / part).read_text(encoding="utf-8") for part in PARTS)

    # merge the extra stylesheet into the head <style> block
    html = html.replace(
        "</style>",
        (SRC / "more.css").read_text(encoding="utf-8") + "\n</style>",
        1,
    )

    image_bytes = 0
    for token, (filename, width, quality) in IMAGES.items():
        uri = data_uri(filename, width, quality)
        image_bytes += len(uri)
        html = html.replace("{{%s}}" % token, uri)

    OUT.write_text(html, encoding="utf-8")
    print(
        f"built index.html — {OUT.stat().st_size / 1024:,.0f} KB "
        f"(images {image_bytes / 1024:,.0f} KB base64)"
    )


if __name__ == "__main__":
    main()
