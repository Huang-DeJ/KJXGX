#!/usr/bin/env python3
"""天线模式区域检查：canvas 内杆区（x 0.10-0.23, y 0.2-0.8）应有
   - 离子：暗灰蓝小圈（sum 450-650, b>=r）
   - 自由电子：亮蓝白辉点（sum>650, b>230）
   - 两端电荷团：红/蓝辉光"""
import sys
from PIL import Image

path, x, y, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
im = Image.open(path).convert("RGB").crop((x, y, x + w, y + h))
px = im.load()
W, H = im.size
rod_x0, rod_x1 = int(W * 0.08), int(W * 0.25)
rod_y0, rod_y1 = int(H * 0.18), int(H * 0.82)
ions = electrons = red = blue = 0
for yy in range(rod_y0, rod_y1):
    for xx in range(rod_x0, rod_x1):
        r, g, b = px[xx, yy]
        s = r + g + b
        if 420 < s < 640 and b >= r and g > 60:
            ions += 1
        if s > 640 and b > 230 and b > r + 40:
            electrons += 1
# 全画布找两端电荷团（红/蓝辉光）
for yy in range(0, H, 2):
    for xx in range(0, W, 2):
        r, g, b = px[xx, yy]
        if r > 200 and g < 130 and b < 110:
            red += 1
        if b > 200 and r < 130:
            blue += 1
print(f"ions={ions} electrons={electrons} redGlow={red} blueGlow={blue}")
ok = ions > 25 and electrons > 8 and red > 10 and blue > 10
print("PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
