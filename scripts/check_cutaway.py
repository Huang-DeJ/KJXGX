#!/usr/bin/env python3
"""剖视开/关像素对比：关=完整球壳（更多壳像素），开=剖开见内部（可见围栏与内部层）"""
from PIL import Image, ImageChops

off = Image.open("/tmp/render/cut-off.png").convert("RGB")
on = Image.open("/tmp/render/cut-on.png").convert("RGB")

def count(img):
    px = img.load()
    w, h = img.size
    red = blue = 0
    for y in range(120, 500, 2):
        for x in range(114, 1166, 2):
            r, g, b = px[x, y]
            if r > 150 and g < 110 and b < 110:
                red += 1
            elif b > 150 and r < 110:
                blue += 1
    return red, blue

r_off, b_off = count(off)
r_on, b_on = count(on)
print(f"剖视关: 红 {r_off}, 蓝 {b_off}")
print(f"剖视开: 红 {r_on}, 蓝 {b_on}")
diff = ImageChops.difference(off, on)
bbox = diff.getbbox()
import numpy as np
arr = np.asarray(diff).mean()
print(f"两图差异区域 bbox: {bbox}, 平均差异: {arr:.2f}")
ok = (abs(r_off - r_on) + abs(b_off - b_on) > 200) or (bbox is not None and arr > 1)
print("剖视开关产生视觉变化:", "PASS" if ok else "FAIL")
