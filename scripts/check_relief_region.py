#!/usr/bin/env python3
"""精确裁剪 relief 画布区域做精细直方图，判断表面是否渲染"""
from PIL import Image

img = Image.open("/tmp/render/relief4.png").convert("RGB")
# 画布在截图中的区域: x 114-1166, y 78-498
crop = img.crop((114, 78, 1166, 498))
w, h = crop.size
px = crop.load()

# 分四个象限+中心采样亮度分布
buckets = {"<20": 0, "20-60": 0, "60-120": 0, "120-200": 0, ">200": 0}
max_rgb = 0
redish = blueish = 0
for y in range(0, h, 2):
    for x in range(0, w, 2):
        r, g, b = px[x, y]
        mx = max(r, g, b)
        if mx > max_rgb:
            max_rgb = mx
        if mx < 20:
            buckets["<20"] += 1
        elif mx < 60:
            buckets["20-60"] += 1
        elif mx < 120:
            buckets["60-120"] += 1
        elif mx < 200:
            buckets["120-200"] += 1
        else:
            buckets[">200"] += 1
        if r > 90 and r > b * 1.5 and g < r * 0.7:
            redish += 1
        if b > 90 and b > r * 1.5 and g < b * 0.9:
            blueish += 1

total = (w // 2) * (h // 2)
print(f"crop {w}x{h}, 采样 {total}")
for k, v in buckets.items():
    print(f"  亮度 {k}: {v} ({v/total*100:.1f}%)")
print(f"最亮通道值: {max_rgb}")
print(f"偏红像素: {redish}, 偏蓝像素: {blueish}")

# 同时检查 3D 截图的画布区做对照
img2 = Image.open("/tmp/render/scene3d.png").convert("RGB")
crop2 = img2.crop((114, 78, 1166, 498))
px2 = crop2.load()
r2 = b2 = 0
for y in range(0, crop2.size[1], 2):
    for x in range(0, crop2.size[0], 2):
        r, g, b = px2[x, y]
        if r > 150 and g < 110 and b < 110:
            r2 += 1
        if b > 150 and r < 110:
            b2 += 1
print(f"\n对照-3D画布区: 红 {r2}, 蓝 {b2}")
