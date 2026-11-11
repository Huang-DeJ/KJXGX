"use client"

import { useEffect, useRef, useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Pause, Play, RotateCcw, WandSparkles } from "lucide-react"
import { cn } from "@/lib/utils"

/* ---------------- 物理与渲染常量 ---------------- */
const NC = 40 // 叠加的平面波分量数(模拟扩展光源)
const LAMBDA = 42 // 波长(px)
const K = (2 * Math.PI) / LAMBDA
const OMEGA = (2 * Math.PI) / 0.9 // 振动周期 0.9s
const MAX_DKY = (2 * Math.PI) / 44 // theta=1 时波矢横向弥散 → 相干宽度约 44px
const PROBE_X_FRAC = 0.72 // 探针所在的横向位置
const AUTO_PERIOD = 16 // 自动演示周期(s)

function packRGB(r: number, g: number, b: number) {
  return ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0) as number
}

function buildLut(): Uint32Array {
  const lut = new Uint32Array(256)
  const stops: { p: number; c: [number, number, number] }[] = [
    { p: 0.0, c: [8, 13, 11] },
    { p: 0.55, c: [20, 124, 88] },
    { p: 0.88, c: [96, 226, 166] },
    { p: 1.0, c: [228, 255, 240] },
  ]
  for (let i = 0; i < 256; i++) {
    const v = i / 255
    let s0 = stops[0]
    let s1 = stops[stops.length - 1]
    for (let k = 0; k < stops.length - 1; k++) {
      if (v >= stops[k].p && v <= stops[k + 1].p) {
        s0 = stops[k]
        s1 = stops[k + 1]
        break
      }
    }
    const f = (v - s0.p) / Math.max(1e-6, s1.p - s0.p)
    lut[i] = packRGB(
      Math.round(s0.c[0] + (s1.c[0] - s0.c[0]) * f),
      Math.round(s0.c[1] + (s1.c[1] - s0.c[1]) * f),
      Math.round(s0.c[2] + (s1.c[2] - s0.c[2]) * f)
    )
  }
  return lut
}
const LUT = buildLut()

const CANVAS_FONT =
  '11px ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const BOLD_FONT =
  'bold 12px ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

type Sample = { t: number; e1: number; e2: number; dphi: number }
type Verdict = "coherent" | "partial" | "incoherent"

function verdictOf(instability: number): Verdict {
  if (instability < 0.12) return "coherent"
  if (instability < 0.4) return "partial"
  return "incoherent"
}

const VERDICT_TEXT: Record<Verdict, string> = {
  coherent: "P₁·P₂ 空间相干 — 相位差恒定",
  partial: "部分相干 — 相位差缓慢漂移",
  incoherent: "空间不相干 — 相位差随机乱跳",
}
const VERDICT_CLASS: Record<Verdict, string> = {
  coherent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  partial: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  incoherent: "bg-rose-500/15 text-rose-300 border-rose-500/40",
}

