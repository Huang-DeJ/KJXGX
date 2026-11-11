"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CircleDot, LocateFixed, MoveHorizontal, Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"

/* ---------------- 物理与渲染常量 ---------------- */
const LAMBDA = 46 // 波长(px)
const K = (2 * Math.PI) / LAMBDA
const PERIOD = 1.5 // 振动周期(s) → 波速 v = λ/PERIOD
const OMEGA = (2 * Math.PI) / PERIOD
const PROBE_HAIR = 13 // 波前高亮环跟随的参考角(rad, 相对中轴)

const FONT =
  '11px ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const FONT_BOLD =
  'bold 12px ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

function packRGB(r: number, g: number, b: number) {
  return ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0) as number
}

/* 与动画②③同一套绿色 LUT，保持视觉一致 */
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

type Mode = "sphere" | "plane"

function wrapPi(a: number) {
  let x = a % (2 * Math.PI)
  if (x > Math.PI) x -= 2 * Math.PI
  if (x < -Math.PI) x += 2 * Math.PI
  return x
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  head = 6
) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  const ang = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(ang - 0.42), y2 - head * Math.sin(ang - 0.42))
  ctx.lineTo(x2 - head * Math.cos(ang + 0.42), y2 - head * Math.sin(ang + 0.42))
  ctx.closePath()
  ctx.fill()
}

function chip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color = "rgba(167,243,208,0.92)",
  align: "left" | "right" | "center" = "left"
) {
  ctx.font = FONT
  const w = ctx.measureText(text).width + 10
  const h = 17
  let rx = x
  if (align === "left") rx = x
  else if (align === "right") rx = x - w
  else rx = x - w / 2
  const ry = y - h + 2
  ctx.fillStyle = "rgba(4,9,7,0.82)"
  ctx.fillRect(rx, ry, w, h)
  ctx.fillStyle = color
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText(text, rx + 5, ry + 12.5)
}

