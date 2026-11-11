"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Pause, Play, Sun, Zap, Star } from "lucide-react"
import { cn } from "@/lib/utils"

/* ---------------- 物理/布局常量 ---------------- */
const H_FIXED = 360 // 仿真分辨率(竖直)
const F0 = 1 / 40 // d=1 时条纹周期 40px
const K_EMIT = 61 // 源点数(带高斯权重)
const VS = 2.2 // 光源宽度→视觉高度比例
const INDIV = [4, 15, 27, 40, 53] // 展示单源点条纹的 5 个源点
const INDIV_COLORS = [
  "rgba(52,211,153,0.55)",
  "rgba(45,212,191,0.5)",
  "rgba(251,191,36,0.55)",
  "rgba(253,164,116,0.5)",
  "rgba(163,230,53,0.5)",
]
const CANVAS_FONT =
  '11px ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

type Pattern = { I: Float32Array; Iind: Float32Array[]; V: number }

function computePattern(w: number, d: number, H: number): Pattern {
  const I = new Float32Array(H)
  const Iind = INDIV.map(() => new Float32Array(H))
  const as = new Float64Array(K_EMIT)
  const ss = new Float64Array(K_EMIT)
  let asum = 0
  for (let j = 0; j < K_EMIT; j++) {
    const u = -1 + (2 * j) / (K_EMIT - 1)
    as[j] = Math.exp((-u * u) / 2) // 高斯亮度权重(σ=w/2)
    ss[j] = u * (w / 2)
    asum += as[j]
  }
  for (let y = 0; y < H; y++) {
    const yoff = y - H / 2
    let acc = 0
    for (let j = 0; j < K_EMIT; j++) {
      const ph = Math.PI * F0 * d * (yoff + ss[j])
      const c = Math.cos(ph)
      const v = c * c
      acc += (as[j] * v) / asum
      for (let k = 0; k < INDIV.length; k++) {
        if (INDIV[k] === j) Iind[k][y] = v
      }
    }
    I[y] = acc
  }
  // 条纹可见度 V=(Imax−Imin)/(Imax+Imin),取中央 76% 区域
  let mx = -Infinity
  let mn = Infinity
  for (let y = Math.floor(H * 0.12); y < Math.floor(H * 0.88); y++) {
    if (I[y] > mx) mx = I[y]
    if (I[y] < mn) mn = I[y]
  }
  return { I, Iind, V: (mx - mn) / Math.max(1e-6, mx + mn) }
}

function verdictOfV(V: number) {
  if (V >= 0.75) return "coherent" as const
  if (V >= 0.35) return "partial" as const
  return "incoherent" as const
}
const VERDICT_TEXT = {
  coherent: "清晰条纹 · 双缝处空间相干",
  partial: "条纹变淡 · 部分相干",
  incoherent: "条纹消失 · 空间不相干",
}
const VERDICT_CLASS = {
  coherent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  partial: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  incoherent: "bg-rose-500/15 text-rose-300 border-rose-500/40",
}

