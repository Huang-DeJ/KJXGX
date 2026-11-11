"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Activity,
  MousePointer2,
  Pause,
  Play,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react"
import { buildDivergingLut8, drawFieldScope, classifyPhase, makeGlowTexture } from "./wave-kit"

/* ---------------- 物理常量（与动画①/3D 同一套节奏） ---------------- */
const LAMBDA = 1.4 // 波长（场景单位）
const K = (2 * Math.PI) / LAMBDA
const PERIOD = 1.5 // 振动周期（s）
const OMEGA = (2 * Math.PI) / PERIOD
const R_MAX = 5.6 // 剖面半径（= 4λ）
const GRID = 120 // 网格分段数
const H = 0.66 // 场值→高度 的立体比例
const EDGE0 = R_MAX - 0.9 // 外圈淡出起点

/* 事件横幅配色 */
const TONE: Record<string, string> = {
  peak: " border border-orange-400/50 bg-orange-400/15 text-orange-200",
  zero: " border border-sky-300/50 bg-sky-300/15 text-sky-100",
  trough: " border border-blue-400/50 bg-blue-400/15 text-blue-200",
  rise: " border border-white/10 bg-white/5 text-zinc-300",
  fall: " border border-white/10 bg-white/5 text-zinc-300",
}

const DIV_LUT8 = buildDivergingLut8()

/* 场值 u(x,z,t)：−1..+1（振幅 ∝ 1/r，外圈淡出） */
function fieldAt(x: number, z: number, t: number): number {
  const r = Math.sqrt(x * x + z * z)
  const edge = r > EDGE0 ? Math.max(0, 1 - (r - EDGE0) / 0.9) : 1
  const amp = Math.min(1, 1.55 / Math.max(r, 0.42)) * edge
  return Math.cos(K * r - OMEGA * t) * amp
}