/* ---------------- 组件 ---------------- */
export function WavefrontIntro() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [mode, setMode] = useState<Mode>("sphere")
  const [paused, setPaused] = useState(false)
  const [alignNonce, setAlignNonce] = useState(0)
  const [readout, setReadout] = useState({ p1: 0, p2: 0, dphi: 0, aligned: true })

  const sim = useRef({
    t: 0,
    last: 0,
    paused: false,
    mode: "sphere" as Mode,
    W: 0,
    H: 0,
    fieldTop: 8,
    fieldH: 0,
    sx: 0,
    sy: 0,
    img: null as ImageData | null,
    phGrid: null as Float32Array | null, // K·r（球面模式，逐像素预计算）
    ampGrid: null as Float32Array | null,
    p1x: 0.45,
    p1y: 0.28,
    p2x: 0.45,
    p2y: 0.72,
    drag: 0,
    visible: true,
    alignReq: true,
    lastSync: 0,
  })

  useEffect(() => {
    sim.current.mode = mode
  }, [mode])
  useEffect(() => {
    sim.current.paused = paused
  }, [paused])
  useEffect(() => {
    sim.current.alignReq = true
  }, [alignNonce])

  /* 探针拖拽 */
  const canvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    const s = sim.current
    return {
      x: ((e.clientX - r.left) / r.width) * s.W,
      y: ((e.clientY - r.top) / r.height) * s.H,
    }
  }
  const probePx = (which: 1 | 2) => {
    const s = sim.current
    const fx = which === 1 ? s.p1x : s.p2x
    const fy = which === 1 ? s.p1y : s.p2y
    return { x: fx * s.W, y: s.fieldTop + fy * s.fieldH }
  }
  const setProbePx = (which: 1 | 2, x: number, y: number) => {
    const s = sim.current
    const fx = Math.min(0.985, Math.max(0.015, x / s.W))
    const fy = Math.min(0.97, Math.max(0.03, (y - s.fieldTop) / s.fieldH))
    if (which === 1) {
      s.p1x = fx
      s.p1y = fy
    } else {
      s.p2x = fx
      s.p2y = fy
    }
  }
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current
    const { x, y } = canvasPos(e)
    const q1 = probePx(1)
    const q2 = probePx(2)
    const d1 = Math.hypot(x - q1.x, y - q1.y)
    const d2 = Math.hypot(x - q2.x, y - q2.y)
    s.drag = d1 <= d2 ? 1 : 2
    if (Math.min(d1, d2) > 26) {
      // 点空白处：把较近的探针移过来
      setProbePx(s.drag, x, Math.max(s.fieldTop + 4, Math.min(s.fieldTop + s.fieldH - 4, y)))
    } else {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    e.currentTarget.style.cursor = "grabbing"
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current
    const { x, y } = canvasPos(e)
    if (!s.drag) {
      const q1 = probePx(1)
      const q2 = probePx(2)
      const near =
        Math.hypot(x - q1.x, y - q1.y) < 26 || Math.hypot(x - q2.x, y - q2.y) < 26
      e.currentTarget.style.cursor = near ? "grab" : "crosshair"
      return
    }
    setProbePx(s.drag, x, Math.max(s.fieldTop + 4, Math.min(s.fieldTop + s.fieldH - 4, y)))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    sim.current.drag = 0
    e.currentTarget.style.cursor = "default"
  }

  /* 主动画 */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const s = sim.current
    let raf = 0

    const resize = () => {
      const w = Math.max(320, Math.min(1100, Math.round(canvas.clientWidth)))
      const h = Math.max(280, Math.round(canvas.clientHeight))
      if (w !== s.W || h !== s.H) {
        s.W = w
        s.H = h
        s.fieldTop = 8
        s.fieldH = h - 8 - 78
        s.sx = Math.round(0.095 * w)
        s.sy = s.fieldTop + s.fieldH / 2
        s.img = ctx.createImageData(w, s.fieldH)
        // 球面波相位/振幅网格（只在尺寸变化时重建）
        const n = w * s.fieldH
        const ph = new Float32Array(n)
        const am = new Float32Array(n)
        let idx = 0
        for (let y = s.fieldTop; y < s.fieldTop + s.fieldH; y++) {
          for (let x = 0; x < w; x++, idx++) {
            const dx = x - s.sx
            const dy = y - s.sy
            const r = Math.hypot(dx, dy)
            ph[idx] = K * r
            am[idx] = Math.min(1, Math.sqrt(170 / Math.max(r, 30)))
          }
        }
        s.phGrid = ph
        s.ampGrid = am
        s.alignReq = true
      }
      canvas.width = s.W
      canvas.height = s.H
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(
      (es) => {
        s.visible = es[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 }
    )
    io.observe(canvas)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - s.last) / 1000 || 0.016)
      s.last = now
      if (!s.paused) s.t += dt
      const t = s.t
      const W = s.W
      const H = s.H
      if (!s.visible) return

      const fieldTop = s.fieldTop
      const fieldH = s.fieldH
      const sx = s.sx
      const sy = s.sy
      const v = LAMBDA / PERIOD // 波速 px/s
      const rC = ((v * t) % LAMBDA + LAMBDA) % LAMBDA // 最新波峰半径

      /* ====== 「放到同一波前」请求 ====== */
      if (s.alignReq) {
        s.alignReq = false
        if (s.mode === "sphere") {
          const target = 0.42 * W
          const m = Math.round((v * t - target) / LAMBDA)
          const rF = v * t - m * LAMBDA
          const ang = 0.26
          const px1 = sx + rF * Math.cos(-ang)
          const py1 = sy + rF * Math.sin(-ang)
          const px2 = sx + rF * Math.cos(ang)
          const py2 = sy + rF * Math.sin(ang)
          setProbePx(1, px1, py1)
          setProbePx(2, px2, py2)
        } else {
          const target = 0.45 * W
          const m = Math.round((v * t - target) / LAMBDA)
          const xF = v * t - m * LAMBDA
          setProbePx(1, xF, s.fieldTop + 0.3 * fieldH)
          setProbePx(2, xF, s.fieldTop + 0.7 * fieldH)
        }
      }

      /* ====== 波场渲染 ====== */
      const img = s.img
      if (img) {
        const buf = new Uint32Array(img.data.buffer)
        const w2 = OMEGA * t
        if (s.mode === "sphere" && s.phGrid && s.ampGrid) {
          const n = s.phGrid.length
          const ph = s.phGrid
          const am = s.ampGrid
          for (let i = 0; i < n; i++) {
            const vv = Math.cos(ph[i] - w2) * am[i]
            buf[i] = LUT[((vv + 1) * 127.5) | 0]
          }
        } else {
          const rowW = W
          for (let y = 0; y < fieldH; y++) {
            const off = y * rowW
            for (let x = 0; x < W; x++) {
              const vv = Math.cos(K * x - w2)
              buf[off + x] = LUT[((vv + 1) * 127.5) | 0]
            }
          }
        }
        ctx.putImageData(img, 0, fieldTop)
      }

      /* ====== 裁剪到波场区域 ====== */
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, fieldTop, W, fieldH)
      ctx.clip()

      const q1 = probePx(1)
      const q2 = probePx(2)

      if (s.mode === "sphere") {
        /* 波峰同心圆(微弱) */
        ctx.strokeStyle = "rgba(255,255,255,0.08)"
        ctx.lineWidth = 1
        const maxR = Math.hypot(W - sx, fieldH / 2) + LAMBDA
        for (let r = rC; r < maxR; r += LAMBDA) {
          if (r < 2) continue
          ctx.beginPath()
          ctx.arc(sx, sy, r, 0, 2 * Math.PI)
          ctx.stroke()
        }

        /* 高亮:离 P₁ 最近的波峰波前 */
        const r1 = Math.hypot(q1.x - sx, q1.y - sy)
        const mStar = Math.round((v * t - r1) / LAMBDA)
        const rH = v * t - mStar * LAMBDA
        if (rH > 6) {
          ctx.strokeStyle = "rgba(52,211,153,0.95)"
          ctx.lineWidth = 1.8
          ctx.setLineDash([7, 5])
          ctx.beginPath()
          ctx.arc(sx, sy, rH, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.setLineDash([])
          const la = -0.55
          const lx = sx + rH * Math.cos(la)
          const ly = sy + rH * Math.sin(la)
          chip(
            ctx,
            Math.min(W - 150, lx + 8),
            Math.max(fieldTop + 18, ly - 6),
            "波前：这一环上相位全同",
            "rgba(110,231,183,0.95)"
          )
          /* 波速箭头 */
          const ga = 0.62
          const ax = sx + rH * Math.cos(ga)
          const ay = sy + rH * Math.sin(ga)
          ctx.strokeStyle = "rgba(110,231,183,0.8)"
          ctx.fillStyle = "rgba(110,231,183,0.8)"
          ctx.lineWidth = 1.4
          drawArrow(ctx, ax, ay, ax + 16 * Math.cos(ga), ay + 16 * Math.sin(ga), 5)
          ctx.font = FONT
          ctx.textAlign = "left"
          ctx.fillText("v", ax + 18 * Math.cos(ga), ay + 18 * Math.sin(ga) + 3)
        }

        /* 光源 */
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18)
        glow.addColorStop(0, "rgba(167,243,208,0.95)")
        glow.addColorStop(1, "rgba(167,243,208,0)")
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(sx, sy, 18, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = "#d1fae5"
        ctx.beginPath()
        ctx.arc(sx, sy, 3.4, 0, 2 * Math.PI)
        ctx.fill()
        chip(ctx, sx + 22, sy + 34, "点光源 S", "rgba(209,250,229,0.95)")

        /* 光线（⊥波前） */
        ctx.strokeStyle = "rgba(255,255,255,0.30)"
        ctx.fillStyle = "rgba(255,255,255,0.30)"
        ctx.lineWidth = 1
        ctx.setLineDash([5, 6])
        drawArrow(ctx, sx + 10, sy, W - 8, sy, 6)
        const ang2 = -0.5
        const l2 = Math.min(150, (sy - fieldTop - 6) / Math.sin(-ang2))
        drawArrow(
          ctx,
          sx + 10 * Math.cos(ang2),
          sy + 10 * Math.sin(ang2),
          sx + l2 * Math.cos(ang2),
          sy + l2 * Math.sin(ang2),
          5
        )
        ctx.setLineDash([])
        chip(
          ctx,
          W * 0.58,
          sy - 10,
          "光线（传播方向）⊥ 波前",
          "rgba(255,255,255,0.55)"
        )
        chip(
          ctx,
          W - 8,
          fieldTop + 18,
          "远处波前近似平直 → 平面波",
          "rgba(255,255,255,0.4)",
          "right"
        )
      } else {
        /* ---- 平面波模式 ---- */
        ctx.strokeStyle = "rgba(255,255,255,0.08)"
        ctx.lineWidth = 1
        for (let x = rC; x < W; x += LAMBDA) {
          ctx.beginPath()
          ctx.moveTo(x, fieldTop)
          ctx.lineTo(x, fieldTop + fieldH)
          ctx.stroke()
        }
        const mStar = Math.round((v * t - q1.x) / LAMBDA)
        const xH = v * t - mStar * LAMBDA
        if (xH > 6 && xH < W) {
          ctx.strokeStyle = "rgba(52,211,153,0.95)"
          ctx.lineWidth = 1.8
          ctx.setLineDash([7, 5])
          ctx.beginPath()
          ctx.moveTo(xH, fieldTop)
          ctx.lineTo(xH, fieldTop + fieldH)
          ctx.stroke()
          ctx.setLineDash([])
          chip(
            ctx,
            Math.min(W - 170, xH + 6),
            fieldTop + 18,
            "波前（平面）：这条线上相位全同",
            "rgba(110,231,183,0.95)"
          )
        }
        ctx.strokeStyle = "rgba(255,255,255,0.30)"
        ctx.fillStyle = "rgba(255,255,255,0.30)"
        ctx.lineWidth = 1
        ctx.setLineDash([5, 6])
        for (const yy of [sy - 64, sy, sy + 64]) {
          drawArrow(ctx, 6, yy, W - 8, yy, 6)
        }
        ctx.setLineDash([])
        chip(
          ctx,
          W * 0.3,
          fieldTop + 18,
          "平行光线 ⊥ 波前（远处点光源 / 激光束）",
          "rgba(255,255,255,0.55)"
        )
      }

      /* ====== 探针 ====== */
      const phiOf = (px: number, py: number) =>
        s.mode === "sphere"
          ? wrapPi(K * Math.hypot(px - sx, py - sy) - OMEGA * t)
          : wrapPi(K * px - OMEGA * t)
      const drawProbe = (
        q: { x: number; y: number },
        col: string,
        label: string,
        phi: number
      ) => {
        ctx.fillStyle = "rgba(4,9,7,0.8)"
        ctx.strokeStyle = col
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(q.x, q.y, 7.5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(q.x, q.y, 2.4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.font = FONT_BOLD
        ctx.fillStyle = col
        ctx.textAlign = "left"
        ctx.fillText(label, q.x + 11, q.y - 10)
        ctx.font = FONT
        const deg = Math.round((phi * 180) / Math.PI)
        chip(
          ctx,
          q.x + 11,
          q.y + 18,
          `φ = ${deg}°`,
          col
        )
      }
      const phi1 = phiOf(q1.x, q1.y)
      const phi2 = phiOf(q2.x, q2.y)
      const dphi = wrapPi(phi1 - phi2)
      drawProbe(q1, "rgb(52,211,153)", "P₁", phi1)
      drawProbe(q2, "rgb(251,191,36)", "P₂", phi2)

      ctx.restore()

      /* ====== 剖面图（沿中轴剖开） ====== */
      const pTop = fieldTop + fieldH + 8
      const pH = H - pTop - 10
      ctx.fillStyle = "rgba(255,255,255,0.02)"
      ctx.fillRect(0, pTop, W, pH)
      ctx.strokeStyle = "rgba(255,255,255,0.10)"
      ctx.beginPath()
      ctx.moveTo(0, pTop)
      ctx.lineTo(W, pTop)
      ctx.stroke()

      const midY = pTop + pH / 2 + 3
      const scale = pH * 0.36
      const ampAt = (r: number) =>
        s.mode === "sphere" ? Math.min(1, Math.sqrt(170 / Math.max(r, 30))) : 1

      /* 波形曲线 */
      ctx.strokeStyle = "rgba(110,231,183,0.85)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      let started = false
      for (let x = 0; x < W; x++) {
        const r = s.mode === "sphere" ? x - sx : x
        if (r < 2) continue
        const vv = Math.cos(K * r - OMEGA * t) * ampAt(r)
        const y = midY - vv * scale
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else ctx.lineTo(x, y)
      }
      ctx.stroke()

      /* 波峰圆点：波前与剖面的交点 */
      ctx.fillStyle = "#fbbf24"
      let firstDotX = -1
      let secondDotX = -1
      const startR = s.mode === "sphere" ? sx + rC : rC
      for (let x = startR; x < W; x += LAMBDA) {
        const r = s.mode === "sphere" ? x - sx : x
        if (r < 2) continue
        const y = midY - ampAt(r) * scale
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
        if (firstDotX < 0) firstDotX = x
        else if (secondDotX < 0) secondDotX = x
      }
      /* λ 标注 */
      if (firstDotX > 30 && secondDotX > 0) {
        const yA = midY - scale - 12
        ctx.strokeStyle = "rgba(251,191,36,0.75)"
        ctx.fillStyle = "rgba(251,191,36,0.75)"
        ctx.lineWidth = 1
        drawArrow(ctx, firstDotX, yA, secondDotX, yA, 4)
        drawArrow(ctx, secondDotX, yA, firstDotX, yA, 4)
        chip(ctx, (firstDotX + secondDotX) / 2, yA - 4, "λ = 相邻波前间距", "rgba(251,191,36,0.9)", "center")
      }
      ctx.font = FONT
      ctx.fillStyle = "rgba(255,255,255,0.40)"
      ctx.textAlign = "left"
      ctx.fillText("沿光线方向剖开的波形 u(x)", 8, pTop + 14)
      ctx.textAlign = "right"
      ctx.fillText("● 波峰 = 波前与这条剖面的交点", W - 8, pTop + 14)

      /* ====== React 读数(节流) ====== */
      if (now - s.lastSync > 120) {
        s.lastSync = now
        setReadout({
          p1: (phi1 * 180) / Math.PI,
          p2: (phi2 * 180) / Math.PI,
          dphi,
          aligned: Math.abs(dphi) < 0.14,
        })
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  const aligned = readout.aligned
  const modeBtn = (m: Mode, label: string, icon: React.ReactNode) => (
    <Button
      size="sm"
      variant={mode === m ? "default" : "outline"}
      className={cn(
        "h-8 gap-1.5 text-xs",
        mode === m
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "border-white/15 bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white"
      )}
      onClick={() => setMode(m)}
    >
      {icon}
      {label}
    </Button>
  )

  return (
    <Card className="overflow-hidden border-white/10 bg-zinc-900/60 shadow-2xl shadow-emerald-950/40">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-zinc-100 sm:text-xl">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              动画 ① · 什么是波前？（等相位面）
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              点光源 S 一圈圈向外发光。<b className="text-zinc-200">每一圈亮环（波峰）都是一个波前：
              同一时刻、振动步调（相位）完全相同的点连成的线</b>，三维空间里是曲面。
              <b className="text-zinc-200">拖动两个探针 P₁、P₂</b>（或点按钮把它们放到同一波前上），
              读一读它们的相位：同一波前上的点，相位永远相同。
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "播放" : "暂停"}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? "播放" : "暂停"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/70">
          <canvas
            ref={canvasRef}
            className="block h-[320px] w-full touch-none sm:h-[380px]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[auto_auto_1fr] md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {modeBtn("sphere", "点光源 · 球面波前", <CircleDot className="h-3.5 w-3.5" />)}
            {modeBtn("plane", "远处看 · 平面波前", <MoveHorizontal className="h-3.5 w-3.5" />)}
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setAlignNonce((n) => n + 1)}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            把 P₁、P₂ 放到同一波前上
          </Button>
          <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
            <span className="rounded bg-white/5 px-2 py-1 font-mono text-[11px] text-emerald-300">
              φ₁ = {Math.round(readout.p1)}°
            </span>
            <span className="rounded bg-white/5 px-2 py-1 font-mono text-[11px] text-amber-300">
              φ₂ = {Math.round(readout.p2)}°
            </span>
            <span className="rounded bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-200">
              Δφ = {readout.dphi.toFixed(2)} rad
            </span>
            <Badge
              variant="outline"
              className={cn(
                "px-2.5 py-1 text-xs",
                aligned
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-300"
              )}
            >
              {aligned ? "φ₁ ≈ φ₂ —— 同一波前上，相位全同" : "Δφ 恒定 —— 在不同波前上，但仍步调锁定"}
            </Badge>
          </div>
        </div>

        <p className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-300">
          注意两件事：① 波前不是固定的一圈点——它以波速 v 向外跑，新的波前不断在光源处诞生；
          ② 但只要光源是<b className="text-zinc-100">一个点</b>，无论探针拖到哪里，
          <b className="text-zinc-100">Δφ 都恒定不变</b>——点源的波前处处&ldquo;整齐划一&rdquo;，这就是完全的空间相干。
          那么 Δφ 什么时候会&ldquo;乱跳&rdquo;？当光源变成一大片（扩展光源）——
          <a href="#demo" className="text-emerald-300 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-200">
            看动画②
          </a>。
        </p>
      </CardContent>
    </Card>
  )
}
