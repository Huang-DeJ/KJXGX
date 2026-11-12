#!/usr/bin/env python3
"""source-lab 截图像素验证：非空白、红/蓝波列、模式特征色存在"""
import sys
from PIL import Image

def analyze(path, expect):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    total = w * h
    nonblack = red = blue = orange = lime = white = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r + g + b > 60:
                nonblack += 1
            if r > 150 and g < 110 and b < 110:
                red += 1
            if b > 150 and r < 120 and g < 150:
                blue += 1
            if r > 200 and 120 < g < 200 and b < 90:
                orange += 1
            if g > 190 and r < 190 and b < 170 and g > r:
                lime += 1
            if r > 230 and g > 230 and b > 230:
                white += 1
    n = (w // 2) * (h // 2)
    print(f"{path}  {w}x{h}")
    print(f"  非黑 {nonblack/n:.1%}  红 {red}  蓝 {blue}  橙 {orange}  lime {lime}  白 {white}")
    ok = nonblack / n > 0.02 and red > 30 and blue > 30
    missing = []
    if "orange" in expect and orange < 5:
        missing.append("orange")
    if "lime" in expect and lime < 3:
        missing.append("lime")
    if "white" in expect and white < 20:
        missing.append("white")
    if missing:
        ok = False
    print(f"  => {'PASS' if ok else 'FAIL ' + str(missing)}")
    return ok

if __name__ == "__main__":
    path, expect = sys.argv[1], sys.argv[2].split(",") if len(sys.argv) > 2 else []
    sys.exit(0 if analyze(path, expect) else 1)
