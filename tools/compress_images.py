#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WIN2 공지 허브 — 슬라이드 사진 압축 도구

사용법:
    python tools/compress_images.py <슬라이드가_들어있는_폴더>

하는 일:
    폴더 안의 모든 이미지를 압축해서
        images/<이름>.jpg          (큰 이미지, 긴 변 1400px)
        images/thumbs/<이름>.jpg   (썸네일, 420px)
    로 저장하고, data.js 의 photos:[ ... ] 에 붙여넣을 블록을 출력합니다.

필요: Pillow (pip install pillow)
"""
import sys, os, re
from PIL import Image

MAX_FULL, Q_FULL = 1400, 72
MAX_THUMB, Q_THUMB = 420, 70
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def safe_name(stem):
    """파일명으로 쓸 수 있게 공백/특수문자를 _ 로. 한글은 그대로 둡니다."""
    return re.sub(r'[\\/:*?"<>|\s]+', "_", stem).strip("_") or "image"


def save(im, path, maxside, q):
    im = im.copy()
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    w, h = im.size
    s = maxside / max(w, h)
    if s < 1:
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    im.save(path, "JPEG", quality=q, optimize=True, progressive=True)
    return os.path.getsize(path)


def main():
    if len(sys.argv) < 2:
        print("사용법: python tools/compress_images.py <슬라이드_폴더>")
        sys.exit(1)
    src = sys.argv[1]
    if not os.path.isdir(src):
        print("폴더를 찾을 수 없습니다:", src)
        sys.exit(1)

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    imgdir = os.path.join(root, "images")
    thumbdir = os.path.join(imgdir, "thumbs")
    os.makedirs(thumbdir, exist_ok=True)

    files = sorted(f for f in os.listdir(src)
                   if os.path.splitext(f)[1].lower() in EXTS)
    if not files:
        print("이미지가 없습니다:", src)
        sys.exit(1)

    rows, total = [], 0
    for f in files:
        stem = os.path.splitext(f)[0]
        name = safe_name(stem)
        im = Image.open(os.path.join(src, f))
        fsz = save(im, os.path.join(imgdir, name + ".jpg"), MAX_FULL, Q_FULL)
        tsz = save(im, os.path.join(thumbdir, name + ".jpg"), MAX_THUMB, Q_THUMB)
        total += fsz + tsz
        rows.append((stem, name))
        print(f"  {f}  ->  images/{name}.jpg ({fsz // 1024}KB) + thumb ({tsz // 1024}KB)")

    print(f"\n총 {len(rows)}장, {total / 1024 / 1024:.2f} MB\n")
    print("아래 블록을 data.js 의  photos: [ ... ]  안에 붙여넣으세요:\n")
    for stem, name in rows:
        cap = stem.replace('"', '\\"')
        print(f'    {{ caption: "{cap}", src: "images/{name}.jpg", thumb: "images/thumbs/{name}.jpg" }},')


if __name__ == "__main__":
    main()