/* ---------------- 组件 ---------------- */
export function DoubleSlitLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bandCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [w, setW] = useState(8) // 光源宽度(卡通单位)
  const [d, setD] = useState(1) // 缝间距(倍率)
  const [showIndiv, setShowIndiv] = useState(false)
  const [paused, setPaused] = useState(false)

  const pattern = useMemo(() => computePattern(w, d, H_FIXED), [w, d])
  const patternRef = useRef<Pattern | null>(null)

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  const stRef = useRef({
    W: 0,
    H: 360,
    visible: true,
    t: 0,
    last: 0,
    paused: false,
    showIndiv: false,
  })

  useEffect(() => {
    stRef.current.paused = paused
  }, [paused])
  useEffect(() => {
    stRef.current.showIndiv = showIndiv
  }, [showIndiv])

  /* 光屏色带(1px 宽的竖条,按强度着色) */
  useEffect(() => {
    if (!bandCanvasRef.current) bandCanvasRef.current = document.createElement("canvas")
    const bc = bandCanvasRef.current
    bc.width = 1
    bc.height = H_FIXED
    const bctx = bc.getContext("2d")
    if (!bctx) return
    const img = bctx.createImageData(1, H_FIXED)
    const buf = new Uint32Array(img.data.buffer)
    for (let y = 0; y < H_FIXED; y++) {
      const v = Math.max(0, Math.min(1, pattern.I[y] * 1.15))
      const r = Math.round(8 + 240 * v)
      const g = Math.round(14 + 241 * v)
      const b = Math.round(12 + 226 * v)
      buf[y] = ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0) as number
    }
    bctx.putImageData(img, 0, 0)
  }, [pattern])

  /* 动画渲染 */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const st = stRef.current
    let raf = 0

    const resize = () => {
      st.W = Math.max(320, Math.min(1100, Math.round(canvas.clientWidth)))
      st.H = Math.max(260, Math.round(canvas.clientHeight))
      canvas.width = st.W
      canvas.height = st.H
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(
      (es) => {
        st.visible = es[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 }
    )
    io.observe(canvas)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - st.last) / 1000 || 0.016)
      st.last = now
      if (!st.visible) return
      if (!st.paused) st.t += dt
      const t = st.t
      const W = st.W
      const H = st.H
      const p = patternRef.current

      // 背景
      ctx.fillStyle = "#070b09"
      ctx.fillRect(0, 0, W, H)

      const xSrc = 0.09 * W
      const xSlit = 0.42 * W
      const xScr = 0.8 * W
      const yc = H / 2
      const dVis = 20 * d
      const gap = 5

      /* ---- 光源 ---- */
      const barH = Math.max(6, w * VS)
      const glow = ctx.createRadialGradient(xSrc, yc, 2, xSrc, yc, Math.max(30, barH * 0.9))
      glow.addColorStop(0, "rgba(52,211,153,0.22)")
      glow.addColorStop(1, "rgba(52,211,153,0)")
      ctx.fillStyle = glow
      ctx.fillRect(xSrc - 70, 0, 140, H)
      for (let j = 0; j < K_EMIT; j++) {
        const u = -1 + (2 * j) / (K_EMIT - 1)
        const sy = yc + u * (w / 2) * VS
        ctx.globalAlpha = 0.25 + 0.75 * Math.exp((-u * u) / 2)
        ctx.fillStyle = "#6ee7b7"
        ctx.beginPath()
        ctx.arc(xSrc, sy, 1.6, 0, 2 * Math.PI)
        ctx.fill()
      }
      // 涟漪
      ctx.strokeStyle = "rgba(110,231,183,0.25)"
      ctx.lineWidth = 1
      const RIP = [0, 7, 15, 23, 30, 38, 46, 53, 60]
      for (const j of RIP) {
        const u = -1 + (2 * j) / (K_EMIT - 1)
        const sy = yc + u * (w / 2) * VS
        for (let n = 0; n < 3; n++) {
          const r = ((t * 34 + n * 26 + j * 5) % 78) + 4
          ctx.globalAlpha = 0.32 * (1 - r / 82)
          ctx.beginPath()
          ctx.arc(xSrc, sy, r, -0.85, 0.85)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = "rgba(167,243,208,0.85)"
      ctx.font = CANVAS_FONT
      ctx.textAlign = "center"
      ctx.fillText("光源", xSrc, H - 10)

      /* ---- 双缝 ---- */
      ctx.fillStyle = "#3f3f46"
      const slitTop = 22
      const slitBot = H - 12
      const y1 = yc - dVis
      const y2 = yc + dVis
      ctx.fillRect(xSlit - 2.5, slitTop, 5, Math.max(0, y1 - gap / 2 - slitTop))
      ctx.fillRect(xSlit - 2.5, y1 + gap / 2, 5, Math.max(0, y2 - y1 - gap))
      ctx.fillRect(xSlit - 2.5, y2 + gap / 2, 5, Math.max(0, slitBot - y2 - gap / 2))
      for (const sy of [y1, y2]) {
        const gg = ctx.createRadialGradient(xSlit, sy, 0, xSlit, sy, 10)
        gg.addColorStop(0, "rgba(167,243,208,0.8)")
        gg.addColorStop(1, "rgba(167,243,208,0)")
        ctx.fillStyle = gg
        ctx.beginPath()
        ctx.arc(xSlit, sy, 10, 0, 2 * Math.PI)
        ctx.fill()
      }
      ctx.fillStyle = "rgba(228,228,231,0.75)"
      ctx.fillText("双缝 S₁S₂", xSlit, 12)

      /* ---- 出射光线(动画虚线) ---- */
      ctx.strokeStyle = "rgba(110,231,183,0.15)"
      ctx.lineWidth = 1
      ctx.setLineDash([5, 9])
      ctx.lineDashOffset = -(t * 60) % 14
      const NROWS = 16
      for (const sy of [y1, y2]) {
        for (let i = 0; i < NROWS; i++) {
          const fy = 16 + (i / (NROWS - 1)) * (H - 32)
          ctx.beginPath()
          ctx.moveTo(xSlit + 4, sy)
          ctx.lineTo(xScr, fy)
          ctx.stroke()
        }
      }
      ctx.setLineDash([])

      /* ---- 光屏 ---- */
      if (bandCanvasRef.current) {
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(bandCanvasRef.current, 0, 0, 1, H_FIXED, xScr, 0, 12, H)
      }

      /* ---- 强度曲线 ---- */
      const x0 = xScr + 20
      const sx = Math.max(42, 0.13 * W)
      ctx.strokeStyle = "rgba(255,255,255,0.18)"
      ctx.beginPath()
      ctx.moveTo(x0, 12)
      ctx.lineTo(x0, H - 12)
      ctx.stroke()
      ctx.setLineDash([2, 4])
      ctx.strokeStyle = "rgba(255,255,255,0.1)"
      ctx.beginPath()
      ctx.moveTo(x0, 12)
      ctx.lineTo(x0 + sx, 12)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.textAlign = "left"
      ctx.fillText("I=1", x0 + sx - 20, 10)
      ctx.fillText("0", x0 - 9, H - 16)

      const scaleY = H / H_FIXED
      const plotRow = (arr: Float32Array) => {
        ctx.beginPath()
        for (let y = 0; y < H; y++) {
          const v = arr[Math.min(H_FIXED - 1, Math.round(y / scaleY))]
          const px = x0 + v * sx
          if (y === 0) ctx.moveTo(px, y)
          else ctx.lineTo(px, y)
        }
      }
      if (st.showIndiv) {
        ctx.lineWidth = 1
        for (let k = 0; k < INDIV_COLORS.length; k++) {
          ctx.strokeStyle = INDIV_COLORS[k]
          plotRow(p.Iind[k])
          ctx.stroke()
        }
      }
      ctx.lineWidth = 3.5
      ctx.strokeStyle = "rgba(52,211,153,0.35)"
      plotRow(p.I)
      ctx.stroke()
      ctx.lineWidth = 1.6
      ctx.strokeStyle = "#eafff5"
      plotRow(p.I)
      ctx.stroke()

      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.textAlign = "right"
      ctx.fillText("光屏强度 I(y)", x0 + sx, H - 4)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [d])

  const V = pattern.V
  const vd = verdictOfV(V)
  const sourceLabel = w <= 1 ? "理想点源" : w > 50 ? "扩展光源" : "小光源"

  return (
    <Card className="overflow-hidden border-white/10 bg-zinc-900/60 shadow-2xl shadow-emerald-950/40">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-zinc-100 sm:text-xl">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              动画 ③ · 杨氏双缝：空间相干性的检验场
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              光源向右发光，穿过双缝 S₁、S₂，在光屏上形成条纹。<b className="text-zinc-200">拖动「光源宽度」</b>，
              条纹会被逐渐抹平；<b className="text-zinc-200">再缩小「缝间距」</b>，条纹又回来了——
              这就是相干宽度的含义。
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
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/70">
            <canvas ref={canvasRef} className="block h-[300px] w-full sm:h-[360px]" />
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <div>
              <div className="text-xs text-zinc-500">条纹可见度 V =(Imax−Imin)/(Imax+Imin)</div>
              <div className="mt-1 font-mono text-4xl font-bold text-emerald-300">
                {V.toFixed(2)}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-200",
                    vd === "coherent"
                      ? "bg-emerald-400"
                      : vd === "partial"
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  )}
                  style={{ width: `${Math.max(2, V * 100)}%` }}
                />
              </div>
              <Badge variant="outline" className={cn("mt-3 px-2.5 py-1 text-xs", VERDICT_CLASS[vd])}>
                {VERDICT_TEXT[vd]}
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>条纹周期</span>
                <span className="font-mono text-zinc-200">{(40 / d).toFixed(0)}px</span>
              </div>
              <div className="flex justify-between">
                <span>光源宽度</span>
                <span className="font-mono text-zinc-200">{sourceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>源点条纹错位</span>
                <span className="font-mono text-zinc-200">{(w * d).toFixed(0)}px</span>
              </div>
              <p className="pt-1 leading-relaxed text-zinc-500">
                错位超过约半个条纹周期，条纹就被抹平。缝距越大，对光源大小越敏感。
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label className="text-zinc-300">光源宽度（点源 ↔ 扩展光源）</Label>
              <span className="font-mono text-emerald-300">{sourceLabel}</span>
            </div>
            <Slider
              value={[w]}
              min={0}
              max={80}
              step={1}
              onValueChange={(v) => setW(v[0])}
              aria-label="光源宽度"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label className="text-zinc-300">缝间距 d（越大越容易失去条纹）</Label>
              <span className="font-mono text-emerald-300">×{d.toFixed(2)}</span>
            </div>
            <Slider
              value={[d]}
              min={0.35}
              max={2}
              step={0.05}
              onValueChange={(v) => setD(v[0])}
              aria-label="缝间距"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">预设：</span>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setW(3)
              setD(1.4)
            }}
          >
            <Zap className="h-3.5 w-3.5" />激光笔
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setW(72)
              setD(1)
            }}
          >
            <Sun className="h-3.5 w-3.5" />太阳光
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setW(2)
              setD(1.9)
            }}
          >
            <Star className="h-3.5 w-3.5" />恒星光
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Switch id="indiv" checked={showIndiv} onCheckedChange={setShowIndiv} />
            <Label htmlFor="indiv" className="cursor-pointer text-xs text-zinc-400">
              显示每个源点各自的条纹
            </Label>
          </div>
        </div>
        <p className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-300">
          提示：勾选「显示每个源点各自的条纹」可以看清机制——<b className="text-zinc-100">每个源点自己都能产生清晰条纹，只是彼此错位</b>；
          光源越宽，错位越大，大量错位条纹平均之后光屏上只剩一片均匀亮。这就是&ldquo;没有空间相干性&rdquo;的后果。
        </p>
      </CardContent>
    </Card>
  )
}
