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
import { buildDivergingLut32, drawFieldScope, classifyPhase, makeGlowTexture } from "./wave-kit"

/* ---------------- 物理常量（与动画①同节奏） ---------------- */
const LAMBDA = 1.4 // 波长（场景单位）
const K3 = (2 * Math.PI) / LAMBDA
const PERIOD = 1.5 // 振荡周期（s）
const OMEGA3 = (2 * Math.PI) / PERIOD
const V3 = LAMBDA / PERIOD
const SHELL_GAP = LAMBDA / 2 // 峰壳与谷壳相距 λ/2
const N_SHELLS = 16
const R_SHELL_MAX = 9.9
const TEX = 384 // 地面剖面纹理分辨率
const FLOOR_SIZE = 16
const PX2U = FLOOR_SIZE / TEX
const FENCE_SEGS = 150
const FENCE_R0 = 0.55
const FENCE_R1 = 8.8
const FENCE_H = 1.5 // 场值→围栏高度
const LOOK = new THREE.Vector3(0, 0.9, 0)
const UP = new THREE.Vector3(0, 1, 0)

/* 红 = 波峰壳（+E₀），蓝 = 波谷壳（−E₀） */
const PEAK_COLOR = new THREE.Color(1.0, 0.42, 0.24)
const TROUGH_COLOR = new THREE.Color(0.31, 0.5, 1.0)

/* 球壳着色器：Fresnel 边缘发光（厚实的肥皂泡质感）+ 可剖切 */
const shellVert = `
#include <clipping_planes_pars_vertex>
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  #include <clipping_planes_vertex>
  gl_Position = projectionMatrix * mvPosition;
}`

const shellFrag = `
#include <clipping_planes_pars_fragment>
uniform vec3 uColor;
uniform float uAlpha;
uniform vec3 uCam;
varying vec3 vN;
varying vec3 vW;
void main() {
  #include <clipping_planes_fragment>
  vec3 V = normalize(uCam - vW);
  float ndv = abs(dot(V, normalize(vN)));
  float rim = pow(1.0 - ndv, 1.8);
  float a = uAlpha * (0.12 + 1.5 * rim);
  gl_FragColor = vec4(uColor, clamp(a, 0.0, 0.95));
}`

/* 横幅配色（按事件类别） */
const TONE: Record<string, string> = {
  peak: " border border-orange-400/50 bg-orange-400/15 text-orange-200",
  zero: " border border-sky-300/50 bg-sky-300/15 text-sky-100",
  trough: " border border-blue-400/50 bg-blue-400/15 text-blue-200",
  rise: " border border-white/10 bg-white/5 text-zinc-300",
  fall: " border border-white/10 bg-white/5 text-zinc-300",
}

const DIV_LUT = buildDivergingLut32()

