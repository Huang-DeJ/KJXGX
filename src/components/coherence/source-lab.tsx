"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Atom, Pause, Play, RadioTower, RotateCcw, Sparkles } from "lucide-react"

/* ---------------- 动画④：走进光源内部 —— 天线 / 原子·热光 / 激光 ----------------
   与全页同一套红蓝语言：红 = +E、蓝 = −E；
   波列向右跑 = 以 c 外传的"源历史"（呼应 3D 动画的壳队列）。
   两块示波器是检验工具：A = 单个发射者的 E(t)，B = 叠加后的总场 ΣE。 */

const TAU = Math.PI * 2
const PERIOD = 1.6 /* 振荡周期（s，视觉节奏） */
const OMEGA = TAU / PERIOD
const LAM_PX = 92 /* 波列视觉波长（px） */
const C_PX = LAM_PX / PERIOD /* 波列外传速度（px/s） */
const SR = 90 /* 历史采样率（样本/模拟秒） */
const SPAN = 16 /* 历史保留时长（s） */
const WIN = 2.75 * PERIOD /* 示波器窗口 */
const C_PH = 150 /* 腔内光子速度（px/s） */

type Mode = "antenna" | "thermal" | "laser"
type LaserPhase = "pump" | "run" | "steady"

interface TAtom {
  segT: number
  segLen: number
  gapT: number
  gapLen: number
  phase: number
  on: boolean
}
interface Photon {
  x: number
  v: number
}
interface Flash {
  i: number /* 原子索引；-1 = 输出口 */
  t0: number
  kind: "clone" | "emit" | "pump"
}

function randSeg() {
  return (3 + Math.random() * 3) * PERIOD
}
function randGap() {
  return (0.4 + Math.random() * 1.2) * PERIOD
}
function newAtom(): TAtom {
  const segLen = randSeg()
  return {
    segT: Math.random() * segLen * 0.5,
    segLen,
    gapT: 0,
    gapLen: randGap(),
    phase: Math.random() * TAU,
    on: true,
  }
}
/* 波列包络：起振/结束各 0.3 周期平滑 */
function atomEnv(a: TAtom): number {
  if (!a.on) return 0
  const ramp = Math.min(a.segT / (0.3 * PERIOD), (a.segLen - a.segT) / (0.3 * PERIOD), 1)
  return Math.max(0, ramp)
}

interface SimState {
  t: number
  visible: boolean
  paused: boolean
  speed: number
  mode: Mode
  atoms: TAtom[]
  laser: {
    phase: LaserPhase
    pt: number
    pumpT: number
    seedT: number
    excited: boolean[]
    photons: Photon[]
    flashes: Flash[]
    emissions: number
    outAmp: number
  }
  lastPhase: LaserPhase
  e1: number
  eB: number
  pendingMark: boolean
  nextT: number
  hT: number[]
  hA: number[]
  hB: number[]
  hM: number[]
}

function freshLaser() {
  return {
    phase: "pump" as LaserPhase,
    pt: 0,
    pumpT: 0,
    seedT: 0,
    excited: [false, false, false, false, false],
    photons: [] as Photon[],
    flashes: [] as Flash[],
    emissions: 0,
    outAmp: 0,
  }
}

function resetSim(s: SimState, mode: Mode, nAtoms = 3) {
  s.t = 0
  s.nextT = 0
  s.mode = mode
  s.atoms = Array.from({ length: nAtoms }, newAtom)
  s.laser = freshLaser()
  s.lastPhase = "pump"
  s.e1 = 0
  s.eB = 0
  s.pendingMark = false
  s.hT = []
  s.hA = []
  s.hB = []
  s.hM = []
}

/* 激光腔几何：原子 5 个均布两镜之间 */
function laserXL(cw: number) {
  return 0.07 * cw
}
function laserXR(cw: number) {
  return 0.31 * cw
}
function laserAtomsX(cw: number): number[] {
  const xl = laserXL(cw)
  const xr = laserXR(cw)
  return [0, 1, 2, 3, 4].map((i) => xl + ((i + 0.5) * (xr - xl)) / 5)
}

