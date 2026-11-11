import * as THREE from "three"

/* 球面波可视化共享工具：红蓝分色 LUT、探针示波器（峰/零/谷打点）、相位事件分类、辉光纹理 */

/* ---------------- 红=波峰(+E₀) / 黑=过零(E=0) / 蓝=波谷(−E₀) 分色表 ---------------- */

interface DivergingStop {
  p: number
  c: [number, number, number]
}

/* p: 0.0 = E=−1（波谷）… 0.5 = E=0 … 1.0 = E=+1（波峰） */
const DIVERGING_STOPS: DivergingStop[] = [
  { p: 0.0, c: [72, 118, 250] },
  { p: 0.4, c: [16, 22, 44] },
  { p: 0.5, c: [5, 6, 10] },
  { p: 0.6, c: [36, 16, 16] },
  { p: 1.0, c: [255, 96, 56] },
]

function sampleStops(v: number): [number, number, number] {
  let s0 = DIVERGING_STOPS[0]
  let s1 = DIVERGING_STOPS[DIVERGING_STOPS.length - 1]
  for (let k = 0; k < DIVERGING_STOPS.length - 1; k++) {
    if (v >= DIVERGING_STOPS[k].p && v <= DIVERGING_STOPS[k + 1].p) {
      s0 = DIVERGING_STOPS[k]
      s1 = DIVERGING_STOPS[k + 1]
      break
    }
  }
  const f = (v - s0.p) / Math.max(1e-6, s1.p - s0.p)
  return [
    Math.round(s0.c[0] + (s1.c[0] - s0.c[0]) * f),
    Math.round(s0.c[1] + (s1.c[1] - s0.c[1]) * f),
    Math.round(s0.c[2] + (s1.c[2] - s0.c[2]) * f),
  ]
}

/* 打包成 Uint32（little-endian ABGR，写入 ImageData） */
export function buildDivergingLut32(): Uint32Array {
  const lut = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = sampleStops(i / 255)
    lut[i] = ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0) as number
  }
  return lut
}

/* 展开成 Uint8Array(256×3)，用作顶点色 */
export function buildDivergingLut8(): Uint8Array {
  const lut = new Uint8Array(256 * 3)
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = sampleStops(i / 255)
    lut[i * 3] = r
    lut[i * 3 + 1] = g
    lut[i * 3 + 2] = b
  }
  return lut
}

/* ---------------- 探针示波器：E(t) 曲线 + 峰/零/谷事件打点 ---------------- */

export interface ScopeParams {
  tNow: number
  dist: number
  K: number
  omega: number
  period: number
  paused: boolean
}

const SCOPE_WIN_PERIODS = 2.2

/* 在 2D canvas 上绘制探针处 E(t)：正=红、负=蓝；
   并解析地标出「波峰壳 / 零壳（换向） / 波谷壳」恰好扫过探针的时刻。返回当前场值。 */