/* ---------------- 组件 ---------------- */
export function Wavefront3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scopeRef = useRef<HTMLCanvasElement | null>(null)
  const probeTagRef = useRef<HTMLDivElement | null>(null)
  const probeBadgeRef = useRef<HTMLSpanElement | null>(null)
  const probeERef = useRef<HTMLSpanElement | null>(null)
  const probeBarRef = useRef<HTMLDivElement | null>(null)
  const [paused, setPaused] = useState(false)
  const [showFloor, setShowFloor] = useState(true)
  const [cutaway, setCutaway] = useState(true)
  const [fenceOn, setFenceOn] = useState(true)
  const [autoOrbit, setAutoOrbit] = useState(true)
  const [dragged, setDragged] = useState(false)
  const [glError, setGlError] = useState(false)
  const [probeDist, setProbeDist] = useState(3.2)

  const st = useRef<{
    t: number
    last: number
    paused: boolean
    showFloor: boolean
    cutaway: boolean
    fenceOn: boolean
    probeDist: number
    visible: boolean
    autoRotate: boolean
    theta: number
    phi: number
    radius: number
    dragging: boolean
    px: number
    py: number
    floorMesh: THREE.Mesh | null
    fenceGroup: THREE.Group | null
  }>({
    t: 0,
    last: 0,
    paused: false,
    showFloor: true,
    cutaway: true,
    fenceOn: true,
    probeDist: 3.2,
    visible: true,
    autoRotate: true,
    theta: -0.65,
    phi: 0.4,
    radius: 12.6,
    dragging: false,
    px: 0,
    py: 0,
    floorMesh: null,
    fenceGroup: null,
  })

  useEffect(() => {
    st.current.paused = paused
  }, [paused])
  useEffect(() => {
    st.current.showFloor = showFloor
    if (st.current.floorMesh) st.current.floorMesh.visible = showFloor
  }, [showFloor])
  useEffect(() => {
    st.current.cutaway = cutaway
  }, [cutaway])
  useEffect(() => {
    st.current.fenceOn = fenceOn
    if (st.current.fenceGroup) st.current.fenceGroup.visible = fenceOn
  }, [fenceOn])
  useEffect(() => {
    st.current.autoRotate = autoOrbit
  }, [autoOrbit])
  useEffect(() => {
    st.current.probeDist = probeDist
  }, [probeDist])

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
    renderer.setClearColor(0x070b09, 1)
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.localClippingEnabled = true

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x070b09, 0.03)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220)

    const disposables: Array<{ dispose: () => void }> = []

    /* ---- 地面剖面：红=正、蓝=负，叠加 λ 刻度环 ---- */
    const texCanvas = document.createElement("canvas")
    texCanvas.width = TEX
    texCanvas.height = TEX
    const tctx = texCanvas.getContext("2d")
    if (!tctx) {
      queueMicrotask(() => setGlError(true))
      return
    }
    const floorImg = tctx.createImageData(TEX, TEX)
    const floorBuf = new Uint32Array(floorImg.data.buffer)
    const floorTex = new THREE.CanvasTexture(texCanvas)
    floorTex.minFilter = THREE.LinearFilter
    floorTex.generateMipmaps = false
    disposables.push(floorTex)

    const drawFloor = (t: number) => {
      const half = TEX / 2
      let i = 0
      for (let py = 0; py < TEX; py++) {
        const dy = (py - half) * PX2U
        const dy2 = dy * dy
        for (let px = 0; px < TEX; px++, i++) {
          const dx = (px - half) * PX2U
          const r = Math.sqrt(dx * dx + dy2)
          let v = 0
          if (r < 8) {
            const edge = r > 6.3 ? 1 - Math.min(1, (r - 6.3) / 1.6) : 1
            /* 振幅 ∝ 1/r（真空只稀释不损耗） */
            const amp = Math.min(1, 2.1 / Math.max(r, 0.35)) * edge
            v = Math.cos(K3 * r - OMEGA3 * t) * amp
          }
          floorBuf[i] = DIV_LUT[((v + 1) * 127.5) | 0]
        }
      }
      tctx.putImageData(floorImg, 0, 0)
      /* λ 刻度环 + 标注（比例尺：让“球有多大、跑多快”可衡量） */
      const cx = TEX / 2
      const cy = TEX / 2
      tctx.strokeStyle = "rgba(255,255,255,0.10)"
      tctx.setLineDash([4, 6])
      tctx.lineWidth = 1
      tctx.font = "10px ui-sans-serif, system-ui, sans-serif"
      tctx.fillStyle = "rgba(255,255,255,0.34)"
      tctx.textAlign = "left"
      for (let m = 1; m <= 7; m++) {
        const rr = (m * LAMBDA) / PX2U
        if (rr > TEX / 2 - 3) break
        tctx.beginPath()
        tctx.arc(cx, cy, rr, 0, Math.PI * 2)
        tctx.stroke()
        const ax = cx + Math.cos(-2.35) * rr
        const ay = cy + Math.sin(-2.35) * rr
        tctx.fillText(`${m}λ`, ax + 2, ay - 2)
      }
      tctx.setLineDash([])
      floorTex.needsUpdate = true
    }

    const floorGeo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE)
    floorGeo.rotateX(-Math.PI / 2)
    const floorMat = new THREE.MeshBasicMaterial({ map: floorTex })
    disposables.push(floorGeo, floorMat)
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.renderOrder = 0
    scene.add(floorMesh)
    st.current.floorMesh = floorMesh

    /* ---- 剖切平面：永远朝向相机剖开，直接看见内部嵌套层 ---- */
    const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6)

    /* ---- 红峰蓝谷的膨胀球壳（Fresnel 边缘发光 + 可剖切） ---- */
    const shellGeo = new THREE.SphereGeometry(1, 48, 30)
    disposables.push(shellGeo)
    const shells: THREE.Mesh[] = []
    const shellMats: THREE.ShaderMaterial[] = []
    for (let n = 0; n < N_SHELLS; n++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: shellVert,
        fragmentShader: shellFrag,
        uniforms: {
          uColor: { value: (n % 2 === 0 ? PEAK_COLOR : TROUGH_COLOR).clone() },
          uAlpha: { value: 0.4 },
          uCam: { value: new THREE.Vector3() },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        clipping: true,
        clippingPlanes: [cutPlane],
      })
      disposables.push(mat)
      const m = new THREE.Mesh(shellGeo, mat)
      m.renderOrder = 2
      m.visible = false
      scene.add(m)
      shells.push(m)
      shellMats.push(mat)
    }

    /* ---- 点光源 + 暖色光晕 ---- */
    const srcGeo = new THREE.SphereGeometry(0.09, 16, 12)
    const srcMat = new THREE.MeshBasicMaterial({ color: 0xfff3e4 })
    disposables.push(srcGeo, srcMat)
    const source = new THREE.Mesh(srcGeo, srcMat)
    scene.add(source)

    const glowTex = makeGlowTexture()
    disposables.push(glowTex)
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
    disposables.push(glowMat)
    const glow = new THREE.Sprite(glowMat)
    glow.scale.setScalar(1.7)
    scene.add(glow)

    /* ---- 立体围栏：沿一条半径把场值 E 立起来（正红负蓝），探针骑在栏顶 ---- */
    const fenceGroup = new THREE.Group()
    scene.add(fenceGroup)
    st.current.fenceGroup = fenceGroup

    const fenceVertCount = (FENCE_SEGS + 1) * 2
    const fencePosArr = new Float32Array(fenceVertCount * 3)
    const fenceColArr = new Float32Array(fenceVertCount * 3)
    const fenceIdx: number[] = []
    for (let i = 0; i < FENCE_SEGS; i++) {
      const b0 = i * 2
      const t0 = i * 2 + 1
      const b1 = (i + 1) * 2
      const t1 = (i + 1) * 2 + 1
      fenceIdx.push(b0, t0, b1, t0, t1, b1)
    }
    const fenceGeo = new THREE.BufferGeometry()
    const fencePosAttr = new THREE.BufferAttribute(fencePosArr, 3)
    const fenceColAttr = new THREE.BufferAttribute(fenceColArr, 3)
    fencePosAttr.setUsage(THREE.DynamicDrawUsage)
    fenceColAttr.setUsage(THREE.DynamicDrawUsage)
    fenceGeo.setAttribute("position", fencePosAttr)
    fenceGeo.setAttribute("color", fenceColAttr)
    fenceGeo.setIndex(fenceIdx)
    const fenceMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    disposables.push(fenceGeo, fenceMat)
    fenceGroup.add(new THREE.Mesh(fenceGeo, fenceMat))

    const topLinePos = new Float32Array((FENCE_SEGS + 1) * 3)
    const topLineGeo = new THREE.BufferGeometry()
    const topLineAttr = new THREE.BufferAttribute(topLinePos, 3)
    topLineAttr.setUsage(THREE.DynamicDrawUsage)
    topLineGeo.setAttribute("position", topLineAttr)
    const topLineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    disposables.push(topLineGeo, topLineMat)
    fenceGroup.add(new THREE.Line(topLineGeo, topLineMat))

    /* 探针：骑在围栏顶上的小球（高度 = 此刻场值） */
    const probeGeo = new THREE.SphereGeometry(0.12, 16, 12)
    const probeMat = new THREE.MeshBasicMaterial({ color: 0xfff3e8 })
    disposables.push(probeGeo, probeMat)
    const probe = new THREE.Mesh(probeGeo, probeMat)
    probe.renderOrder = 4
    fenceGroup.add(probe)

    const probeGlowMat = new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.5,
    })
    disposables.push(probeGlowMat)
    const probeGlow = new THREE.Sprite(probeGlowMat)
    probeGlow.scale.setScalar(0.55)
    probeGlow.renderOrder = 4
    fenceGroup.add(probeGlow)

    const guidePos = new Float32Array(6)
    const guideGeo = new THREE.BufferGeometry()
    const guideAttr = new THREE.BufferAttribute(guidePos, 3)
    guideAttr.setUsage(THREE.DynamicDrawUsage)
    guideGeo.setAttribute("position", guideAttr)
    const guideMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    })
    disposables.push(guideGeo, guideMat)
    fenceGroup.add(new THREE.Line(guideGeo, guideMat))

    const footGeo = new THREE.RingGeometry(0.14, 0.2, 32)
    footGeo.rotateX(-Math.PI / 2)
    const footMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
    disposables.push(footGeo, footMat)
    const foot = new THREE.Mesh(footGeo, footMat)
    foot.position.y = 0.015
    fenceGroup.add(foot)

    /* 围栏 + 探针逐帧更新 */
    const updateFence = (t: number, rp: number) => {
      for (let i = 0; i <= FENCE_SEGS; i++) {
        const r = FENCE_R0 + (i / FENCE_SEGS) * (FENCE_R1 - FENCE_R0)
        const edge = r > 7.6 ? Math.max(0, 1 - (r - 7.6) / 1.2) : 1
        const v =
          Math.cos(K3 * r - OMEGA3 * t) * Math.min(1, 1.7 / Math.max(r, 0.5)) * edge
        const y = v * FENCE_H
        const bi = i * 2 * 3
        const ti = (i * 2 + 1) * 3
        fencePosArr[bi] = r
        fencePosArr[bi + 1] = 0
        fencePosArr[bi + 2] = 0
        fencePosArr[ti] = r
        fencePosArr[ti + 1] = y
        fencePosArr[ti + 2] = 0
        const m = 0.25 + 0.75 * Math.min(1, Math.abs(v) * 1.4)
        fenceColArr[bi] = 0.1
        fenceColArr[bi + 1] = 0.1
        fenceColArr[bi + 2] = 0.12
        if (v >= 0) {
          fenceColArr[ti] = m
          fenceColArr[ti + 1] = 0.42 * m
          fenceColArr[ti + 2] = 0.25 * m
        } else {
          fenceColArr[ti] = 0.32 * m
          fenceColArr[ti + 1] = 0.55 * m
          fenceColArr[ti + 2] = m
        }
        topLinePos[i * 3] = r
        topLinePos[i * 3 + 1] = y
        topLinePos[i * 3 + 2] = 0
      }
      fencePosAttr.needsUpdate = true
      fenceColAttr.needsUpdate = true
      topLineAttr.needsUpdate = true
      /* 探针：固定半径处，高度 = 此刻场值（示波器画的正是它） */
      const vp =
        Math.cos(K3 * rp - OMEGA3 * t) * Math.min(1, 1.7 / Math.max(rp, 0.5))
      const yp = vp * FENCE_H
      probe.position.set(rp, yp, 0)
      probeGlow.position.copy(probe.position)
      guidePos[0] = rp
      guidePos[1] = 0
      guidePos[2] = 0
      guidePos[3] = rp
      guidePos[4] = yp
      guidePos[5] = 0
      guideAttr.needsUpdate = true
      foot.position.set(rp, 0.015, 0)
      return yp
    }

    /* ---- 示波器 2D 画布 ---- */
    const scopeCanvas = scopeRef.current

    /* ---- 尺寸自适应 ---- */
    let cw3 = 0
    let ch3 = 0
    const resize = () => {
      const w = Math.max(280, canvas.clientWidth)
      const h = Math.max(280, canvas.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      cw3 = canvas.clientWidth
      ch3 = canvas.clientHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(
      (es) => {
        st.current.visible = es[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 }
    )
    io.observe(canvas)

    /* ---- 读数横幅 ---- */
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
      if (probeBarRef.current) {
        probeBarRef.current.style.width = `${(((eP + 1) / 2) * 100).toFixed(1)}%`
      }
    }

    const tmpV = new THREE.Vector3()
    const dVec = new THREE.Vector3()
    const fwd = new THREE.Vector3()
    const rightV = new THREE.Vector3()

    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const s = st.current
      const dt = Math.min(0.05, (now - s.last) / 1000 || 0.016)
      s.last = now
      if (!s.visible) return
      if (!s.paused) {
        s.t += dt
        if (s.autoRotate && !s.dragging) s.theta += 0.1 * dt
      }

      /* 相机 */
      camera.position.set(
        s.radius * Math.cos(s.phi) * Math.cos(s.theta),
        s.radius * Math.sin(s.phi),
        s.radius * Math.cos(s.phi) * Math.sin(s.theta)
      )
      camera.lookAt(LOOK)

      /* 剖切：朝向相机剖开近半，看进内部（关掉则完全不剖） */
      if (s.cutaway) {
        dVec.copy(camera.position).sub(LOOK).normalize()
        cutPlane.normal.copy(dVec).negate()
        cutPlane.constant = dVec.dot(LOOK)
      } else {
        cutPlane.constant = 1e6
      }

      /* 围栏始终正对相机（转到大画面里总能读出完整正弦） */
      fwd.copy(LOOK).sub(camera.position).normalize()
      rightV.crossVectors(fwd, UP)
      rightV.y = 0
      if (rightV.lengthSq() < 1e-6) rightV.set(1, 0, 0)
      rightV.normalize()
      fenceGroup.rotation.y = Math.atan2(-rightV.z, rightV.x)

      /* 球壳：峰红 / 谷蓝，一层隔一层向外膨胀；越远越淡 = E₀ ∝ 1/r */
      const rBase = (V3 * s.t) % SHELL_GAP
      for (let n = 0; n < N_SHELLS; n++) {
        const r = rBase + n * SHELL_GAP + 0.001
        const m = shells[n]
        if (r < 0.07 || r > R_SHELL_MAX) {
          m.visible = false
          continue
        }
        m.visible = true
        m.scale.setScalar(r)
        const mat = shellMats[n]
        mat.uniforms.uAlpha.value = Math.min(0.5, 0.85 / Math.max(r, 0.8))
        mat.uniforms.uCam.value.copy(camera.position)
      }

      if (s.showFloor) drawFloor(s.t)

      const dP = s.probeDist
      const yp = updateFence(s.t, dP)

      renderer.render(scene, camera)

      /* 示波器 + 读数 */
      const phiP = K3 * dP - OMEGA3 * s.t
      const eP = Math.cos(phiP)
      const rising = Math.sin(phiP) > 0
      if (scopeCanvas)
        drawFieldScope(scopeCanvas, {
          tNow: s.t,
          dist: dP,
          K: K3,
          omega: OMEGA3,
          period: PERIOD,
          paused: s.paused,
        })
      updateReadouts(eP, rising, s.paused)

      /* 探针标签跟随投影 */
      const tag = probeTagRef.current
      if (tag && cw3 > 0 && ch3 > 0) {
        if (!s.fenceOn) {
          tag.style.opacity = "0"
        } else {
          probe.getWorldPosition(tmpV).project(camera)
          tag.style.transform = `translate(${((tmpV.x * 0.5 + 0.5) * cw3).toFixed(1)}px, ${(
            (-tmpV.y * 0.5 + 0.5) * ch3 -
            18
          ).toFixed(1)}px)`
          tag.style.opacity = tmpV.z < 1 ? "1" : "0"
        }
      }

      /* 自检钩子（供自动化验证） */
      ;(window as unknown as { __w3d?: object }).__w3d = {
        t: s.t,
        E: eP,
        d: dP,
        probeY: yp,
        theta: s.theta,
        radius: s.radius,
        auto: s.autoRotate,
        cutaway: s.cutaway,
        fence: s.fenceOn,
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      delete (window as unknown as { __w3d?: object }).__w3d
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
    s.autoRotate = false
    setAutoOrbit(false)
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
    const s = st.current
    s.radius = Math.min(24, Math.max(7, s.radius * f))
  }
  const resetView = () => {
    const s = st.current
    s.theta = -0.65
    s.phi = 0.4
    s.radius = 12.6
    s.autoRotate = true
    setAutoOrbit(true)
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-zinc-900/60 shadow-2xl shadow-orange-950/30">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-zinc-100 sm:text-xl">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              动画 ①·3D · 剖开看球面波：红峰蓝谷，向四面八方跑
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              真正的点光源向<b className="text-zinc-200">四面八方</b>发光。这里把整串球壳
              <b className="text-zinc-200">剖开一角</b>直接看进内部：
              <b className="text-orange-300">红壳 = 波峰（E = +E<sub>0</sub>）</b>，
              <b className="text-blue-300">蓝壳 = 波谷（E = −E<sub>0</sub>）</b>，
              一层隔一层、以同一速度向外膨胀（相邻同色壳相距 λ，红蓝相邻相距 λ/2）；
              越远越淡，是振幅按 <b className="text-zinc-200">1/r</b> 被摊薄（稀释，不是损耗）。
              地面剖面用同一套红蓝画正负；<b className="text-zinc-200">立体围栏</b>把一根半径上的场值
              <b className="text-zinc-200">立起来</b>——起伏的最高点永远落在红壳上、最低点落在蓝壳上：
              每根半径都是一条正弦。想看每层壳的剖面长什么样？可先玩页面更下方的
              <b className="text-zinc-200">『剖面立起来』</b>动画再回来。
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
            className="block h-[340px] w-full cursor-grab touch-pan-y sm:h-[440px]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {!glError && (
            <div
              ref={probeTagRef}
              className="pointer-events-none absolute left-0 top-0 rounded-full border border-white/25 bg-black/60 px-1.5 py-0.5 text-[10px] leading-none text-zinc-100 backdrop-blur-sm"
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
            红壳 = 波峰壳（E = +E<sub>0</sub>）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            蓝壳 = 波谷壳（E = −E<sub>0</sub>）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-black" />
            黑环 = 过零（零壳经过处）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-gradient-to-br from-red-400 to-blue-500" />
            围栏 = 沿半径立起来的场值
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-red-100 to-red-500" />
            探针 = 定点观察（读数见示波器）
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          <div className="flex items-center gap-2">
            <Switch
              id="cut3d"
              checked={cutaway}
              onCheckedChange={setCutaway}
              aria-label="剖开球壳"
            />
            <Label htmlFor="cut3d" className="cursor-pointer text-xs text-zinc-400">
              剖开球壳（看内部）
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="floor3d"
              checked={showFloor}
              onCheckedChange={setShowFloor}
              aria-label="显示地面剖面"
            />
            <Label htmlFor="floor3d" className="cursor-pointer text-xs text-zinc-400">
              地面剖面（红=正 蓝=负）
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="fence3d"
              checked={fenceOn}
              onCheckedChange={setFenceOn}
              aria-label="显示立体围栏"
            />
            <Label htmlFor="fence3d" className="cursor-pointer text-xs text-zinc-400">
              立体围栏（半径上的正弦）
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="orbit3d"
              checked={autoOrbit}
              onCheckedChange={setAutoOrbit}
              aria-label="自动环绕"
            />
            <Label htmlFor="orbit3d" className="cursor-pointer text-xs text-zinc-400">
              自动环绕
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <Label htmlFor="probe3d-dist" className="cursor-pointer text-xs text-zinc-400">
              探针距离
            </Label>
            <Slider
              id="probe3d-dist"
              value={[probeDist]}
              min={0.6}
              max={8.4}
              step={0.1}
              onValueChange={(v) => setProbeDist(v[0])}
              className="w-24 sm:w-28"
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

        {/* 探针示波器：定点视角——正弦从哪来、何时换向 */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Activity className="h-3.5 w-3.5 text-orange-300" />
              探针示波器 · 盯住一个点：峰、零、谷依次扫过它
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
            <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                ref={probeBarRef}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-zinc-500 to-red-400"
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-zinc-500">
            曲线走到<b className="text-orange-300">最高点</b> = 波峰壳扫过探针；
            <b className="text-zinc-200">穿过中线</b> = 零壳扫过（E = 0，
            <b className="text-zinc-200">电场在此切换方向</b>）；
            <b className="text-blue-300">最低点</b> = 波谷壳扫过。
            「峰→零→谷→零」每 T/4 换一班岗，读数 +E<sub>0</sub>→0→−E<sub>0</sub>→0
            ——你在定点看到的那条正弦，就是这支队伍依次碾过探针的记录（追问⑥的答案就在这行小字里）。
          </p>
        </div>

        <p className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-300">
          三个要点：① 光不只在&ldquo;水面&rdquo;上跑——红峰壳与蓝谷壳一层隔一层，
          在<b className="text-zinc-100">每个方向</b>上以同一速度膨胀（相邻同色壳相距 λ，红蓝相邻相距 λ/2）；
          ② 沿<b className="text-zinc-100">任何一条穿过光源的直线</b>看（围栏画的正是这条线），
          场值都是一根正弦——最高点永远落在红壳上、最低点落在蓝壳上、过零落在两壳正中；
          ③ &ldquo;换向&rdquo;只发生在过零处：围栏从红区滑向蓝区，必须穿过高度为 0 的那一刻——
          那正是追问⑥要讲的&ldquo;零壳&rdquo;。
        </p>
      </CardContent>
    </Card>
  )
}