/* ---------------- 物理推进 ---------------- */
function advance(s: SimState, dt: number, cw: number) {
  s.t += dt
  if (s.mode === "antenna") {
    s.e1 = Math.cos(OMEGA * s.t)
    s.eB = s.e1
  } else if (s.mode === "thermal") {
    for (const a of s.atoms) {
      if (a.on) {
        a.segT += dt
        if (a.segT >= a.segLen) {
          a.on = false
          a.gapT = 0
          a.gapLen = randGap()
        }
      } else {
        a.gapT += dt
        if (a.gapT >= a.gapLen) {
          a.on = true
          a.segT = 0
          a.segLen = randSeg()
          a.phase = Math.random() * TAU
          if (a === s.atoms[0]) s.pendingMark = true
        }
      }
    }
    s.e1 = atomEnv(s.atoms[0]) * Math.cos(OMEGA * s.t + s.atoms[0].phase)
    let sum = 0
    for (const a of s.atoms) sum += atomEnv(a) * Math.cos(OMEGA * s.t + a.phase)
    /* /N = 平均单原子贡献：随机相位下涨落 ∝ 1/√N（N 越大越平） */
    s.eB = sum / s.atoms.length
  } else {
    const L = s.laser
    L.pt += dt
    if (L.phase === "pump") {
      const n = Math.min(5, 1 + Math.floor(L.pt / 0.4))
      for (let i = 0; i < n; i++) {
        if (!L.excited[i]) {
          L.excited[i] = true
          L.flashes.push({ i, t0: s.t, kind: "clone" })
        }
      }
      L.outAmp = Math.max(0, L.outAmp - dt * 1.2)
      if (L.pt >= 2.3) {
        L.phase = "run"
        L.pt = 0
        L.photons.push({ x: laserXL(cw) + 4, v: C_PH })
      }
    } else {
      /* run / steady：连续波——泵浦不断补充、腔内克隆雪崩、输出口持续出射，永不熄灭 */
      L.pumpT += dt
      if (L.pumpT >= 0.55) {
        L.pumpT = 0
        const i = L.excited.indexOf(false)
        if (i >= 0) {
          L.excited[i] = true
          L.flashes.push({ i, t0: s.t, kind: "pump" })
        }
      }
      const xs = laserAtomsX(cw)
      const add: Photon[] = []
      for (const p of L.photons) {
        p.x += p.v * dt
        for (let i = 0; i < 5; i++) {
          if (L.excited[i] && Math.abs(p.x - xs[i]) < 5 && L.photons.length + add.length < 8) {
            L.excited[i] = false
            add.push({ x: p.x + (p.v > 0 ? -6 : 6), v: p.v })
            L.flashes.push({ i, t0: s.t, kind: "clone" })
          }
        }
      }
      const xl = laserXL(cw)
      const xr = laserXR(cw)
      L.photons = L.photons.filter((p) => {
        if (p.x >= xr) {
          L.emissions++
          L.outAmp = Math.min(1, L.outAmp + 0.17)
          L.flashes.push({ i: -1, t0: s.t, kind: "emit" })
          return false
        }
        if (p.x <= xl + 2) {
          p.x = xl + 2
          p.v = C_PH
        }
        return true
      })
      L.photons.push(...add)
      /* 腔内暂无光子：由激发态原子重新播种（相位仍被腔锁定） */
      if (L.photons.length === 0) {
        L.seedT += dt
        const ie = L.excited.indexOf(true)
        if (L.seedT > 0.45 && ie >= 0) {
          L.photons.push({ x: xs[ie] + 4, v: C_PH })
          L.flashes.push({ i: ie, t0: s.t, kind: "clone" })
          L.seedT = 0
        }
      } else {
        L.seedT = 0
      }
      if (L.phase === "run" && L.outAmp >= 0.999) L.phase = "steady"
    }
    L.flashes = L.flashes.filter((f) => s.t - f.t0 < 0.5)
    s.e1 = L.excited[0] ? Math.cos(OMEGA * s.t) : 0
    s.eB = L.outAmp * Math.cos(OMEGA * s.t)
  }
}

/* ---------------- 历史取样（波列 = 历史的延迟重放） ---------------- */
function histIdx(s: SimState, tq: number): number {
  const T = s.hT
  const n = T.length
  if (n === 0) return -1
  if (tq >= T[n - 1]) return n - 1
  if (tq <= T[0]) return 0
  let lo = 0
  let hi = n - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (T[mid] <= tq) lo = mid
    else hi = mid
  }
  return lo
}
function histVal(s: SimState, tq: number, which: "a" | "b"): number {
  const i = histIdx(s, tq)
  if (i < 0) return 0
  const arr = which === "a" ? s.hA : s.hB
  const T = s.hT
  if (i >= T.length - 1) return arr[i]
  const span = T[i + 1] - T[i]
  const f = span > 1e-9 ? (tq - T[i]) / span : 0
  return arr[i] + (arr[i + 1] - arr[i]) * Math.max(0, Math.min(1, f))
}