export function drawFieldScope(canvas: HTMLCanvasElement, p: ScopeParams): number {
  const ctx = canvas.getContext("2d")
  const eNow = Math.cos(p.K * p.dist - p.omega * p.tNow)
  if (!ctx) return eNow
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const cw = canvas.clientWidth
  const ch = canvas.clientHeight
  if (cw < 10 || ch < 10) return eNow
  const bw = Math.round(cw * dpr)
  const bh = Math.round(ch * dpr)
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw
    canvas.height = bh
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)

  const mid = ch * 0.5
  const amp = ch * 0.5 - 13
  const win = SCOPE_WIN_PERIODS * p.period
  const phase0 = p.K * p.dist
  const eOf = (tau: number) => Math.cos(phase0 - p.omega * tau)

  /* 参考线 +1 / 0 / −1 */
  ctx.lineWidth = 1
  ctx.strokeStyle = "rgba(255,120,80,0.18)"
  ctx.beginPath()
  ctx.moveTo(0, mid - amp)
  ctx.lineTo(cw, mid - amp)
  ctx.stroke()
  ctx.strokeStyle = "rgba(110,140,255,0.18)"
  ctx.beginPath()
  ctx.moveTo(0, mid + amp)
  ctx.lineTo(cw, mid + amp)
  ctx.stroke()
  ctx.strokeStyle = "rgba(255,255,255,0.16)"
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(0, mid)
  ctx.lineTo(cw, mid)
  ctx.stroke()
  ctx.setLineDash([])

  /* 半周期刻度线（随时间向左滚动） */
  const halfP = p.period / 2
  ctx.strokeStyle = "rgba(255,255,255,0.05)"
  ctx.beginPath()
  for (let k = Math.ceil((p.tNow - win) / halfP); k <= Math.floor(p.tNow / halfP); k++) {
    const x = (1 - (p.tNow - k * halfP) / win) * cw
    if (x >= 0 && x <= cw) {
      ctx.moveTo(x, 4)
      ctx.lineTo(x, ch - 4)
    }
  }
  ctx.stroke()

  /* E(t) 曲线：正红 / 负蓝 */
  ctx.lineWidth = 2
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  const dim = p.paused ? 0.55 : 1
  let prevE = eOf(p.tNow - win)
  for (let x = 2; x <= cw; x += 2) {
    const e = eOf(p.tNow - (1 - x / cw) * win)
    ctx.strokeStyle = e >= 0 ? `rgba(255,106,61,${dim})` : `rgba(96,138,255,${dim})`
    ctx.beginPath()
    ctx.moveTo(x - 2, mid - prevE * amp)
    ctx.lineTo(x, mid - e * amp)
    ctx.stroke()
    prevE = e
  }

  /* 事件打点：峰（φ=2πn）· 零（φ=π/2+nπ）· 谷（φ=π+2πn） */
  const markX = (tau: number) => (1 - (p.tNow - tau) / win) * cw
  const tMin = p.tNow - win
  ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "center"

  /* 波峰壳扫过：最高点 */
  for (
    let n = Math.ceil((phase0 - p.omega * p.tNow) / (2 * Math.PI));
    n <= Math.floor((phase0 - p.omega * tMin) / (2 * Math.PI));
    n++
  ) {
    const x = markX((phase0 - 2 * Math.PI * n) / p.omega)
    if (x < 2 || x > cw - 2) continue
    ctx.fillStyle = "rgba(255,150,110,0.95)"
    ctx.beginPath()
    ctx.arc(x, mid - amp, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(255,150,110,0.85)"
    ctx.fillText("峰", x, mid - amp - 4)
  }
  /* 波谷壳扫过：最低点 */
  for (
    let n = Math.ceil((phase0 - Math.PI - p.omega * p.tNow) / (2 * Math.PI));
    n <= Math.floor((phase0 - Math.PI - p.omega * tMin) / (2 * Math.PI));
    n++
  ) {
    const x = markX((phase0 - Math.PI - 2 * Math.PI * n) / p.omega)
    if (x < 2 || x > cw - 2) continue
    ctx.fillStyle = "rgba(150,175,255,0.95)"
    ctx.beginPath()
    ctx.arc(x, mid + amp, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(150,175,255,0.85)"
    ctx.fillText("谷", x, mid + amp + 10)
  }
  /* 零壳扫过：过零点（方向切换处） */
  for (
    let m = Math.ceil((phase0 - Math.PI / 2 - p.omega * p.tNow) / Math.PI);
    m <= Math.floor((phase0 - Math.PI / 2 - p.omega * tMin) / Math.PI);
    m++
  ) {
    const x = markX((phase0 - Math.PI / 2 - Math.PI * m) / p.omega)
    if (x < 2 || x > cw - 2) continue
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.fillRect(x - 0.75, mid - 5, 1.5, 10)
    ctx.fillStyle = "rgba(255,255,255,0.55)"
    ctx.fillText("零", x, mid + 16)
  }

  /* 「现在」端点：颜色 = 此刻正负 */
  ctx.fillStyle = eNow >= 0 ? "rgba(255,120,74,0.95)" : "rgba(120,155,255,0.95)"
  ctx.beginPath()
  ctx.arc(cw - 2, mid - eNow * amp, 4, 0, Math.PI * 2)
  ctx.fill()

  /* 角标 */
  ctx.fillStyle = "rgba(255,255,255,0.3)"
  ctx.font = "10px ui-monospace, SFMono-Regular, monospace"
  ctx.textAlign = "left"
  ctx.fillText("+1", 4, mid - amp + 10)
  ctx.fillText("-1", 4, mid + amp + 2)
  return eNow
}

/* ---------------- 此刻什么壳正扫过探针？ ---------------- */

export type PhaseKind = "peak" | "zero" | "trough" | "rise" | "fall"

export function classifyPhase(e: number, rising: boolean): { kind: PhaseKind; text: string } {
  if (e > 0.92) return { kind: "peak", text: "波峰壳正扫过 · 场值最高" }
  if (e < -0.92) return { kind: "trough", text: "波谷壳正扫过 · 场值最低" }
  if (Math.abs(e) < 0.14) return { kind: "zero", text: "零壳正扫过 · E = 0（方向切换）" }
  if (e > 0)
    return rising
      ? { kind: "rise", text: "+ 方向增大 · 波峰壳逼近" }
      : { kind: "fall", text: "+ 方向减小 · 波峰壳远去" }
  return rising
    ? { kind: "rise", text: "− 方向减小 · 波谷壳远去" }
    : { kind: "fall", text: "− 方向增大 · 波谷壳逼近" }
}

/* ---------------- 点光源暖色辉光纹理 ---------------- */

export function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas")
  c.width = 128
  c.height = 128
  const gctx = c.getContext("2d")
  if (gctx) {
    const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, "rgba(255,240,228,0.95)")
    grad.addColorStop(0.28, "rgba(255,170,120,0.5)")
    grad.addColorStop(1, "rgba(255,150,90,0)")
    gctx.fillStyle = grad
    gctx.fillRect(0, 0, 128, 128)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  return tex
}