export function WavefrontRelief() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scopeRef = useRef<HTMLCanvasElement>(null)
  const crestRef = useRef<HTMLDivElement>(null)
  const troughRef = useRef<HTMLDivElement>(null)
  const zeroRef = useRef<HTMLDivElement>(null)
  const probeTagRef = useRef<HTMLDivElement>(null)
  const probeBadgeRef = useRef<HTMLSpanElement>(null)
  const probeERef = useRef<HTMLSpanElement>(null)
  const [paused, setPaused] = useState(false)
  const [flat, setFlat] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [dragged, setDragged] = useState(false)
  const [glError, setGlError] = useState(false)
  const [probeDist, setProbeDist] = useState(2.6)

  const st = useRef<{
    t: number
    last: number
    paused: boolean
    visible: boolean
    theta: number
    phi: number
    radius: number
    dragging: boolean
    px: number
    py: number
    hScale: number
    hTarget: number
    speed: number
    probeDist: number
  }>({
    t: 0,
    last: 0,
    paused: false,
    visible: true,
    theta: 0.85,
    phi: 0.5,
    radius: 11.8,
    dragging: false,
    px: 0,
    py: 0,
    hScale: 1,
    hTarget: 1,
    speed: 1,
    probeDist: 2.6,
  })

  /* 状态同步到动画循环 */
  useEffect(() => {
    st.current.paused = paused
  }, [paused])
  useEffect(() => {
    st.current.hTarget = flat ? 0 : 1
  }, [flat])
  useEffect(() => {
    st.current.speed = speed
  }, [speed])
  useEffect(() => {
    st.current.probeDist = probeDist
  }, [probeDist])

  /* ---------------- 3D 场景 ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      })
    } catch {
      queueMicrotask(() => setGlError(true))
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x070b09, 1)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x070b09, 0.05)

    const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 80)

    const disposables: Array<{ dispose: () => void }> = []

    /* 起伏剖面：高分辨率平面网格，每帧把场值写进 y 与顶点色 */
    const geo = new THREE.PlaneGeometry(R_MAX * 2, R_MAX * 2, GRID, GRID)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const count = pos.count
    const baseX = new Float32Array(count)
    const baseZ = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      baseX[i] = pos.getX(i)
      baseZ[i] = pos.getZ(i)
    }
    const colArr = new Float32Array(count * 3)
    const colAttr = new THREE.BufferAttribute(colArr, 3)
    colAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute("color", colAttr)
    disposables.push(geo)

    const mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 30,
      specular: new THREE.Color(0x1f2026),
      side: THREE.DoubleSide,
    })
    disposables.push(mat)
    const surf = new THREE.Mesh(geo, mat)
    scene.add(surf)

    /* 光照：定向明暗让起伏立体，总强度≈1.3，顶点色保真不过曝 */
    const hemi = new THREE.HemisphereLight(0xd8e2f0, 0x0a1210, 0.5)
    scene.add(hemi)
    const key = new THREE.DirectionalLight(0xffffff, 0.85)
    key.position.set(3.5, 6, 2.5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x6a7db0, 0.35)
    fill.position.set(-4, 2.5, -3)
    scene.add(fill)
    disposables.push(hemi, key, fill)

    /* 过零参考面（“水面”）：起伏从它上方压到下方 = 正负切换 */
    const planeGeo = new THREE.PlaneGeometry(R_MAX * 2, R_MAX * 2)
    planeGeo.rotateX(-Math.PI / 2)
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x9db4ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    disposables.push(planeGeo, planeMat)
    const zeroPlane = new THREE.Mesh(planeGeo, planeMat)
    zeroPlane.renderOrder = 1
    scene.add(zeroPlane)

    /* 极坐标参考网格（深度参照） */
    const grid = new THREE.PolarGridHelper(R_MAX + 0.35, 12, 5, 72, 0x2a3140, 0x171b26)
    grid.rotation.x = -Math.PI / 2
    grid.position.y = -0.02
    scene.add(grid)
    disposables.push(grid.geometry, grid.material as THREE.Material)

    /* 探针：钉在起伏面上的小球，跟着面上下（朝向相机一侧，始终可见） */
    const glowTex = makeGlowTexture()
    disposables.push(glowTex)

    const probeGeo = new THREE.SphereGeometry(0.09, 16, 12)
    const probeMat = new THREE.MeshBasicMaterial({ color: 0xfff3e8 })
    disposables.push(probeGeo, probeMat)
    const probe = new THREE.Mesh(probeGeo, probeMat)
    probe.renderOrder = 4
    scene.add(probe)

    const probeGlowMat = new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.55,
    })
    disposables.push(probeGlowMat)
    const probeGlow = new THREE.Sprite(probeGlowMat)
    probeGlow.scale.setScalar(0.5)
    probeGlow.renderOrder = 4
    scene.add(probeGlow)

    const guidePos = new Float32Array(6)
    const guideGeo = new THREE.BufferGeometry()
    const guideAttr = new THREE.BufferAttribute(guidePos, 3)
    guideAttr.setUsage(THREE.DynamicDrawUsage)
    guideGeo.setAttribute("position", guideAttr)
    const guideMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
    })
    disposables.push(guideGeo, guideMat)
    const guide = new THREE.Line(guideGeo, guideMat)
    guide.renderOrder = 3
    scene.add(guide)

    const footGeo = new THREE.RingGeometry(0.11, 0.16, 32)
    footGeo.rotateX(-Math.PI / 2)
    const footMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
    disposables.push(footGeo, footMat)
    const foot = new THREE.Mesh(footGeo, footMat)
    foot.position.y = 0.012
    foot.renderOrder = 3
    scene.add(foot)

    function resize() {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const io = new IntersectionObserver(
      (es) => {
        st.current.visible = es[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 }
    )
    io.observe(canvas)

    const scopeCanvas = scopeRef.current

    const tmpV = new THREE.Vector3()
    function placeLabel(
      el: HTMLDivElement | null,
      r: number,
      cw: number,
      ch: number,
      lift: number
    ) {
      if (!el) return
      const u = fieldAt(r, 0, st.current.t)
      tmpV.set(r, u * H * st.current.hScale, 0).project(camera)
      if (tmpV.z > 1 || cw <= 0) {
        el.style.opacity = "0"
        return
      }
      const tx = (tmpV.x * 0.5 + 0.5) * cw
      const ty = (-tmpV.y * 0.5 + 0.5) * ch
      el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) translate(-50%, ${lift}%)`
      el.style.opacity = "1"
    }

    const updateReadouts = (eP: number, rising: boolean, pausedNow: boolean) => {
      const badge = probeBadgeRef.current
      if (badge) {
        const base =
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors"
        let txt: string
        let cls: string
        if (pausedNow) {
          txt = "已暂停"
          cls = " border border-white/10 bg-white/5 text-zinc-400"
        } else {
          const c = classifyPhase(eP, rising)
          txt = c.text
          cls = TONE[c.kind] ?? TONE.rise
        }
        if (badge.textContent !== txt) {
          badge.textContent = txt
          badge.className = base + cls
        }
      }
      if (probeERef.current) {
        probeERef.current.textContent =
          (eP >= 0 ? "+" : "−") + Math.abs(eP).toFixed(2)
      }
    }

    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const s = st.current
      const dt = Math.min(0.05, (now - s.last) / 1000 || 0.016)
      s.last = now
      if (!s.visible) return
      if (!s.paused) s.t += dt * s.speed
      s.hScale += (s.hTarget - s.hScale) * Math.min(1, dt * 5)

      /* 逐顶点写入场值：y = 高度，颜色 = 红(正)/黑(零)/蓝(负) */
      const arr = pos.array as Float32Array
      const t = s.t
      const hs = s.hScale
      for (let i = 0; i < count; i++) {
        const u = fieldAt(baseX[i], baseZ[i], t)
        arr[i * 3 + 1] = u * H * hs
        let ci = ((u + 1) * 127.5) | 0
        if (ci < 0) ci = 0
        else if (ci > 255) ci = 255
        /* 顶点色必须归一化到 0..1（LUT 存的是 0..255 字节值） */
        colArr[i * 3] = DIV_LUT8[ci * 3] / 255
        colArr[i * 3 + 1] = DIV_LUT8[ci * 3 + 1] / 255
        colArr[i * 3 + 2] = DIV_LUT8[ci * 3 + 2] / 255
      }
      pos.needsUpdate = true
      colAttr.needsUpdate = true
      geo.computeVertexNormals()

      /* 相机（拖动旋转 + 缓慢自转） */
      camera.position.set(
        s.radius * Math.cos(s.phi) * Math.cos(s.theta),
        s.radius * Math.sin(s.phi),
        s.radius * Math.cos(s.phi) * Math.sin(s.theta)
      )
      camera.lookAt(0, 0.15, 0)
      if (!s.paused && !s.dragging) s.theta += 0.05 * dt

      /* 探针：放在朝向相机的一侧（固定半径，方向随视角），钉在起伏面上 */
      const rp = s.probeDist
      const dirX = Math.cos(s.theta)
      const dirZ = Math.sin(s.theta)
      const probeU = fieldAt(dirX * rp, dirZ * rp, t)
      const probeY = probeU * H * hs
      probe.position.set(dirX * rp, probeY, dirZ * rp)
      probeGlow.position.copy(probe.position)
      guidePos[0] = dirX * rp
      guidePos[1] = 0
      guidePos[2] = dirZ * rp
      guidePos[3] = dirX * rp
      guidePos[4] = probeY
      guidePos[5] = dirZ * rp
      guideAttr.needsUpdate = true
      foot.position.set(dirX * rp, 0.012, dirZ * rp)

      renderer.render(scene, camera)

      /* 示波器：探针高度随时间的曲线 + 峰/零/谷打点 */
      const phiP = K * rp - OMEGA * t
      const eP = Math.cos(phiP)
      const rising = Math.sin(phiP) > 0
      if (scopeCanvas)
        drawFieldScope(scopeCanvas, {
          tNow: t,
          dist: rp,
          K,
          omega: OMEGA,
          period: PERIOD,
          paused: s.paused,
        })
      updateReadouts(eP, rising, s.paused)

      /* 标签：波峰 / 波谷 / 零壳 追着环走 */
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      const f = (t / PERIOD) % 1
      placeLabel(crestRef.current, LAMBDA * (2 + f), cw, ch, -160)
      placeLabel(troughRef.current, LAMBDA * (2.5 + f), cw, ch, 60)
      placeLabel(zeroRef.current, LAMBDA * (2.25 + f), cw, ch, -140)

      /* 探针标签跟随投影 */
      const tag = probeTagRef.current
      if (tag && cw > 0) {
        tmpV.copy(probe.position).project(camera)
        if (tmpV.z > 1) {
          tag.style.opacity = "0"
        } else {
          tag.style.transform = `translate(${((tmpV.x * 0.5 + 0.5) * cw).toFixed(1)}px, ${(
            (-tmpV.y * 0.5 + 0.5) * ch -
            18
          ).toFixed(1)}px)`
          tag.style.opacity = "1"
        }
      }

      /* 自检钩子（自动化验证用） */
      ;(window as unknown as { __wrelief?: object }).__wrelief = {
        t,
        hScale: +s.hScale.toFixed(3),
        flat: s.hTarget === 0,
        E: eP,
        d: rp,
        probeY: +probeY.toFixed(3),
        verts: count,
        theta: +s.theta.toFixed(3),
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      for (const d of disposables) d.dispose()
      renderer.dispose()
    }
  }, [])

  /* ---- 交互：拖动旋转 ---- */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = st.current
    s.dragging = true
    s.px = e.clientX
    s.py = e.clientY
    if (!dragged) setDragged(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = st.current
    if (!s.dragging) return
    const dx = e.clientX - s.px
    const dy = e.clientY - s.py
    s.px = e.clientX
    s.py = e.clientY
    s.theta -= dx * 0.0062
    s.phi = Math.min(1.32, Math.max(0.05, s.phi + dy * 0.0048))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    st.current.dragging = false
    e.currentTarget.style.cursor = "grab"
  }
  const zoom = (f: number) => {
    st.current.radius = Math.min(20, Math.max(7.5, st.current.radius * f))
  }
  const resetView = () => {
    const s = st.current
    s.theta = 0.85
    s.phi = 0.5
    s.radius = 11.8
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-zinc-900/60 shadow-2xl shadow-blue-950/30">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-zinc-100 sm:text-xl">
              <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-red-400 to-blue-400" />
              动画 ①·3D · 剖面立起来：看见波峰、波谷与零壳
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              上面玫红卡片与追问⑥的答案，画出来就是这张图：
              <b className="text-zinc-200">把每一点的电场值 E 立起来，变成真实高度</b>
              ——<b className="text-orange-300">红色的山脊是波峰（+E<sub>0</sub>）</b>，
              <b className="text-blue-300">蓝色的洼地是波谷（−E<sub>0</sub>）</b>，
              <b className="text-zinc-200">黑环是过零（E = 0）</b>，起伏穿过半透明&ldquo;水面&rdquo;
              就说明方向切换了。它长得就像水波——因为水波正是二维版球面波；区别只在：
              这里的高度是电场 E（振幅 ∝ 1/r），水面的高度是 h（∝ 1/√r）。
              <b className="text-zinc-200">探针小球</b>钉在面上跟着上下，示波器记录它的高度——
              <b className="text-zinc-200">拖动画面旋转视角</b>，打开开关可摊平成红蓝亮度图。
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
            className="block h-[340px] w-full cursor-grab touch-pan-y sm:h-[420px]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {!glError && (
            <div
              ref={crestRef}
              style={{ opacity: 0 }}
              className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-orange-300/50 bg-black/70 px-2 py-0.5 text-[10px] leading-none text-orange-200 backdrop-blur-sm"
            >
              波峰 +E<sub>0</sub>
            </div>
          )}
          {!glError && (
            <div
              ref={zeroRef}
              style={{ opacity: 0 }}
              className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-white/25 bg-black/70 px-2 py-0.5 text-[10px] leading-none text-zinc-300 backdrop-blur-sm"
            >
              零壳 E = 0
            </div>
          )}
          {!glError && (
            <div
              ref={troughRef}
              style={{ opacity: 0 }}
              className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-blue-300/50 bg-black/70 px-2 py-0.5 text-[10px] leading-none text-blue-200 backdrop-blur-sm"
            >
              波谷 −E<sub>0</sub>
            </div>
          )}
          {!glError && (
            <div
              ref={probeTagRef}
              style={{ opacity: 0 }}
              className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-white/25 bg-black/60 px-1.5 py-0.5 text-[10px] leading-none text-zinc-100 backdrop-blur-sm"
            >
              探针
            </div>
          )}
          {glError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-zinc-400">
              当前环境不支持 WebGL，无法播放 3D 动画。可以回到动画 ① 用 2D 剖面理解同样的内容。
            </div>
          ) : (
            !dragged && (
              <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-zinc-200/90 backdrop-blur-sm">
                <MousePointer2 className="h-3.5 w-3.5" />
                按住拖动 · 旋转 3D 视角
              </div>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            山脊 = 波峰（E = +E<sub>0</sub>）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            洼地 = 波谷（E = −E<sub>0</sub>）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-black" />
            黑环 = 过零（零壳经过处）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-300/25" />
            半透明面 = E = 0 的&ldquo;水面&rdquo;
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-red-100 to-red-500" />
            探针 = 定点观察（读数见示波器）
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          <div className="flex items-center gap-2">
            <Switch
              id="relief-flat"
              checked={flat}
              onCheckedChange={setFlat}
              aria-label="摊平成亮度"
            />
            <Label htmlFor="relief-flat" className="cursor-pointer text-xs text-zinc-400">
              摊平成亮度（红=正 蓝=负）
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <Label htmlFor="relief-speed" className="cursor-pointer text-xs text-zinc-400">
              倍速
            </Label>
            <Slider
              id="relief-speed"
              value={[speed]}
              min={0.25}
              max={2}
              step={0.25}
              onValueChange={(v) => setSpeed(v[0])}
              className="w-20 sm:w-24"
              aria-label="播放倍速"
            />
            <span className="w-9 font-mono text-xs text-zinc-300/80">{speed}×</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Label htmlFor="relief-probe" className="cursor-pointer text-xs text-zinc-400">
              探针距离
            </Label>
            <Slider
              id="relief-probe"
              value={[probeDist]}
              min={0.9}
              max={4.8}
              step={0.1}
              onValueChange={(v) => setProbeDist(v[0])}
              className="w-20 sm:w-24"
              aria-label="探针与光源的距离"
            />
            <span className="w-7 font-mono text-xs text-zinc-300/80">
              {probeDist.toFixed(1)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-1 hidden text-xs text-zinc-500 sm:inline">缩放</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 border-white/15 bg-transparent p-0 text-zinc-200 hover:bg-white/10 hover:text-white"
              onClick={() => zoom(0.85)}
              aria-label="拉近"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 border-white/15 bg-transparent p-0 text-zinc-200 hover:bg-white/10 hover:text-white"
              onClick={() => zoom(1.18)}
              aria-label="拉远"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-white/15 bg-transparent px-2 text-zinc-200 hover:bg-white/10 hover:text-white"
              onClick={resetView}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              复位视角
            </Button>
          </div>
        </div>

        {/* 探针示波器：定点的高度记录（追问⑥：换向发生在零壳扫过时） */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Activity className="h-3.5 w-3.5 text-orange-300" />
              探针示波器 · 小球的高度随时间怎么变
            </span>
            <span
              ref={probeBadgeRef}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400"
            >
              …
            </span>
          </div>
          <canvas
            ref={scopeRef}
            className="mt-2.5 block h-[96px] w-full"
            aria-label="探针处电场随时间变化的曲线，含峰零谷标记"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
            <span>
              探针电场 E =
              <span ref={probeERef} className="ml-1 font-mono text-zinc-100">
                +1.00
              </span>
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-zinc-500">
            每个打点 = 一个壳恰好扫过探针：<b className="text-orange-300">「峰」</b>=波峰壳（最高）、
            <b className="text-zinc-200">「零」</b>=零壳（E = 0，方向在此切换）、
            <b className="text-blue-300">「谷」</b>=波谷壳（最低）。峰→零→谷→零每 T/4 一班——
            注意看：<b className="text-zinc-200">波峰壳穿过后，小球仍浮在&ldquo;水面&rdquo;之上慢慢下落</b>，
            要等零壳扫过才穿过水面换向，最后被波谷压到最低。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