/* ---------------- 绘制小工具 ---------------- */
function glowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: [number, number, number],
  a = 1
) {
  ctx.save()
  ctx.shadowBlur = 14
  ctx.shadowColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.9 * a})`
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
  ctx.restore()
}

const RED: [number, number, number] = [255, 108, 62]
const BLUE: [number, number, number] = [104, 146, 255]

/* ---------------- 波列（三种模式共用：eB 的历史向右展开） ---------------- */
function drawTrain(ctx: CanvasRenderingContext2D, s: SimState, cw: number, ch: number, x0: number) {
  const midY = ch * 0.5
  const amp = Math.min(ch * 0.3, 50)
  /* 中线 */
  ctx.strokeStyle = "rgba(255,255,255,0.10)"
  ctx.setLineDash([4, 5])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, midY)
  ctx.lineTo(cw - 6, midY)
  ctx.stroke()
  ctx.setLineDash([])
  /* 曲线 */
  ctx.lineWidth = 2
  ctx.lineCap = "round"
  let prevY = midY - histVal(s, s.t, "b") * amp
  for (let x = x0 + 2; x <= cw - 6; x += 2) {
    const tq = s.t - (x - x0) / C_PX
    const e = histVal(s, tq, "b")
    const y = midY - e * amp
    ctx.strokeStyle =
      e >= 0 ? "rgba(255,106,61,0.92)" : "rgba(96,138,255,0.92)"
    ctx.beginPath()
    ctx.moveTo(x - 2, prevY)
    ctx.lineTo(x, y)
    ctx.stroke()
    prevY = y
  }
  /* 发射口光条（颜色 = 此刻源的极性） */
  const eNow = s.eB
  const c = eNow >= 0 ? RED : BLUE
  ctx.save()
  ctx.shadowBlur = 12
  ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},0.8)`
  ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.22 + 0.4 * Math.abs(eNow)})`
  ctx.fillRect(x0 - 1.5, midY - 34, 3, 68)
  ctx.restore()
}

/* ---------------- 模式一：无线电天线 ---------------- */
function drawAntenna(ctx: CanvasRenderingContext2D, s: SimState, cw: number, ch: number) {
  const cx = cw * 0.165
  const top = ch * 0.17
  const bot = ch * 0.83
  const cy = ch * 0.5
  const q = Math.cos(OMEGA * s.t)

  /* 馈线（来自发射机的两根线） */
  ctx.strokeStyle = "rgba(255,255,255,0.14)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(6, cy - 7)
  ctx.lineTo(cx - 9, cy - 7)
  ctx.moveTo(6, cy + 7)
  ctx.lineTo(cx - 9, cy + 7)
  ctx.stroke()
  ctx.fillStyle = "rgba(255,255,255,0.35)"
  ctx.font = "9px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "left"
  ctx.fillText("来自发射机", 6, cy - 13)

  /* 天线杆（上下两臂，中央留馈电点）——暗色导轨，让晶格与电子看得清 */
  const grad = ctx.createLinearGradient(cx - 4, 0, cx + 4, 0)
  grad.addColorStop(0, "rgba(70,78,96,0.85)")
  grad.addColorStop(0.5, "rgba(120,130,152,0.9)")
  grad.addColorStop(1, "rgba(70,78,96,0.85)")
  ctx.strokeStyle = grad
  ctx.lineWidth = 5
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(cx, top + 10)
  ctx.lineTo(cx, cy - 6)
  ctx.moveTo(cx, cy + 6)
  ctx.lineTo(cx, bot - 10)
  ctx.stroke()
  /* 端帽 */
  ctx.lineWidth = 4
  ctx.strokeStyle = "rgba(210,220,235,0.7)"
  ctx.beginPath()
  ctx.moveTo(cx - 7, top + 8)
  ctx.lineTo(cx + 7, top + 8)
  ctx.moveTo(cx - 7, bot - 8)
  ctx.lineTo(cx + 7, bot - 8)
  ctx.stroke()
  /* 馈电点 */
  ctx.fillStyle = "rgba(255,255,255,0.9)"
  ctx.fillRect(cx - 3, cy - 3, 6, 6)

  /* 原子（正离子）晶格：钉在杆上，纹丝不动 */
  const small = cw < 480
  ctx.strokeStyle = "rgba(205,215,235,0.55)"
  ctx.lineWidth = 1
  for (let i = 0; i < 10; i++) {
    const y = top + 18 + (i / 9) * (bot - top - 36)
    if (Math.abs(y - cy) < 13) continue
    ctx.beginPath()
    ctx.arc(cx, y, 3.2, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 1.8, y)
    ctx.lineTo(cx + 1.8, y)
    ctx.moveTo(cx, y - 1.8)
    ctx.lineTo(cx, y + 1.8)
    ctx.stroke()
  }

  /* 自由电子海：不属于任何原子，全杆同步沿杆来回（中心摆幅最大、两端为零——半波振子驻波） */
  const amp = (bot - top) * 0.16
  for (let i = 0; i < 14; i++) {
    const y0 = top + 13 + (i / 13) * (bot - top - 26)
    if (Math.abs(y0 - cy) < 11) continue
    const zn = (y0 - cy) / ((bot - top) / 2)
    const u = q * amp * Math.cos((Math.PI * zn) / 2)
    glowDot(
      ctx,
      cx + Math.sin(i * 7.31) * 3.5,
      y0 + Math.cos(i * 3.7) * 2.5 + u,
      1.8,
      [190, 215, 255],
      0.95
    )
  }

  /* 标签 */
  ctx.font = "9px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "left"
  ctx.fillStyle = "rgba(205,215,235,0.55)"
  ctx.fillText(small ? "原子·固定不动" : "原子（正离子）· 固定不动", cx + 11, top + 15)
  ctx.fillStyle = "rgba(150,190,255,0.75)"
  ctx.fillText(small ? "自由电子·沿杆来回" : "自由电子 · 沿杆来回（不属于任何原子）", cx + 11, bot - 13)

  /* 两端电荷团：q>0 → 上端 +Q（红）、下端 −Q（蓝）；过零时几乎无电荷 */
  const rQ = 3.5 + 10 * Math.abs(q)
  glowDot(ctx, cx, top + 8, rQ, q > 0 ? RED : BLUE, 0.95)
  glowDot(ctx, cx, bot - 8, rQ, q > 0 ? BLUE : RED, 0.95)

  /* 极性标签 */
  ctx.font = "600 11px ui-monospace, SFMono-Regular, monospace"
  ctx.textAlign = "center"
  const a = 0.35 + 0.65 * Math.abs(q)
  const topCol =
    Math.abs(q) < 0.05
      ? `rgba(255,255,255,${a})`
      : q > 0
        ? `rgba(255,130,90,${a})`
        : `rgba(130,165,255,${a})`
  const botCol =
    Math.abs(q) < 0.05
      ? `rgba(255,255,255,${a})`
      : q > 0
        ? `rgba(130,165,255,${a})`
        : `rgba(255,130,90,${a})`
  ctx.fillStyle = topCol
  ctx.fillText(Math.abs(q) < 0.05 ? "0" : q > 0 ? "+Q" : "−Q", cx, top - 6)
  ctx.fillStyle = botCol
  ctx.fillText(Math.abs(q) < 0.05 ? "0" : q > 0 ? "−Q" : "+Q", cx, bot + 17)
  ctx.fillStyle = "rgba(255,255,255,0.3)"
  ctx.font = "9px ui-sans-serif, system-ui, sans-serif"
  ctx.fillText("上端", cx, top - 20)
  ctx.fillText("下端", cx, bot + 30)
}

/* ---------------- 模式二：原子/分子（热光） ---------------- */
function drawThermal(ctx: CanvasRenderingContext2D, s: SimState, cw: number, ch: number) {
  const ys = ch * 0.5
  const N = s.atoms.length
  const xa0 = 0.1 * cw
  const xa1 = 0.285 * cw
  const spacing = N > 1 ? (xa1 - xa0) / (N - 1) : 0
  const R = Math.min(20, Math.max(6, spacing * 0.42))
  const dispMax = Math.min(13, Math.max(5.5, R * 0.65))
  s.atoms.forEach((a, i) => {
    const env = atomEnv(a)
    const disp = a.on ? dispMax * env * Math.cos(OMEGA * s.t + a.phase) : 0
    const x = xa0 + (N > 1 ? (i / (N - 1)) * (xa1 - xa0) : (xa1 - xa0) / 2)

    /* 偏移范围提示圈 */
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = "rgba(255,255,255,0.10)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, ys, R * 0.58, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])

    /* 电子云（偏移 = 瞬时偶极） */
    const cr = R * 0.72
    const g = ctx.createRadialGradient(x + disp, ys, 0, x + disp, ys, cr)
    const ca = 0.16 + 0.5 * env
    g.addColorStop(0, `rgba(125,165,255,${ca})`)
    g.addColorStop(1, "rgba(125,165,255,0)")
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x + disp, ys, cr, 0, TAU)
    ctx.fill()

    /* 原子核 */
    glowDot(ctx, x, ys, R * 0.26, [255, 130, 84], 0.95)

    /* 瞬时偶极箭头 */
    if (Math.abs(disp) > 4) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)"
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x, ys - R * 0.95)
      ctx.lineTo(x + disp, ys - R * 0.95)
      ctx.stroke()
      const dir = Math.sign(disp)
      ctx.beginPath()
      ctx.moveTo(x + disp, ys - R * 0.95)
      ctx.lineTo(x + disp - dir * 4, ys - R * 0.95 - 3)
      ctx.lineTo(x + disp - dir * 4, ys - R * 0.95 + 3)
      ctx.closePath()
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.fill()
    }

    /* 标签：原子少时逐个标注；多时只标原子 1 */
    ctx.font = "9px ui-sans-serif, system-ui, sans-serif"
    ctx.textAlign = "center"
    if (N <= 6) {
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.fillText(`原子 ${i + 1}`, x, ys + R + 14)
      if (i === 0) {
        ctx.fillStyle = "rgba(190,240,150,0.75)"
        ctx.fillText("← 示波器 A 盯着它", x, ys + R + 26)
      }
    } else if (i === 0) {
      ctx.fillStyle = "rgba(190,240,150,0.75)"
      ctx.fillText("← 原子 1（示波器 A）", x + 30, ys + R + 14)
    }
    if (i === 0 && !a.on) {
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif"
      ctx.fillText("…重置相位", x, ys - R - 8)
    }
  })
}

/* ---------------- 模式三：激光（受激辐射） ---------------- */
function drawLaser(ctx: CanvasRenderingContext2D, s: SimState, cw: number, ch: number) {
  const xl = laserXL(cw)
  const xr = laserXR(cw)
  const y = ch * 0.5
  const L = s.laser

  /* 腔内驻波亮度纹（光子越多越亮） */
  if (L.photons.length > 0) {
    const a0 = Math.min(0.09, 0.02 * L.photons.length + 0.02)
    for (let x = xl + 3; x < xr - 3; x += 3) {
      const w = 0.5 + 0.5 * Math.sin((TAU * (x - xl)) / (LAM_PX * 0.62) - OMEGA * s.t * 1.2)
      ctx.fillStyle = `rgba(250,240,200,${a0 * w * w})`
      ctx.fillRect(x, y - 9, 3, 18)
    }
  }

  /* 两镜 */
  ctx.strokeStyle = "rgba(220,228,240,0.85)"
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(xl, y - ch * 0.21)
  ctx.lineTo(xl, y + ch * 0.21)
  ctx.stroke()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = "rgba(140,200,255,0.8)"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(xr, y - ch * 0.21)
  ctx.lineTo(xr, y + ch * 0.21)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.font = "9px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.fillText("全反镜", xl, y - ch * 0.21 - 8)
  ctx.fillStyle = "rgba(150,205,255,0.6)"
  ctx.fillText("半透镜 · 输出口", xr, y - ch * 0.21 - 8)

  /* 原子 5 个 */
  const xs = laserAtomsX(cw)
  xs.forEach((ax, i) => {
    if (L.excited[i]) {
      glowDot(ctx, ax, y, 11, [255, 168, 76], 0.9)
      ctx.strokeStyle = "rgba(255,190,110,0.5)"
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(ax, y, 14, 0, TAU)
      ctx.stroke()
    } else {
      ctx.strokeStyle = "rgba(140,155,180,0.5)"
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(ax, y, 6, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = "rgba(120,135,160,0.35)"
      ctx.beginPath()
      ctx.arc(ax, y, 2.5, 0, TAU)
      ctx.fill()
    }
  })

  /* 光子 = 一小段同相波包 */
  for (const p of L.photons) {
    const len = 26
    const ampP = 7
    const fade = (u: number) => Math.sin(((u + len / 2) / len) * Math.PI)
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    let pv = 0
    let py = y
    let first = true
    for (let u = -len / 2; u <= len / 2; u += 3) {
      const v = Math.sin((TAU * u) / 26 - OMEGA * s.t * 2) * fade(u)
      const yy = y - v * ampP
      if (!first) {
        ctx.strokeStyle =
          v >= 0 ? "rgba(255,120,74,0.95)" : "rgba(100,145,255,0.95)"
        ctx.beginPath()
        ctx.moveTo(p.x + u - 3, py)
        ctx.lineTo(p.x + u, yy)
        ctx.stroke()
      }
      pv = v
      py = yy
      first = false
    }
    glowDot(ctx, p.x + len / 2 - 2, y - pv * ampP, 1.8, [255, 240, 220], 0.9)
  }

  /* 闪光：克隆（原子处白圈扩散）/ 出射（输出口 lime 竖闪） */
  for (const f of L.flashes) {
    const age = (s.t - f.t0) / 0.45
    if (age > 1) continue
    const al = 1 - age
    if (f.kind === "clone" && f.i >= 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * al})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(xs[f.i], y, 6 + age * 16, 0, TAU)
      ctx.stroke()
    } else if (f.kind === "pump" && f.i >= 0) {
      ctx.strokeStyle = `rgba(190,240,150,${0.7 * al})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(xs[f.i], y, 4 + age * 12, 0, TAU)
      ctx.stroke()
    } else if (f.kind === "emit") {
      ctx.strokeStyle = `rgba(190,240,150,${0.8 * al})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(xr + 2 + age * 10, y - 22)
      ctx.lineTo(xr + 2 + age * 10, y + 22)
      ctx.stroke()
    }
  }

  /* 输出口光斑 ∝ 输出强度 */
  if (L.outAmp > 0.03) {
    glowDot(ctx, xr + 8, y, 3 + 11 * L.outAmp, [200, 245, 160], 0.8 * L.outAmp)
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)"
  ctx.font = "9px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("激发态原子 ×5", (xl + xr) / 2, y + ch * 0.21 + 16)
}

/* ---------------- 主画布 ---------------- */
function drawMain(canvas: HTMLCanvasElement, s: SimState) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const cw = canvas.clientWidth
  const ch = canvas.clientHeight
  if (cw < 10 || ch < 10) return
  const bw = Math.round(cw * dpr)
  const bh = Math.round(ch * dpr)
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw
    canvas.height = bh
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)

  const x0 = 0.33 * cw
  drawTrain(ctx, s, cw, ch, x0)
  if (s.mode === "antenna") drawAntenna(ctx, s, cw, ch)
  else if (s.mode === "thermal") drawThermal(ctx, s, cw, ch)
  else drawLaser(ctx, s, cw, ch)
}

/* ---------------- 示波器（A：单发射者 / B：总场） ---------------- */
function drawScope(canvas: HTMLCanvasElement, s: SimState, which: "a" | "b") {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const cw = canvas.clientWidth
  const ch = canvas.clientHeight
  if (cw < 10 || ch < 10) return
  const bw = Math.round(cw * dpr)
  const bh = Math.round(ch * dpr)
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw
    canvas.height = bh
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)

  const mid = ch * 0.52
  const amp = ch * 0.5 - 10
  const t1 = s.t
  const t0 = t1 - WIN

  /* 参考线 */
  ctx.strokeStyle = "rgba(255,120,80,0.14)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, mid - amp)
  ctx.lineTo(cw, mid - amp)
  ctx.stroke()
  ctx.strokeStyle = "rgba(110,140,255,0.14)"
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

  /* 曲线 */
  ctx.lineWidth = 1.7
  ctx.lineCap = "round"
  let prevE = histVal(s, t0, which)
  for (let x = 2; x <= cw; x += 2) {
    const tq = t1 - (1 - x / cw) * WIN
    const e = histVal(s, tq, which)
    ctx.strokeStyle = e >= 0 ? "rgba(255,106,61,0.9)" : "rgba(96,138,255,0.9)"
    ctx.beginPath()
    ctx.moveTo(x - 2, mid - prevE * amp)
    ctx.lineTo(x, mid - e * amp)
    ctx.stroke()
    prevE = e
  }

  /* 窗口内样本：零点白点 + 相位重置标记（A 图） */
  const i0 = histIdx(s, t0)
  if (i0 >= 0) {
    const xOf = (tq: number) => (1 - (t1 - tq) / WIN) * cw
    ctx.font = "600 8px ui-sans-serif, system-ui, sans-serif"
    ctx.textAlign = "center"
    for (let k = Math.max(1, i0); k < s.hT.length; k++) {
      const x = xOf(s.hT[k])
      if (x < 2 || x > cw - 2) continue
      const a1 = which === "a" ? s.hA[k - 1] : s.hB[k - 1]
      const a2 = which === "a" ? s.hA[k] : s.hB[k]
      if (a1 <= 0 !== a2 <= 0) {
        ctx.fillStyle = "rgba(255,255,255,0.85)"
        ctx.beginPath()
        ctx.arc(x, mid, 1.8, 0, TAU)
        ctx.fill()
      }
      if (which === "a" && s.hM[k] === 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(x, 4)
        ctx.lineTo(x, ch - 4)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = "rgba(255,255,255,0.6)"
        ctx.fillText("重置相位", x, 10)
      }
    }
  }

  /* 当前值端点 */
  const eNow = which === "a" ? s.e1 : s.eB
  ctx.fillStyle = eNow >= 0 ? "rgba(255,120,74,0.95)" : "rgba(120,155,255,0.95)"
  ctx.beginPath()
  ctx.arc(cw - 2, mid - eNow * amp, 3.4, 0, TAU)
  ctx.fill()

  ctx.fillStyle = "rgba(255,255,255,0.28)"
  ctx.font = "9px ui-monospace, SFMono-Regular, monospace"
  ctx.textAlign = "left"
  ctx.fillText("+1", 3, mid - amp + 9)
  ctx.fillText("-1", 3, mid + amp + 2)
}

/* ---------------- React 组件 ---------------- */

const MODES: { id: Mode; label: string; icon: ReactNode; aria: string }[] = [
  { id: "antenna", label: "天线", icon: <RadioTower className="h-3.5 w-3.5" />, aria: "切换到无线电天线模式" },
  { id: "thermal", label: "原子·热光", icon: <Atom className="h-3.5 w-3.5" />, aria: "切换到原子热光模式" },
  { id: "laser", label: "激光", icon: <Sparkles className="h-3.5 w-3.5" />, aria: "切换到激光模式" },
]

const LASER_BANNER: Record<LaserPhase, string> = {
  pump: "① 泵浦：把原子逐个推上激发态",
  run: "② 建立：受激辐射同相克隆 → 雪崩放大中",
  steady: "③ 稳态：恒幅纯正弦 · 相位永不重置",
}

function scopeSub(mode: Mode, n: number): [string, string] {
  if (mode === "antenna") return ["一根天线的输出", "单源：收到 = 发出"]
  if (mode === "thermal")
    return ["原子 1：一段一段的波列", `Σ/${n} · 涨落 ≈ ${(1 / Math.sqrt(n)).toFixed(2)}`]
  return ["原子 1：要么不发，发就同相", "建立后恒幅 · 相位永不重置"]
}

const TIP: Record<Mode, ReactNode> = {
  antenna: (
    <>
      动的不是原子、也不是原子上的束缚电子——是整根杆共享的
      <b className="text-zinc-200">自由电子海</b>（导带电子，不属于任何原子）：
      原子（正离子 ＋）钉在晶格上纹丝不动，
      自由电子被发射机推着<b className="text-zinc-200">沿杆长方向</b>整片来回（像水管里的水整体晃），
      中心摆幅最大、两端堆积 <b className="text-orange-300">+Q</b> /
      <b className="text-blue-300">−Q</b> 最多。真实摆幅仅微米级，动画放大了约万倍；
      过零那一瞬（两端电荷 = 0）恰是零壳诞生的时刻。
    </>
  ),
  thermal: (
    <>
      你猜对了一半：<b className="text-zinc-200">瞬时场几乎抵消，亮度不抵消</b>。
      N 个乱相位正弦相加 ≈ 0，只剩 1/√N 涨落——把&ldquo;原子数&rdquo;加到 12，B 图明显变平
      （真实灯丝 N~10<sup>20</sup>，涨落仅 10<sup>−10</sup>）；
      但强度 = N×单原子（E<sup>2</sup> 时间平均：交叉项归零、自项相加）——太阳耀眼靠强度相加。
      单看 A：每段 3–6 个周期仍是干净正弦（相干时间内&ldquo;就是一列好波&rdquo;）。
    </>
  ),
  laser: (
    <>
      之前的&ldquo;不完美&rdquo;是玩具做成了<b className="text-zinc-200">脉冲式</b>
      （泵浦→雪崩→熄灭→重泵）：阶梯和间隙是<b className="text-zinc-200">包络的呼吸，不是相位错乱</b>
      ——每一轮内相位从未跳变（A 图从无&ldquo;重置相位&rdquo;断口）。现在是
      <b className="text-zinc-200">连续波</b>：开启 → 快速建立 → 恒幅稳态、永不熄灭。
      相干性好的判据不是&ldquo;波形漂亮&rdquo;，而是<b className="text-zinc-200">频率单一、相位确定</b>
      ——稳态激光的相干长度可达公里级。
    </>
  ),
}

export function SourceLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scopeARef = useRef<HTMLCanvasElement>(null)
  const scopeBRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>("antenna")
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [atomCount, setAtomCount] = useState(3)
  const [laserPhase, setLaserPhase] = useState<LaserPhase>("pump")

  const st = useRef<SimState>({
    t: 0,
    visible: true,
    paused: false,
    speed: 1,
    mode: "antenna",
    atoms: [newAtom(), newAtom(), newAtom()],
    laser: freshLaser(),
    lastPhase: "pump",
    e1: 0,
    eB: 0,
    pendingMark: false,
    nextT: 0,
    hT: [],
    hA: [],
    hB: [],
    hM: [],
  })

  useEffect(() => {
    st.current.paused = paused
  }, [paused])
  useEffect(() => {
    st.current.speed = speed
  }, [speed])
  useEffect(() => {
    const s = st.current
    if (s.mode === "thermal") {
      s.atoms = Array.from({ length: atomCount }, newAtom)
    }
  }, [atomCount])

  /* ---------------- 主循环 ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const scopeA = scopeARef.current
    const scopeB = scopeBRef.current
    if (!canvas || !scopeA || !scopeB) return
    const ctxOk = canvas.getContext("2d") && scopeA.getContext("2d") && scopeB.getContext("2d")
    if (!ctxOk) return

    const s = st.current
    let raf = 0
    let last = performance.now()

    const io = new IntersectionObserver(
      (es) => {
        s.visible = es[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 }
    )
    io.observe(canvas)

    const frame = (now: number) => {
      const dtReal = Math.min(0.05, (now - last) / 1000)
      last = now
      const cw = canvas.clientWidth
      if (!s.paused && s.visible && cw > 10) {
        advance(s, dtReal * s.speed, cw)
        /* 按固定采样率存历史（波列 = 历史的延迟重放） */
        while (s.nextT <= s.t + 1e-9) {
          const m = s.pendingMark
          s.pendingMark = false
          s.hT.push(s.nextT)
          s.hA.push(s.e1)
          s.hB.push(s.eB)
          s.hM.push(m ? 1 : 0)
          s.nextT += 1 / SR
        }
        while (s.hT.length > 2 && s.hT[0] < s.t - SPAN) {
          s.hT.shift()
          s.hA.shift()
          s.hB.shift()
          s.hM.shift()
        }
        if (s.mode === "laser" && s.laser.phase !== s.lastPhase) {
          s.lastPhase = s.laser.phase
          setLaserPhase(s.laser.phase)
        }
      }
      drawMain(canvas, s)
      drawScope(scopeA, s, "a")
      drawScope(scopeB, s, "b")
      ;(window as unknown as { __srclab?: object }).__srclab = {
        mode: s.mode,
        atomCount: s.atoms.length,
        t: +s.t.toFixed(3),
        e1: +s.e1.toFixed(3),
        eB: +s.eB.toFixed(3),
        laserPhase: s.laser.phase,
        excited: s.laser.excited.filter(Boolean).length,
        photons: s.laser.photons.length,
        emissions: s.laser.emissions,
        outAmp: +s.laser.outAmp.toFixed(3),
        atomOn: s.atoms.map((a) => a.on),
        paused: s.paused,
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  const switchMode = (m: Mode) => {
    setMode(m)
    resetSim(st.current, m, m === "thermal" ? atomCount : 3)
    setLaserPhase("pump")
  }
  const resetAll = () => {
    resetSim(st.current, st.current.mode, st.current.mode === "thermal" ? atomCount : 3)
    setLaserPhase("pump")
  }

  const banner =
    mode === "antenna"
      ? "天线 · 自由电子沿杆来回 → 连续波列"
      : mode === "thermal"
        ? `${atomCount} 原子乱相位 → 场≈0＋涨落；亮度 ${atomCount}×单原子`
        : LASER_BANNER[laserPhase]

  return (
    <Card className="overflow-hidden border-white/10 bg-zinc-900/60 shadow-2xl shadow-lime-950/20">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-zinc-100 sm:text-xl">
              <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-red-400 via-white to-blue-400" />
              动画 ④ · 走进光源内部：到底是谁在&ldquo;来回翻&rdquo;？
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              追问⑧说&ldquo;翻的是场值的正负&rdquo;——三类光源在这里逐个拆开看内部：
              <b className="text-zinc-200">无线电天线</b>里是自由电子海沿杆来回（原子纹丝不动），
              <b className="text-zinc-200">灯丝/太阳</b>里是亿万个原子的电子云各自乱摆（原子数可加到 12），
              <b className="text-zinc-200">激光</b>里是受激辐射把步调锁死——连续波、恒幅输出、相位永不重置。
              右侧波列就是上面 3D 动画里&ldquo;壳队列&rdquo;的剖面——
              <b className="text-zinc-200">它向右跑的每一段，都是源历史的延迟重放</b>。
              下方两块示波器是检验工具：<b className="text-zinc-200">A 盯单个发射者，B 看叠加总场</b>
              ——天线与激光 A=B 完美，唯独热光的 B 乱颤。切换三个模式对照。
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
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
          <canvas
            ref={canvasRef}
            className="block h-[300px] w-full sm:h-[350px]"
            aria-label="光源内部结构与输出波列动画"
          />
          <div className="pointer-events-none absolute left-3 top-3 max-w-[88%] whitespace-nowrap rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] leading-none text-zinc-200 backdrop-blur-sm">
            {banner}
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 max-w-[88%] whitespace-nowrap rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] leading-none text-zinc-400 backdrop-blur-sm">
            红=+E · 蓝=−E · 向右 = 源历史外传
          </div>
        </div>

        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-zinc-400">
          {TIP[mode]}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {MODES.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant="outline"
                onClick={() => switchMode(m.id)}
                aria-label={m.aria}
                className={
                  mode === m.id
                    ? "h-8 border-lime-400/50 bg-lime-400/15 text-lime-200 hover:bg-lime-400/25"
                    : "h-8 border-white/15 bg-transparent text-zinc-300 hover:bg-white/10"
                }
              >
                {m.icon}
                {m.label}
              </Button>
            ))}
          </div>
          {mode === "thermal" && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">原子数</span>
              {[3, 6, 12].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant="outline"
                  onClick={() => setAtomCount(n)}
                  aria-label={`原子数 ${n}`}
                  className={
                    atomCount === n
                      ? "h-8 border-lime-400/50 bg-lime-400/15 text-lime-200 hover:bg-lime-400/25"
                      : "h-8 border-white/15 bg-transparent text-zinc-300 hover:bg-white/10"
                  }
                >
                  {n}
                </Button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {[0.5, 1, 2].map((sp) => (
              <Button
                key={sp}
                size="sm"
                variant="outline"
                onClick={() => setSpeed(sp)}
                aria-label={`播放倍速 ${sp} 倍`}
                className={
                  speed === sp
                    ? "h-8 border-lime-400/50 bg-lime-400/15 text-lime-200 hover:bg-lime-400/25"
                    : "h-8 border-white/15 bg-transparent text-zinc-300 hover:bg-white/10"
                }
              >
                {sp}×
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={resetAll}
            aria-label="重置动画"
            className="h-8 border-white/15 bg-transparent text-zinc-300 hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-2.5">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-[11px] font-semibold text-zinc-200">A · 单个发射者 E(t)</span>
              <span className="text-[10px] text-zinc-500">{scopeSub(mode, atomCount)[0]}</span>
            </div>
            <canvas
              ref={scopeARef}
              className="block h-[84px] w-full sm:h-[94px]"
              aria-label="单个发射者的电场随时间变化曲线"
            />
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-2.5">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-[11px] font-semibold text-zinc-200">B · 叠加后的总场 ΣE</span>
              <span className="text-[10px] text-zinc-500">{scopeSub(mode, atomCount)[1]}</span>
            </div>
            <canvas
              ref={scopeBRef}
              className="block h-[84px] w-full sm:h-[94px]"
              aria-label="叠加后的总电场随时间变化曲线"
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-zinc-500">
          三种源&ldquo;翻&rdquo;的方式不同，翻的东西一样：<b className="text-zinc-300">电荷的分布</b>
          （电子群的位置 / 电子云的偏移）。所以<b className="text-zinc-300">翻的频率就是光的频率</b>
          ——无线电 ~10<sup>8</sup> Hz、可见光 ~10<sup>14</sup> Hz。动画把它们放慢了约 10<sup>8</sup>–10<sup>14</sup> 倍。
        </p>
      </CardContent>
    </Card>
  )
}