/* ---------------- 组件 ---------------- */
export function WavefrontCoherence() {
  const waveRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const [theta, setTheta] = useState(0)
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [note, setNote] = useState<string>(
    "自动演示中：光源正从「点源」缓缓变成「扩展光源」，盯住下方 Δφ 曲线…"
  )
  const [readout, setReadout] = useState({
    instability: 0,
    sepPx: 0,
    cohPx: Number.POSITIVE_INFINITY,
    dphi: 0,
  })

  const sim = useRef({
    t: 0,
    last: 0,
    phases: new Float64Array(NC),
    ky: new Float64Array(NC),
    rowCr: new Float64Array(300),
    rowSi: new Float64Array(300),
    colCos: new Float64Array(1100),
    colSin: new Float64Array(1100),
    y1: 0.32,
    y2: 0.68,
    hist: [] as Sample[],
    theta: 0,
    auto: true,
    paused: false,
    drag: 0,
    W: 0,
    H: 300,
    img: null as ImageData | null,
    visible: true,
    lastSync: 0,
  })

  /* 状态同步到仿真(theta 无条件写回:自动演示循环写回的是同值,天然幂等) */
  useEffect(() => {
    sim.current.theta = theta
  }, [theta])
  useEffect(() => {
    sim.current.auto = auto
  }, [auto])
  useEffect(() => {
    sim.current.paused = paused
  }, [paused])
  useEffect(() => {
    const s = sim.current
    for (let j = 0; j < NC; j++) {
      s.phases[j] = Math.random() * Math.PI * 2
    }
    s.hist = []
  }, [resetNonce])

  /* 拖动探针 */
  const canvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    const s = sim.current
    return {
      x: ((e.clientX - r.left) / r.width) * s.W,
      y: ((e.clientY - r.top) / r.height) * s.H,
    }
  }
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current
    const { x, y } = canvasPos(e)
    const xp = PROBE_X_FRAC * s.W
    const d1 = Math.hypot(x - xp, y - s.y1 * s.H)
    const d2 = Math.hypot(x - xp, y - s.y2 * s.H)
    if (Math.min(d1, d2) > 26) return
    s.drag = d1 <= d2 ? 1 : 2
    setAuto(false)
    setNote("")
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.style.cursor = "grabbing"
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current
    if (!s.drag) {
      const { x, y } = canvasPos(e)
      const xp = PROBE_X_FRAC * s.W
      const near =
        Math.hypot(x - xp, y - s.y1 * s.H) < 26 ||
        Math.hypot(x - xp, y - s.y2 * s.H) < 26
      e.currentTarget.style.cursor = near ? "grab" : "default"
      return
    }
    const { y } = canvasPos(e)
    const frac = Math.min(1 - 16 / s.H, Math.max(16 / s.H, y / s.H))
    if (s.drag === 1) s.y1 = frac
    else s.y2 = frac
  }
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    sim.current.drag = 0
    e.currentTarget.style.cursor = "default"
  }

  /* 主动画 */
  useEffect(() => {
    const wave = waveRef.current
    const chart = chartRef.current
    if (!wave || !chart) return
    const wctx = wave.getContext("2d")
    const cctx = chart.getContext("2d")
    if (!wctx || !cctx) return

    const s = sim.current
    let raf = 0

    const resize = () => {
      const w = Math.max(320, Math.min(1100, Math.round(wave.clientWidth)))
      const h = Math.max(220, Math.round(wave.clientHeight))
      if (w !== s.W || h !== s.H) {
        s.W = w
        s.H = h
        s.rowCr = new Float64Array(h)
        s.rowSi = new Float64Array(h)
        s.colCos = new Float64Array(w)
        s.colSin = new Float64Array(w)
        s.img = wctx.createImageData(w, h)
      }
      wave.width = s.W
      wave.height = s.H
      chart.width = Math.max(320, Math.round(chart.clientWidth))
      chart.height = Math.max(120, Math.round(chart.clientHeight))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wave)
    ro.observe(chart)

    const io = new IntersectionObserver(
      (entries) => {
        s.visible = entries[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 }
    )
    io.observe(wave)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - s.last) / 1000 || 0.016)
      s.last = now

      /* ====== 物理积分(始终运行,开销低) ====== */
      if (!s.paused) {
        s.t += dt
        // 相位扩散:扩展光源各点独立发光,相对相位快速随机游走
        const step = Math.sqrt(dt) * 2.4
        for (let j = 0; j < NC; j++) {
          s.phases[j] += (Math.random() * 2 - 1) * step
        }
        if (s.auto) {
          s.theta = 0.5 - 0.5 * Math.cos((2 * Math.PI * s.t) / AUTO_PERIOD)
        }
        const spread = s.theta * MAX_DKY
        for (let j = 0; j < NC; j++) {
          s.ky[j] = spread * (j / (NC - 1) - 0.5)
        }
        const H = s.H
        for (let y = 0; y < H; y++) {
          let cr = 0
          let si = 0
          for (let j = 0; j < NC; j++) {
            const a = s.phases[j] + s.ky[j] * y
            cr += Math.cos(a)
            si += Math.sin(a)
          }
          s.rowCr[y] = cr
          s.rowSi[y] = si
        }
      }
      const t = s.t
      const W = s.W
      const H = s.H

      /* ====== 探针读数(始终) ====== */
      const xp = Math.round(PROBE_X_FRAC * W)
      const y1p = s.y1 * H
      const y2p = s.y2 * H
      const r1 = Math.max(0, Math.min(H - 1, Math.round(y1p)))
      const r2 = Math.max(0, Math.min(H - 1, Math.round(y2p)))
      const A1 = Math.hypot(s.rowCr[r1], s.rowSi[r1]) + 1e-6
      const A2 = Math.hypot(s.rowCr[r2], s.rowSi[r2]) + 1e-6
      const ph1 = K * xp - OMEGA * t
      const cosPh = Math.cos(ph1)
      const sinPh = Math.sin(ph1)
      const e1 = (cosPh * s.rowCr[r1] - sinPh * s.rowSi[r1]) / A1
      const e2 = (cosPh * s.rowCr[r2] - sinPh * s.rowSi[r2]) / A2
      const phi1 = Math.atan2(s.rowSi[r1], s.rowCr[r1])
      const phi2 = Math.atan2(s.rowSi[r2], s.rowCr[r2])
      let dphi = phi2 - phi1
      while (dphi > Math.PI) dphi -= 2 * Math.PI
      while (dphi < -Math.PI) dphi += 2 * Math.PI

      if (!s.paused) {
        s.hist.push({ t, e1, e2, dphi })
        while (s.hist.length > 0 && s.hist[0].t < t - 7) s.hist.shift()
      }

      let instability = 0
      {
        let sx = 0
        let sy = 0
        let m = 0
        for (const h of s.hist) {
          if (h.t >= t - 3.5) {
            sx += Math.cos(h.dphi)
            sy += Math.sin(h.dphi)
            m++
          }
        }
        instability = m ? 1 - Math.hypot(sx, sy) / m : 0
      }
      const coh = s.theta < 0.02 ? Number.POSITIVE_INFINITY : 44 / s.theta

      /* ====== UI 同步(始终,节流) ====== */
      if (now - s.lastSync > 120) {
        s.lastSync = now
        setReadout({
          instability,
          sepPx: Math.round(Math.abs(y2p - y1p)),
          cohPx: coh,
          dphi,
        })
        if (s.auto) setTheta(s.theta)
      }

      /* ====== 高开销渲染(仅画布在视口内时) ====== */
      if (!s.visible) return
      const img = s.img
      if (!img) return
      const buf = new Uint32Array(img.data.buffer)

      for (let x = 0; x < W; x++) {
        const ph = K * x - OMEGA * t
        s.colCos[x] = Math.cos(ph)
        s.colSin[x] = Math.sin(ph)
      }
      let idx = 0
      for (let y = 0; y < H; y++) {
        const cr = s.rowCr[y]
        const si = s.rowSi[y]
        const A = Math.hypot(cr, si) + 1e-6
        const c = cr / A
        const sn = si / A
        for (let x = 0; x < W; x++) {
          const v = s.colCos[x] * c - s.colSin[x] * sn
          buf[idx + x] = LUT[((v + 1) * 127.5) | 0]
        }
        idx += W
      }
      wctx.putImageData(img, 0, 0)

      /* ---- 叠加层:光源 ---- */
      const barH = 10 + s.theta * H * 0.8
      const barTop = H / 2 - barH / 2
      const grad = wctx.createLinearGradient(0, barTop, 0, barTop + barH)
      grad.addColorStop(0, "rgba(52,211,153,0)")
      grad.addColorStop(0.5, "rgba(52,211,153,0.9)")
      grad.addColorStop(1, "rgba(52,211,153,0)")
      wctx.fillStyle = grad
      wctx.fillRect(6, barTop, 10, barH)
      for (let i = 0; i < 8; i++) {
        const fy = barTop + (0.5 + 0.42 * Math.sin(i * 2.7 + t * 3.1)) * barH
        wctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(i * 1.3 + t * 5))
        wctx.fillStyle = "#a7f3d0"
        wctx.beginPath()
        wctx.arc(11, fy, 1.6, 0, 2 * Math.PI)
        wctx.fill()
      }
      wctx.globalAlpha = 1
      wctx.fillStyle = "rgba(167,243,208,0.9)"
      wctx.font = CANVAS_FONT
      wctx.textAlign = "left"
      wctx.textBaseline = "alphabetic"
      wctx.fillText("光源 θ", 22, 16)

      /* ---- 相干宽度带(以 P₁ 为中心) ---- */
      const bandW = 26
      const bx = W - bandW - 4
      const bandH = Math.min(H - 16, coh)
      const bandTop = Math.max(8, Math.min(H - 8 - bandH, y1p - bandH / 2))
      wctx.fillStyle = coh < H * 1.6 ? "rgba(52,211,153,0.10)" : "rgba(52,211,153,0.06)"
      wctx.fillRect(bx, bandTop, bandW, bandH)
      wctx.strokeStyle = "rgba(52,211,153,0.5)"
      wctx.setLineDash([4, 3])
      wctx.beginPath()
      wctx.moveTo(bx, bandTop)
      wctx.lineTo(bx + bandW, bandTop)
      wctx.moveTo(bx, bandTop + bandH)
      wctx.lineTo(bx + bandW, bandTop + bandH)
      wctx.stroke()
      wctx.setLineDash([])
      wctx.fillStyle = "rgba(167,243,208,0.75)"
      wctx.textAlign = "right"
      const cohLabel =
        coh < H * 1.6 ? `相干宽度 ℓ≈${Math.round(coh)}px` : "相干宽度 ℓ≈∞(点源)"
      wctx.fillText(cohLabel, bx - 4, Math.max(16, bandTop - 4))

      /* ---- 波前线 ---- */
      wctx.strokeStyle = "rgba(255,255,255,0.14)"
      wctx.setLineDash([3, 5])
      wctx.beginPath()
      wctx.moveTo(xp, 8)
      wctx.lineTo(xp, H - 8)
      wctx.stroke()
      wctx.setLineDash([])
      wctx.fillStyle = "rgba(255,255,255,0.4)"
      wctx.textAlign = "left"
      wctx.fillText("同一时刻的波前(横向)", xp + 4, 14)

      /* ---- 探针 ---- */
      const drawProbe = (py: number, col: string, label: string) => {
        wctx.fillStyle = "rgba(5,10,8,0.7)"
        wctx.strokeStyle = col
        wctx.lineWidth = 2
        wctx.beginPath()
        wctx.arc(xp, py, 7, 0, 2 * Math.PI)
        wctx.fill()
        wctx.stroke()
        wctx.fillStyle = col
        wctx.beginPath()
        wctx.arc(xp, py, 2.2, 0, 2 * Math.PI)
        wctx.fill()
        wctx.font = BOLD_FONT
        wctx.fillText(label, xp + 11, py - 9)
        wctx.font = CANVAS_FONT
      }
      drawProbe(y1p, "rgb(52,211,153)", "P₁")
      drawProbe(y2p, "rgb(251,191,36)", "P₂")

      /* ---- 间距标注 ---- */
      wctx.strokeStyle = "rgba(255,255,255,0.28)"
      wctx.setLineDash([2, 3])
      wctx.beginPath()
      wctx.moveTo(xp + 26, Math.min(y1p, y2p))
      wctx.lineTo(xp + 26, Math.max(y1p, y2p))
      wctx.stroke()
      wctx.setLineDash([])
      wctx.fillStyle = "rgba(255,255,255,0.55)"
      wctx.textAlign = "left"
      wctx.fillText(
        `探针间距 ≈ ${Math.round(Math.abs(y2p - y1p))}px`,
        xp + 30,
        (y1p + y2p) / 2 + 4
      )

      /* ---- 示波器图表 ---- */
      const cw = chart.width
      const ch = chart.height
      cctx.clearRect(0, 0, cw, ch)
      const padL = 40
      const padR = 12
      const plotW = cw - padL - padR
      const eTop = 8
      const eBot = ch * 0.52
      const pTop = ch * 0.62
      const pBot = ch - 16

      cctx.strokeStyle = "rgba(255,255,255,0.08)"
      cctx.lineWidth = 1
      cctx.beginPath()
      cctx.moveTo(padL, (eTop + eBot) / 2)
      cctx.lineTo(cw - padR, (eTop + eBot) / 2)
      cctx.stroke()
      cctx.fillStyle = "rgba(255,255,255,0.35)"
      cctx.font = "10px ui-sans-serif, system-ui, sans-serif"
      cctx.textAlign = "right"
      cctx.fillText("0", padL - 5, (eTop + eBot) / 2 + 3)
      cctx.fillText("+1", padL - 5, eTop + 8)
      cctx.fillText("−1", padL - 5, eBot - 2)

      const T = 6.5
      const xAt = (ht: number) => padL + (1 - (t - ht) / T) * plotW
      const yAt = (v: number) => (eTop + eBot) / 2 - v * ((eBot - eTop) / 2) * 0.9

      const drawTrace = (key: "e1" | "e2", col: string) => {
        cctx.strokeStyle = col
        cctx.lineWidth = 1.6
        cctx.beginPath()
        let started = false
        for (const h of s.hist) {
          const x = xAt(h.t)
          if (x < padL - 2) continue
          const y = yAt(h[key])
          if (!started) {
            cctx.moveTo(x, y)
            started = true
          } else cctx.lineTo(x, y)
        }
        cctx.stroke()
      }
      drawTrace("e1", "#34d399")
      drawTrace("e2", "#fbbf24")

      /* Δφ 曲线 */
      const pyAt = (v: number) =>
        (pTop + pBot) / 2 - (v / Math.PI) * ((pBot - pTop) / 2) * 0.92
      cctx.strokeStyle = "rgba(255,255,255,0.08)"
      cctx.beginPath()
      for (const gv of [Math.PI, Math.PI / 2, 0, -Math.PI / 2, -Math.PI]) {
        const y = pyAt(gv)
        cctx.moveTo(padL, y)
        cctx.lineTo(cw - padR, y)
      }
      cctx.stroke()
      cctx.fillStyle = "rgba(255,255,255,0.35)"
      cctx.fillText("π", padL - 5, pyAt(Math.PI) + 3)
      cctx.fillText("0", padL - 5, pyAt(0) + 3)
      cctx.fillText("−π", padL - 5, pyAt(-Math.PI) + 3)

      const vd = verdictOf(instability)
      const dphiCol =
        vd === "coherent" ? "#34d399" : vd === "partial" ? "#fbbf24" : "#f43f5e"
      cctx.strokeStyle = dphiCol
      cctx.lineWidth = 1.8
      cctx.beginPath()
      let started2 = false
      let prevDphi = 0
      for (const h of s.hist) {
        const x = xAt(h.t)
        if (x < padL - 2) continue
        const y = pyAt(h.dphi)
        if (!started2) {
          cctx.moveTo(x, y)
          started2 = true
        } else if (Math.abs(h.dphi - prevDphi) > 4) {
          cctx.moveTo(x, y)
        } else cctx.lineTo(x, y)
        prevDphi = h.dphi
      }
      cctx.stroke()
      if (s.hist.length > 0) {
        const lastH = s.hist[s.hist.length - 1]
        cctx.fillStyle = dphiCol
        cctx.beginPath()
        cctx.arc(xAt(lastH.t), pyAt(lastH.dphi), 3, 0, 2 * Math.PI)
        cctx.fill()
      }
      cctx.fillStyle = "rgba(255,255,255,0.45)"
      cctx.textAlign = "left"
      cctx.fillText("P₁、P₂ 相位差 Δφ(t)  ← 过去 6.5 秒", padL, pTop - 6)
      cctx.fillText("瞬时振动 E(t)", padL, eTop + 4)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  const vd = verdictOf(readout.instability)
  const preset = (th: number, label: string) => {
    setAuto(false)
    setTheta(th)
    setNote(label)
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-zinc-900/60 shadow-2xl shadow-emerald-950/40">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-zinc-100 sm:text-xl">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              动画 ② · 波前上两点的&ldquo;默契&rdquo;
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              上图：光波向右传播（绿色亮纹是波峰）。<b className="text-zinc-200">P₁、P₂ 是同一波前（横向）上的两个探针</b>，
              可直接拖动。下图：两条曲线是它们各自的瞬时振动，红线是两者相位差 Δφ(t)。
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "播放" : "暂停"}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? "播放" : "暂停"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white"
              onClick={() => setResetNonce((n) => n + 1)}
              aria-label="重置相位"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/70">
          <canvas
            ref={waveRef}
            className="block h-[260px] w-full touch-none sm:h-[300px]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="pointer-events-none absolute right-3 bottom-2 rounded bg-black/50 px-2 py-0.5 text-[11px] text-zinc-400">
            光源角尺寸 θ = {Math.round(theta * 100)}%
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />P₁ 振动
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />P₂ 振动
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />相位差 Δφ(t)
          </span>
          <span className="ml-auto hidden text-zinc-500 sm:block">
            恒定的 Δφ = 空间相干；乱跳的 Δφ = 空间不相干
          </span>
        </div>

        <canvas
          ref={chartRef}
          className="block h-[150px] w-full rounded-xl border border-white/10 bg-black/70"
        />

        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label className="text-zinc-300">光源角尺寸 θ（滑块：点光源 ↔ 扩展光源）</Label>
              <span className="font-mono text-emerald-300">θ = {Math.round(theta * 100)}%</span>
            </div>
            <Slider
              value={[Math.round(theta * 100)]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => {
                setAuto(false)
                setTheta(v[0] / 100)
                setNote("")
              }}
              className="py-1"
              aria-label="光源角尺寸"
            />
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>理想点源 / 激光（θ→0，全波前相干）</span>
              <span>扩展光源 / 太阳（θ 大，相干宽度坍缩）</span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Badge variant="outline" className={cn("px-3 py-1 text-xs", VERDICT_CLASS[vd])}>
              {VERDICT_TEXT[vd]}
            </Badge>
            <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
              <span className="rounded bg-white/5 px-2 py-1 font-mono">
                ℓ≈{readout.cohPx < 1000 ? `${Math.round(readout.cohPx)}px` : "∞"}
              </span>
              <span className="rounded bg-white/5 px-2 py-1 font-mono">Δy≈{readout.sepPx}px</span>
              <span className="rounded bg-white/5 px-2 py-1 font-mono">
                Δφ={readout.dphi.toFixed(2)}rad
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">试试：</span>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() => preset(0, "激光：理想点光源，θ→0，整个波前步调一致。")}
          >
            激光（点源）
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() =>
              preset(0.06, "远方恒星：角尺寸极小，飞了几百光年，波前仍然高度整齐。")
            }
          >
            远方恒星
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() =>
              preset(0.8, "太阳：角尺寸约 0.53° 的扩展光源，波前碎成各跳各的碎片。")
            }
          >
            太阳
          </Button>
          <Button
            size="sm"
            variant={auto ? "default" : "outline"}
            className={cn("h-8 gap-1.5 text-xs", auto && "bg-emerald-600 hover:bg-emerald-500")}
            onClick={() => {
              setAuto((a) => !a)
              setNote(
                !auto
                  ? "自动演示中：光源正从「点源」缓缓变成「扩展光源」，盯住下方 Δφ 曲线…"
                  : ""
              )
            }}
          >
            <WandSparkles className="h-3.5 w-3.5" />
            自动演示
          </Button>
        </div>
        {note ? (
          <p className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-300">
            {note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
