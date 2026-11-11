#!/usr/bin/env python3
"""像素级验证：3D 剖视场景与 relief 场景是否渲染出红峰/蓝谷/黑环/围栏"""
from PIL import Image

def analyze(path, label):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    px = img.load()
    red = blue = warm_glow = dark = 0
    # 采样统计
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r > 150 and g < 110 and b < 110:
                red += 1
            elif b > 150 and r < 110 and g < 150:
                blue += 1
            elif r > 200 and g > 140 and b > 90 and b < 180:
                warm_glow += 1
            elif r < 14 and g < 16 and b < 20:
                dark += 1
    total = (w // 2) * (h // 2)
    print(f"== {label} ({w}x{h}) ==")
    print(f"  红色像素(峰壳/围栏正区): {red}  ({red/total*100:.2f}%)")
    print(f"  蓝色像素(谷壳/围栏负区): {blue}  ({blue/total*100:.2f}%)")
    print(f"  暖色辉光: {warm_glow}  ({warm_glow*100/total:.2f}%)")
    print(f"  深色背景/黑环: {dark}  ({dark/total*100:.2f}%)")
    ok = red > 300 and blue > 300
    print(f"  红蓝双壳同时存在: {'PASS' if ok else 'FAIL'}")
    return ok

ok1 = analyze("/tmp/render/scene3d.png", "3D 剖视场景")
ok2 = analyze("/tmp/render/relief.png", "relief 起伏面场景")
print("\n总体:", "PASS" if (ok1 and ok2) else "FAIL")
