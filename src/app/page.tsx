import { WavefrontIntro } from "@/components/coherence/wavefront-intro"
import { Wavefront3D } from "@/components/coherence/wavefront-3d"
import { WavefrontRelief } from "@/components/coherence/wave-relief"
import { WavefrontCoherence } from "@/components/coherence/wavefront-coherence"
import { DoubleSlitLab } from "@/components/coherence/double-slit-lab"
import { FadeIn } from "@/components/coherence/fade-in"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Activity,
  Waves,
  Shuffle,
  Lightbulb,
  MoveVertical,
  Zap,
  Sun,
  Star,
  Ruler,
  FlaskConical,
  ChevronDown,
  Sparkles,
  Hand,
  MousePointer2,
  LineChart,
  Timer,
  Aperture,
  ScanLine,
  CircleDot,
  MoveHorizontal,
  ArrowLeftRight,
  Radio,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "#wavefront", label: "什么是波前" },
  { href: "#concept", label: "核心概念" },
  { href: "#demo", label: "核心动画" },
  { href: "#lab", label: "双缝实验" },
  { href: "#quant", label: "定量与实例" },
  { href: "#compare", label: "对比总结" },
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* ---------------- 顶部导航 ---------------- */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Waves className="h-4.5 w-4.5 text-emerald-400" />
            <span>空间相干性 · 动画讲解</span>
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="页面导航">
            {NAV_ITEMS.map((it) => (
              <a
                key={it.href}
                href={it.href}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
              >
                {it.label}
              </a>
            ))}
          </nav>
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            波动光学
          </Badge>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(52,211,153,0.16) 0 1px, transparent 1px 46px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
            <FadeIn className="flex flex-col items-center text-center">
              <Badge
                variant="outline"
                className="mb-5 border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                五个交互动画 · 拖一拖就懂
              </Badge>
              <h1 className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
                空间相干性
              </h1>
              <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-zinc-400 sm:text-xl">
                它问的是：<b className="text-zinc-100">同一道光波的波前上，横向两点是否&ldquo;步调一致&rdquo;</b>。
                这决定了光能不能发生干涉、能不能形成条纹。
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
                还不熟悉&ldquo;波前&rdquo;这个术语？下面第一节动画先把它讲透。
              </p>
              <div className="mt-10 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-5 text-left">
                  <div className="flex items-center gap-2 font-semibold text-emerald-300">
                    <Waves className="h-5 w-5" />
                    有空间相干性
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    波前上任意两点的<b className="text-emerald-200">相位差恒定</b>——像阅兵队列一样整齐。
                    后果：双缝干涉条纹清晰稳定，激光全息、干涉测量都靠它。
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.07] p-5 text-left">
                  <div className="flex items-center gap-2 font-semibold text-rose-300">
                    <Shuffle className="h-5 w-5" />
                    没有空间相干性
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    横向两点的<b className="text-rose-200">相位差随机乱跳</b>——各点&ldquo;各跳各的&rdquo;。
                    后果：干涉条纹被平均抹平，阳光、灯光照双缝看不到条纹。
                  </p>
                </div>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="bg-emerald-600 px-6 text-white hover:bg-emerald-500"
                >
                  <a href="#demo">观看核心动画</a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/15 bg-transparent px-6 text-zinc-200 hover:bg-white/10 hover:text-white"
                >
                  <a href="#lab">直接看双缝实验</a>
                </Button>
              </div>
            </FadeIn>
            <div className="mt-14 flex justify-center text-zinc-600">
              <ChevronDown className="h-6 w-6 animate-bounce" aria-hidden />
            </div>
          </div>
        </section>

        {/* ---------------- 什么是波前 ---------------- */}
        <section id="wavefront" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                先回答：波前是什么？
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-zinc-400">
                整页都在说&ldquo;波前上的两点&rdquo;，它到底是什么？一句话：
                <b className="text-zinc-200">同一时刻，振动相位完全相同的点连成的面，叫波前（wavefront），也叫等相位面</b>。
                先看 2D 剖面动画把它画出来——再看 3D 视角：点光源的球面波被剖开一角，红峰蓝谷一圈圈向四面八方跑；
                追问链的最下方，还有一张把剖面&ldquo;立起来&rdquo;的立体起伏动画——波峰、波谷、过零的零壳全都看得见，还能用探针盯住一个定点。
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="mt-8">
              <WavefrontIntro />
            </FadeIn>
            <FadeIn delay={0.08} className="mt-6">
              <Wavefront3D />
            </FadeIn>
            <FadeIn delay={0.06} className="mt-6">
              <Alert className="border-emerald-500/30 bg-emerald-500/[0.07] text-zinc-200">
                <Activity className="h-5 w-5 !text-emerald-400" />
                <AlertTitle className="text-sm font-semibold text-emerald-200">
                  追问：传播中为什么会&ldquo;一明一暗&rdquo;？光是一段一段发出的吗？
                </AlertTitle>
                <AlertDescription className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-zinc-300">
                  <p>
                    <b className="text-zinc-100">① 明暗环只是&ldquo;相位快照&rdquo;。</b>
                    动画把每一点的瞬时电场直接画成亮度：波峰最亮、波谷最暗。同一瞬间，不同距离的点处在振荡的不同阶段，
                    于是环环相间——相邻亮环间距 = λ。
                  </p>
                  <p>
                    <b className="text-zinc-100">② 光不是一段一段发出的。</b>
                    光源在连续振荡，波场在时间与空间上都连续。波前壳之间并非&ldquo;空档&rdquo;——那里的点只是此刻不在峰值，
                    下一刻就到；发射与传播全程没有间歇。
                  </p>
                  <p>
                    <b className="text-zinc-100">③ 变亮与变暗都是连续渐变。</b>
                    盯住任一点（用上面 3D 动画的&ldquo;探针示波器&rdquo;），它的电场沿正弦曲线平滑摆动，最亮与最暗之间无任何跳变。
                    真实光每秒振荡约 5×10<sup>14</sup> 次，眼睛只能看到时间平均后的恒定亮度——动画相当于把这一切放慢了万亿倍，
                    让你直接看到&ldquo;场&rdquo;本身。
                  </p>
                  <p className="text-zinc-400">
                    顺带一提：若你指的是&ldquo;越传越暗&rdquo;——那是能量守恒：同样的能量摊在越来越大的球面上，
                    强度 ∝ 1/r<sup>2</sup>（3D 动画里球壳越远越淡，画的就是它）。
                  </p>
                </AlertDescription>
              </Alert>
            </FadeIn>
            <FadeIn delay={0.07} className="mt-6">
              <Alert className="border-sky-500/30 bg-sky-500/[0.07] text-zinc-200">
                <Zap className="h-5 w-5 !text-sky-300" />
                <AlertTitle className="text-sm font-semibold text-sky-200">
                  再追问：光的&ldquo;振荡&rdquo;到底振的是什么？振幅变化在物理上是什么样子？
                </AlertTitle>
                <AlertDescription className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-zinc-300">
                  <p>
                    <b className="text-zinc-100">① 振的是电场，不是光源在晃。</b>
                    光是电磁波：波所及的每一点，那里的电场强度 E 都在 +E<sub>0</sub> ↔ −E<sub>0</sub> 之间来回摆动
                    （每秒约 5×10<sup>14</sup> 次；磁场也在振、方向与 E 垂直，但让物质&ldquo;感光&rdquo;的主要是电场）。
                    <b className="text-zinc-100">振幅 E<sub>0</sub></b>（单位：伏特/米）就是摆动能到的最大幅度——它刻画这束光有多强。
                    动画里每个像素的明暗，画的正是 E 的瞬时值。
                  </p>
                  <p>
                    <b className="text-zinc-100">② 最直接的物理表现：推动电荷。</b>
                    电场对电荷施力 F = qE：光经过时，物质里的电子像水面上的软木塞，被推着来回振动。
                    无线电波就是慢了约 10<sup>8</sup> 倍的&ldquo;光&rdquo;——天线里电子的摆动直接变成电流，
                    示波器上看到的正弦曲线就是 E(t) 本身。3D 动画下方的<b className="text-zinc-200">探针示波器</b>、
                    动画②的 E<sub>1</sub>/E<sub>2</sub> 曲线，画的都是这条真实的振荡曲线。
                  </p>
                  <p>
                    <b className="text-zinc-100">③ 眼睛看到的样子：振幅的平方。</b>
                    没有任何探测器跟得上每秒 10<sup>14</sup> 次的单次摆动；眼睛、相机、光电管都只能对数百万个周期取平均——
                    单位时间通过单位面积的能量（强度）∝ E<sub>0</sub><sup>2</sup>。所以对眼睛而言，
                    <b className="text-zinc-200">振幅呈现为亮暗</b>：双缝同相处两列波振幅相加（2E<sub>0</sub>）→ 亮 4 倍；
                    反相处振幅抵消 → 全黑。动画③的条纹，就是&ldquo;振幅加法&rdquo;的照片。
                  </p>
                  <p>
                    <b className="text-zinc-100">④ 振幅还随距离连续衰减。</b>
                    球面波把同样的能量摊到面积 4πr<sup>2</sup> 的球面上：E<sub>0</sub> ∝ 1/r、强度 ∝ 1/r<sup>2</sup>
                    ——3D 动画里越远的波前壳越淡，画的就是它。顺带：偏振太阳镜能滤掉一半光，
                    说明这个摆动<b className="text-zinc-200">有方向</b>（E 沿某个横向来回摆），而不是一团无方向的&ldquo;亮度&rdquo;。
                  </p>
                </AlertDescription>
              </Alert>
            </FadeIn>
            <FadeIn delay={0.07} className="mt-6">
              <Alert className="border-violet-500/30 bg-violet-500/[0.07] text-zinc-200">
                <Waves className="h-5 w-5 !text-violet-300" />
                <AlertTitle className="text-sm font-semibold text-violet-200">
                  追问③：亮度跟振幅什么关系？所有光的振幅都一样吗？真空里没有物质在振，波靠什么传播？
                </AlertTitle>
                <AlertDescription className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-zinc-300">
                  <p>
                    <b className="text-zinc-100">① 亮度就是振幅的平方。</b>
                    亮度（强度）∝ E<sub>0</sub><sup>2</sup>，是振幅平方后的时间平均——反过来读：亮度差一亿倍，
                    振幅只差一万倍。同相处两波 E<sub>0</sub>+E<sub>0</sub>=2E<sub>0</sub> 而亮度 ×4，
                    根源就在这层平方关系（上张卡片）。
                  </p>
                  <p>
                    <b className="text-zinc-100">② 振幅并不恒定，不同光之间悬殊到离谱。</b>
                    同一束球面波，振幅沿传播方向按 E<sub>0</sub> ∝ 1/r 连续衰减（3D 动画里越远的球壳越淡）；
                    不同光源更是天差地别：地面阳光 E<sub>0</sub> 约 10<sup>3</sup> V/m 量级，
                    昏暗星光只有约 10<sup>−4</sup> V/m 量级，而 1 W 激光聚焦到 10 µm 光斑可达约
                    3×10<sup>6</sup> V/m——恰好是空气被击穿的场强。前后横跨约<b className="text-zinc-200">十个数量级</b>，
                    所以&ldquo;所有光振幅一样&rdquo;绝不成立；动画里画的恒定振幅，只是理想化的单色波。
                  </p>
                  <p>
                    <b className="text-zinc-100">③ 热光源的振幅还在&ldquo;乱颤&rdquo;。</b>
                    阳光、灯泡这类热光是亿万个原子各自独立发光的叠加：每段波列只发约纳秒量级就戛然而止，
                    总振幅因此在飞秒尺度上随机涨落——这正是动画②中&ldquo;许多随机相位分量叠加&rdquo;的物理根源，
                    也是热光相干性差的根源。激光恰好相反：整束光共享同一套振荡，振幅近乎恒定，所以相干性极好。
                  </p>
                  <p>
                    <b className="text-zinc-100">④ 振的不是物质，是场本身——真空里照样传播。</b>
                    产生：电荷一加速就辐射电磁波（原子内电子跃迁、天线里振荡的电流）。传播：波一旦出发就自我维持——
                    变化的电场激起磁场、变化的磁场又激起电场，二者互相点燃，以光速推进。
                    水波要水、声波要空气，唯独光不需要介质：恒星的光穿过数光年真空落进你眼里。
                    19 世纪物理学家不肯相信&ldquo;没有介质的波&rdquo;，发明了&ldquo;以太&rdquo;，
                    结果迈克耳孙-莫雷实验怎么也找不到它。现代物理的答案：电磁场本身就是充满空间、可以振荡的实体。
                  </p>
                </AlertDescription>
              </Alert>
            </FadeIn>
            <FadeIn delay={0.07} className="mt-6">
              <Alert className="border-amber-500/30 bg-amber-500/[0.07] text-zinc-200">
                <Sun className="h-5 w-5 !text-amber-300" />
                <AlertTitle className="text-sm font-semibold text-amber-200">
                  追问④：真空里会衰减吗？球面波一圈圈放大对吗？它到底怎么&ldquo;振荡&rdquo;？
                </AlertTitle>
                <AlertDescription className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-zinc-300">
                  <p>
                    <b className="text-zinc-100">① 真空只稀释、不损耗。</b>
                    真空中没有介质可供吸收、散射：每个波前球壳携带的总能量一路守恒。但壳的面积 4πr<sup>2</sup>
                    越摊越大，单位面积分到的能量 ∝ 1/r<sup>2</sup>、振幅 ∝ 1/r——
                    3D 动画里球壳越远越淡，画的是<b className="text-zinc-200">稀释</b>而非损耗。
                    若光被约束成理想平行光（平面波），不发散也就不摊薄：在真空中亮度沿途不变
                    （动画①&ldquo;远处看·平面波前&rdquo;模式展示的正是这种局部视角）。
                  </p>
                  <p>
                    <b className="text-zinc-100">② 球面波确实一圈圈匀速放大。</b>
                    光源每过一个周期 T 就诞生一个新波前，以波速 v = λ/T 向外膨胀；
                    相邻波前间距恒为 <b className="text-zinc-200">λ</b>——真空不会把波长拉长。
                    壳的半径越大、面积越大，壳上每点分到的振幅越小：&ldquo;放大&rdquo;与&ldquo;摊薄&rdquo;是同一件事的两面。
                  </p>
                  <p>
                    <b className="text-zinc-100">③ 它&ldquo;振荡&rdquo;的样子，要分三个机位看。</b>
                    <b className="text-zinc-200">定格时间、沿半径扫</b>：场按余弦排布，波峰红壳—过零黑壳—波谷蓝壳依次相间
                    （3D 动画的地面剖面，就是沿这条正弦切的一刀）；<b className="text-zinc-200">定格一点、随时间看</b>：
                    该点在场值 ±E<sub>0</sub>/r 之间平滑摆动，就是探针示波器上那条正弦曲线；
                    <b className="text-zinc-200">整体看</b>：一串壳像肥皂泡一样匀速膨胀，没有哪层壳在&ldquo;抖&rdquo;——
                    抖的是每一点的场值，壳只是等相位点排成的队列在随波前进。
                  </p>
                  <p>
                    <b className="text-zinc-100">④ 摆动方向垂直于传播方向。</b>
                    每一点的电场沿垂直于半径的横向来回摆（光是横波）；太阳光各个横向方向都有、随机取向，故称自然光。
                    一句话归拢：<b className="text-zinc-200">环纹 = 相位沿半径排队，明暗 = 场值随时间摆动，渐淡 = 振幅包络 1/r</b>。
                  </p>
                </AlertDescription>
              </Alert>
            </FadeIn>
            <FadeIn delay={0.07} className="mt-6">
              <Alert className="border-rose-500/30 bg-rose-500/[0.07] text-zinc-200">
                <Lightbulb className="h-5 w-5 !text-rose-300" />
                <AlertTitle className="text-sm font-semibold text-rose-200">
                  追问⑤：水波有看得见的波峰波谷，球面波的&ldquo;峰&rdquo;和&ldquo;谷&rdquo;长什么样？
                </AlertTitle>
                <AlertDescription className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-zinc-300">
                  <p>
                    <b className="text-zinc-100">① 先把两张账对齐。</b>
                    水波振荡的是<b className="text-zinc-200">水面高度 h</b>——看得见的位移：波峰 = h 最高，波谷 = h 最低。
                    光波振荡的是<b className="text-zinc-200">电场值 E</b>——同样是带正负的量：E = +E<sub>0</sub> 就是波峰，
                    E = −E<sub>0</sub> 就是波谷，过零就是&ldquo;水面平了&rdquo;。结构完全同构，
                    只是光振的不是看得见的表面，而是场值——所以动画把场值直接画成亮度：
                    <b className="text-zinc-200">最亮 = 波峰，最暗 = 波谷，黑 = 过零</b>（3D 地面剖面里的暗环，就是波谷的剖面）。
                  </p>
                  <p>
                    <b className="text-zinc-100">② 球面波的&ldquo;样子&rdquo;：每根半径都是一根正弦曲线。</b>
                    从点光源向任意方向抽出一条射线，E 场就在垂直于这条射线的平面内画出一根标准正弦——
                    正是教科书上&ldquo;E 与 B 互相垂直着往前走&rdquo;的那张插图。球面波 = 把这根正弦
                    <b className="text-zinc-200">复制到所有方向、同步向外推</b>：
                    所有方向上&ldquo;此刻恰好到 +E<sub>0</sub>&rdquo;的点连成一张球面，就是 3D 动画里那层红壳（波峰壳）；
                    波谷连成蓝壳、过零连成黑壳，峰谷相间、相邻峰壳间距 λ。
                  </p>
                  <p>
                    <b className="text-zinc-100">③ 摆动的方向：都横着摆，但&ldquo;横&rdquo;的平面里没有固定的&ldquo;上&rdquo;。</b>
                    水面只有一个&ldquo;上&rdquo;，所以波峰谷一眼可见；光的&ldquo;上&rdquo;是垂直于半径平面里随便哪个方向——
                    阳光每个波列的摆动方向随机乱换（自然光），画不出稳定的&ldquo;方向图&rdquo;；
                    激光全体沿同一方向摆（线偏振），才画得出教科书那种带箭头的峰谷曲线。
                    所以动画选择画&ldquo;值的大小与正负&rdquo;（亮度），不画箭头——对阳光这才是唯一稳定的性质。
                  </p>
                  <p>
                    <b className="text-zinc-100">④ 水波其实就是&ldquo;二维版球面波&rdquo;。</b>
                    水纹的能量沿圆周 2πr 摊开 → 高度 h ∝ 1/√r；光球面波沿球面 4πr<sup>2</sup> 摊开 → E ∝ 1/r。
                    你从小盯着的涟漪，正是球面波去掉一个维度后的样子——第一眼觉得&ldquo;光像水波&rdquo;的直觉完全正确，
                    只要把圆环换成球壳。
                  </p>
                  <p className="border-t border-white/10 pt-2 text-zinc-400">
                    觉得这几段文字太抽象？下面这张 3D 动画就是本卡片的答案——
                    <b className="text-rose-200">场值立起来变成真实高度</b>：红峰、蓝谷、过零的黑环直接看得见，
                    还能用探针示波器盯住一个点、一键摊平对比动画①的画法。
                  </p>
                </AlertDescription>
              </Alert>
            </FadeIn>
            <FadeIn delay={0.07} className="mt-6">
              <Alert className="border-teal-500/30 bg-teal-500/[0.07] text-zinc-200">
                <ArrowLeftRight className="h-5 w-5 !text-teal-300" />
                <AlertTitle className="text-sm font-semibold text-teal-200">
                  追问⑥：波峰壳&ldquo;穿过&rdquo;我的瞬间，电场就换向吗？
                </AlertTitle>
                <AlertDescription className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-zinc-300">
                  <p>
                    <b className="text-zinc-100">对了一半。</b>
                    &ldquo;波峰壳到达之前，电场是一个方向且不断变大&rdquo;——对（发生在它抵达的最后 T/4）；
                    &ldquo;穿过之后就变成相反方向&rdquo;——不对。
                  </p>
                  <p>
                    <b className="text-zinc-100">峰壳穿过的瞬间，恰是同方向的最大值 +E<sub>0</sub>，此刻并不换向。</b>
                    此后 T/4，场值仍保持原方向、平滑降回 0——这时从你身上扫过的，是跟在峰壳身后 λ/4 处的
                    <b className="text-teal-200">零壳</b>（E = 0 的等相面，下面起伏面上的黑环就是它）。
                    零壳过去，方向才切换为 −；随后反向增大到 −E<sub>0</sub>（谷壳穿过的瞬间），再降回 0。
                    <b className="text-teal-200">换向永远发生在零壳扫过时</b>，从不在峰壳、谷壳穿过的时刻。
                  </p>
                  <p>
                    所以固定一点的读数序列是
                    <b className="text-zinc-100">+E<sub>0</sub> → 0 → −E<sub>0</sub> → 0</b>
                    ——&ldquo;峰→零→谷→零&rdquo;的壳队列每 T/4 换一班岗，依次从你身上碾过，
                    这就是定点看到的那条正弦。水波同理：波峰过去后，软木塞
                    <b className="text-zinc-100">仍浮在水面之上下落</b>，要再过 T/4 才穿过水面（换向）、
                    最后被波谷压到最低。
                  </p>
                  <p className="border-t border-white/10 pt-2 text-zinc-400">
                    上下两张 3D 动画里的<b className="text-zinc-200">探针示波器</b>，都会把
                    &ldquo;波峰壳 / 零壳 / 波谷壳&rdquo;扫过探针的时刻在曲线上逐一打点——
                    对照着看，&ldquo;换向发生在零壳&rdquo;一眼即明。
                  </p>
                </AlertDescription>
              </Alert>
            </FadeIn>
            <FadeIn delay={0.08} className="mt-6">
              <WavefrontRelief />
            </FadeIn>
            <FadeIn delay={0.06} className="mt-6">
              <Alert className="border-fuchsia-500/30 bg-fuchsia-500/[0.07] text-zinc-200">
                <Radio className="h-5 w-5 !text-fuchsia-300" />
                <AlertTitle className="text-sm font-semibold text-fuchsia-200">
                  追问⑦：零壳是光源发出来的，还是相邻波前&ldquo;共同作用&rdquo;出来的？定点换向又是谁造成的？
                </AlertTitle>
                <AlertDescription className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-zinc-300">
                  <p>
                    <b className="text-zinc-100">① 零壳也是光源&ldquo;发&rdquo;出来的——它是&ldquo;源振荡过零那一瞬&rdquo;的外传存档。</b>
                    光源从不一枚一枚地&ldquo;发射壳&rdquo;，它<b className="text-zinc-200">连续发射的是整个振荡过程</b>：
                    源处的场值每个瞬间都在 +E<sub>0</sub> → 0 → −E<sub>0</sub> → 0 地循环，
                    而每个瞬间的状态都以光速 c 外传、<b className="text-zinc-200">永远保持&ldquo;出厂相位&rdquo;</b>——
                    源到 +E<sub>0</sub> 的那一瞬外传成<b className="text-orange-300">红峰壳</b>，
                    源<b className="text-zinc-200">过零</b>的那一瞬外传成<b className="text-zinc-100">零壳</b>，
                    源到 −E<sub>0</sub> 的那一瞬外传成<b className="text-blue-300">蓝谷壳</b>。
                    三种壳地位完全平等，同属一次持续发射；相邻间隔 λ/4，以光速 c 同步外移
                    ——起伏动画里追着环跑的&ldquo;零壳&rdquo;标签、3D 地面上的黑圈，
                    都是这些&ldquo;源过零瞬间&rdquo;的存档。
                  </p>
                  <p>
                    <b className="text-zinc-100">② 不是&ldquo;当前波前与下一个波前共同作用&rdquo;的结果。</b>
                    自由空间里单列球面波传播，每一点的场值都唯一确定：E ∝ (A/r)·cos(kr − ωt)。
                    峰壳、零壳、谷壳只是这个连续函数取 +A / 0 / −A 的<b className="text-zinc-200">等值面</b>——
                    等高线不是&ldquo;两个山坡作用出来的&rdquo;，它只是完整地形的一个标记；
                    壳与壳之间的空间也填满了取中间值的场，并不是空隙。
                    真会&ldquo;共同作用出零点&rdquo;的是<b className="text-fuchsia-200">两列波叠加相消</b>——
                    双缝暗纹、驻波波节（下一节的双缝实验里就能看到）。那是两列波之间的事，
                    不是一列波自己的峰与谷。
                  </p>
                  <p>
                    <b className="text-zinc-100">③ 定点换向的机制：壳队列以 c 整体外移，探针与队列的相对位置一直在变——这个机制对；但换向时刻要认准零壳。</b>
                    队列外移时形状不变，等效于定点以速度 c 在队列中&ldquo;向后穿行&rdquo;，
                    依次被<b className="text-zinc-200">峰→零→谷→零</b>每 T/4 一班地扫过。
                    数学上恰好是 dE/dt = −c·∂E/∂r：
                    <b className="text-zinc-200">定点读数的时间变化，就是空间图样以 c 平移扫过该点</b>。
                    两条可以直接在动画里检验的推论：
                  </p>
                  <p className="pl-3">
                    · <b className="text-zinc-100">定点读数 = 源振荡历史的延迟重放</b>：
                    E(t) = (A/d)·cos(ω(t − d/c))，只延迟 d/c、幅度缩为 A/d
                    ——3D 围栏的起伏越远整体越矮，就是 1/d 在摊薄（稀释不是损耗）；
                  </p>
                  <p className="pl-3">
                    · <b className="text-zinc-100">换向、变化最快都发生在零壳</b>：
                    正弦过零处斜率最大——零壳罩住探针时，读数过零且变化最快；
                    峰/谷壳罩住时，读数反而躺在极值上、变化率为 0
                    （<b className="text-zinc-200">探针最&ldquo;忙&rdquo;的时刻，恰是零壳扫过时</b>）。
                  </p>
                  <p className="border-t border-white/10 pt-2 text-zinc-400">
                    上方两张 3D 动画都能检验：把探针拖到任一距离，盯住示波器——
                    <b className="text-zinc-200">「零」打点处</b>曲线斜着穿过中线（过零换向、变化最快），
                    <b className="text-orange-300">「峰」</b>、<b className="text-blue-300">「谷」</b>打点处曲线恰好躺在最高/最低点（极值、暂稳）。
                    相对位置每变 λ/4，就有一班壳岗从探针身上换过去。
                  </p>
                </AlertDescription>
              </Alert>
            </FadeIn>
            <FadeIn delay={0.05} className="mt-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    icon: <CircleDot className="h-4.5 w-4.5 shrink-0 text-emerald-400" />,
                    title: "定义：等相位面",
                    text: (
                      <>
                        <b className="text-zinc-100">同一时刻、相位相同的所有点</b>连成的曲面。
                        点光源的波前是一族同心球面；剖面图里就是同心圆（3D 动画可旋转确认）。亮环（波峰）是波前，
                        暗环（波谷）也是——相位相同即可，不一定是峰。
                      </>
                    ),
                  },
                  {
                    icon: <MoveHorizontal className="h-4.5 w-4.5 shrink-0 text-amber-400" />,
                    title: "形状与光线",
                    text: (
                      <>
                        波前描绘光的&ldquo;队形&rdquo;，<b className="text-zinc-100">光线永远与波前垂直</b>。
                        离点光源足够远，球面波的局部近似为平面，就是平面波（平行光）；
                        激光束可近似看作平面波。动画里可切换&ldquo;平面波视角&rdquo;。
                      </>
                    ),
                  },
                  {
                    icon: <Ruler className="h-4.5 w-4.5 shrink-0 text-teal-300" />,
                    title: "λ 与运动",
                    text: (
                      <>
                        相邻波前相距一个<b className="text-zinc-100">波长 λ</b>，整个波前以波速 v 向前推进。
                        空间相干性问的就是：这张&ldquo;队形图&rdquo;上，横向不同的点能否保持固定相位差
                        ——这正是下一个动画的主题。
                      </>
                    ),
                  },
                ].map((it, i) => (
                  <div
                    key={it.title}
                    className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    <span className="mt-0.5">{it.icon}</span>
                    <div className="text-sm leading-relaxed text-zinc-400">
                      <div className="mb-1 font-semibold text-zinc-100">{it.title}</div>
                      <p>{it.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------- 核心概念 ---------------- */}
        <section id="concept" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                先把概念说清楚
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-zinc-400">
                &ldquo;相干&rdquo;听起来玄，其实就是一个问题：<b className="text-zinc-200">两束（或两处的）光，相位之间有没有稳定的关系？</b>
                下面三张卡片是从定义到判据到成因的完整逻辑链。
              </p>
            </FadeIn>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: <Aperture className="h-5 w-5 text-emerald-400" />,
                  title: "相干性：光场各部分的“默契”",
                  body: (
                    <>
                      相干性衡量光场不同部分之间<b className="text-zinc-100">相位关系是否稳定</b>。
                      它有两个维度：垂直于传播方向（横向）的叫<b className="text-emerald-300">空间相干性</b>，
                      沿传播方向（纵向）的叫<b className="text-amber-300">时间相干性</b>。本页主角是前者。
                    </>
                  ),
                },
                {
                  icon: <MoveVertical className="h-5 w-5 text-emerald-400" />,
                  title: "判据：波前上两点的 Δφ(t)",
                  body: (
                    <>
                      在同一波前上取两点 P₁、P₂，长期观察它们的相位差：
                      <b className="text-zinc-100">恒定 → 空间相干；随机变化 → 不相干</b>。
                      相干宽度 ℓ 内的点保持默契，超出 ℓ 就&ldquo;翻脸不认&rdquo;。
                    </>
                  ),
                },
                {
                  icon: <Lightbulb className="h-5 w-5 text-emerald-400" />,
                  title: "谁说了算：光源的角尺寸 θ",
                  body: (
                    <>
                      光源上每个点都独立发光、初相位随机。光源又小又远（θ 小）时，各点波前几乎重合，波前整齐；
                      光源一大，各点波前互相错叠，波前被&ldquo;搅乱&rdquo;。定量规律：
                      <b className="text-zinc-100">相干宽度 ℓ ≈ λ / θ</b>。
                    </>
                  ),
                },
              ].map((c, i) => (
                <FadeIn key={c.title} delay={i * 0.08}>
                  <Card className="h-full border-white/10 bg-zinc-900/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                        {c.icon}
                        {c.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed text-zinc-400">
                        {c.body}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- 核心动画 ---------------- */}
        <section id="demo" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                亲眼所见：波前的&ldquo;队形&rdquo;
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-zinc-400">
                这个动画直接演示&ldquo;有&rdquo;与&ldquo;没有&rdquo;的区别。
                看什么？<b className="text-zinc-200">下方那条 Δφ 曲线</b>：它是平直的，说明两点相干；
                它乱跳，说明不相干。动画①里你已经见过：单个点源时无论探针放哪，
                Δφ 都恒定；这里把&ldquo;点源变成扩展光源&rdquo;，看 Δφ 如何被搅乱。
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="mt-8">
              <WavefrontCoherence />
            </FadeIn>
            <FadeIn delay={0.05} className="mt-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    icon: <Hand className="h-4.5 w-4.5 shrink-0 text-emerald-400" />,
                    text: (
                      <>
                        <b className="text-zinc-100">有空间相干性（θ 小）</b>：波前像阅兵队列——横向各点步调一致，
                        无论 P₁、P₂ 隔多远，Δφ 都是一条平线。
                      </>
                    ),
                  },
                  {
                    icon: <Shuffle className="h-4.5 w-4.5 shrink-0 text-rose-400" />,
                    text: (
                      <>
                        <b className="text-zinc-100">没有（θ 大）</b>：波前碎成一片，各点&ldquo;各跳各的&rdquo;，
                        Δφ 随机乱跳，两条振动曲线毫无关联。
                      </>
                    ),
                  },
                  {
                    icon: <Ruler className="h-4.5 w-4.5 shrink-0 text-amber-400" />,
                    text: (
                      <>
                        <b className="text-zinc-100">部分相干</b>：间距小于相干宽度 ℓ 的两点仍有默契（P₂ 在绿带内），
                        拖出 ℓ 之外默契就消失。θ 越大，ℓ 越小（ℓ ∝ 1/θ）。
                      </>
                    ),
                  },
                ].map((it, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-400"
                  >
                    <span className="mt-0.5">{it.icon}</span>
                    <p>{it.text}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------- 双缝实验 ---------------- */}
        <section id="lab" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                检验场：杨氏双缝
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-zinc-400">
                空间相干性最经典的&ldquo;试金石&rdquo;。双缝要产生条纹，前提是
                <b className="text-zinc-200">到达 S₁、S₂ 两缝的光彼此相干</b>。
                下面拖动滑杆，亲手把条纹&ldquo;杀死&rdquo;再&ldquo;救活&rdquo;。
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="mt-8">
              <DoubleSlitLab />
            </FadeIn>
            <FadeIn delay={0.05} className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Alert className="border-emerald-500/30 bg-emerald-500/[0.07] text-zinc-200">
                  <FlaskConical className="h-5 w-5 !text-emerald-400" />
                  <AlertTitle className="text-sm font-semibold text-emerald-200">
                    为什么条纹会被抹平？
                  </AlertTitle>
                  <AlertDescription className="mt-1.5 text-sm leading-relaxed text-zinc-300">
                    每个源点<b className="text-zinc-100">自己</b>都能产生一套清晰条纹——只是彼此错位。
                    光源越宽，错位越大；无数套错位条纹叠加平均，光屏上只剩一片均匀亮。
                    勾选动画里的&ldquo;显示每个源点各自的条纹&rdquo;可以亲眼确认这一点。
                  </AlertDescription>
                </Alert>
                <Alert className="border-amber-500/30 bg-amber-500/[0.07] text-zinc-200">
                  <Sun className="h-5 w-5 !text-amber-400" />
                  <AlertTitle className="text-sm font-semibold text-amber-200">
                    历史小注：杨的&ldquo;整流&rdquo;智慧
                  </AlertTitle>
                  <AlertDescription className="mt-1.5 text-sm leading-relaxed text-zinc-300">
                    1801 年托马斯·杨用阳光做双缝实验时，先让阳光穿过一个<b className="text-zinc-100">单孔</b>再照双缝——
                    单孔把扩展光源&ldquo;过滤&rdquo;成近似点源，等于人工制造空间相干性。
                    规律：缝间距越大，越依赖光源够小够远（角尺寸小）。
                  </AlertDescription>
                </Alert>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------- 定量与实例 ---------------- */}
        <section id="quant" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                定量：相干宽度有多大？
              </h2>
            </FadeIn>
            <FadeIn delay={0.05} className="mt-8">
              <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-6 sm:p-8">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="font-mono text-3xl font-bold text-emerald-300 sm:text-4xl">
                    ℓ<sub className="text-lg">coh</sub> ≈ λ / θ
                  </div>
                  <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                    λ 是波长，θ 是光源的<b className="text-zinc-200">角尺寸</b>（从双缝处看光源张开的角度）。
                    均匀圆盘光源则更精确地写作 ℓ ≈ 1.22 λ / θ。光源越小越远（θ 越小），波前上&ldquo;守规矩&rdquo;的范围就越大。
                  </p>
                </div>
              </div>
            </FadeIn>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: <Zap className="h-5 w-5 text-emerald-400" />,
                  title: "激光笔",
                  sub: "θ → 0",
                  body: (
                    <>
                      单横模激光近似&ldquo;整面波前一起振动&rdquo;，相干宽度覆盖整个光束截面。
                      所以随手拿激光笔照双缝，墙上就能看到清晰条纹。
                    </>
                  ),
                },
                {
                  icon: <Sun className="h-5 w-5 text-amber-400" />,
                  title: "太阳光",
                  sub: "θ ≈ 0.53° → ℓ ≈ 0.06 mm",
                  body: (
                    <>
                      以 λ = 550nm 计算，太阳的相干宽度只有约 60μm——和头发丝直径差不多。
                      双缝间距必须比头发丝还细才可能看到条纹，所以杨必须先用单孔滤光。
                    </>
                  ),
                },
                {
                  icon: <Star className="h-5 w-5 text-teal-300" />,
                  title: "恒星光（参宿四）",
                  sub: "θ ≈ 0.047″ → ℓ ≈ 2~3 m",
                  body: (
                    <>
                      恒星角尺寸小到万分之二度。星光飞数百光年到达地球仍高度空间相干——
                      1920 年迈克耳孙正是用 6.1m 基线干涉仪首次测出恒星直径。
                    </>
                  ),
                },
                {
                  icon: <Ruler className="h-5 w-5 text-emerald-400" />,
                  title: "如何“制造”相干性",
                  sub: "三板斧",
                  body: (
                    <>
                      ① 用激光；② 用针孔把扩展光源限制成点源；
                      ③ 离光源远一点（角尺寸变小）。反过来，把缝间距缩到相干宽度以内，也能找回条纹。
                    </>
                  ),
                },
              ].map((c, i) => (
                <FadeIn key={c.title} delay={i * 0.06}>
                  <Card className="h-full border-white/10 bg-zinc-900/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                        {c.icon}
                        <span>{c.title}</span>
                      </CardTitle>
                      <div className="pt-0.5 font-mono text-xs text-emerald-300/80">{c.sub}</div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed text-zinc-400">
                        {c.body}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
            <FadeIn delay={0.1} className="mt-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:w-56">
                  <ScanLine className="h-8 w-8 shrink-0 text-emerald-400" />
                  <div className="font-semibold text-zinc-100">
                    生活判据：看&ldquo;散斑&rdquo;
                    <div className="mt-0.5 text-xs font-normal text-zinc-500">一眼分辨相干光</div>
                  </div>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-zinc-400">
                  激光照在粗糙墙面（白纸、墙壁）上，会看到<b className="text-zinc-200">颗粒状的明暗斑点（散斑）</b>；
                  手电筒或阳光照同一面墙，只有均匀的光斑。因为粗糙面上各点反射的激光彼此相干、随机干涉；
                  非相干光则自我平均，把斑点&ldquo;洗&rdquo;掉了。<b className="text-zinc-200">有散斑 = 高度空间（+时间）相干。</b>
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------- 对比总结 ---------------- */}
        <section id="compare" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                一张表总结：有 vs 没有
              </h2>
            </FadeIn>
            <FadeIn delay={0.08} className="mt-8">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="w-32 text-zinc-400">维度</TableHead>
                      <TableHead className="text-emerald-300">有空间相干性</TableHead>
                      <TableHead className="text-rose-300">没有空间相干性</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_td]:border-white/5">
                    {[
                      ["波前形态", "平直整齐，像阅兵队列", "破碎杂乱，像散场人群"],
                      [
                        "横向两点相位差 Δφ",
                        "恒定不变（Δφ(t) 是平线）",
                        "随机快速跳变（Δφ(t) 乱跳）",
                      ],
                      ["双缝干涉", "清晰、稳定的条纹", "条纹被抹平，只剩均匀亮度"],
                      ["典型光源", "激光、恒星光、经针孔过滤的光", "太阳、白炽灯、大面积 LED"],
                      ["相干宽度 ℓ", "大（激光覆盖全光束；恒星光可达数米）", "小（太阳光约 0.06mm）"],
                      ["如何获得", "缩小角尺寸：用激光 / 加针孔 / 拉远距离", "——（扩展光源天然如此）"],
                    ].map((row) => (
                      <TableRow key={row[0]} className="border-white/5">
                        <TableCell className="font-medium text-zinc-300">{row[0]}</TableCell>
                        <TableCell className="text-zinc-300">{row[1]}</TableCell>
                        <TableCell className="text-zinc-300">{row[2]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </FadeIn>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <FadeIn delay={0.05}>
                <Card className="h-full border-emerald-500/20 bg-emerald-500/[0.05]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                      <MoveVertical className="h-5 w-5 text-emerald-400" />
                      空间相干性（横向）
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed text-zinc-400">
                      同一时刻、<b className="text-zinc-200">垂直于传播方向</b>的两点之间是否保持固定相位关系。
                      由<b className="text-zinc-200">光源角尺寸</b>决定，度量为相干宽度 ℓ ≈ λ/θ。
                      本页动画②演示的就是它。
                    </CardDescription>
                  </CardContent>
                </Card>
              </FadeIn>
              <FadeIn delay={0.12}>
                <Card className="h-full border-amber-500/20 bg-amber-500/[0.05]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                      <Timer className="h-5 w-5 text-amber-400" />
                      时间相干性（纵向）
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed text-zinc-400">
                      同一点<b className="text-zinc-200">先后两个时刻</b>（或沿传播方向相距两点）之间的相位关系。
                      由<b className="text-zinc-200">光谱宽度</b>决定，度量为相干长度，约 λ²/Δλ。
                      单频激光可达公里级，白光只有微米级。激光两种相干性都高，阳光两种都低。
                    </CardDescription>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
            <FadeIn delay={0.15} className="mt-6">
              <Alert className="border-emerald-500/30 bg-emerald-500/[0.08]">
                <LineChart className="h-5 w-5 !text-emerald-400" />
                <AlertTitle className="text-sm font-semibold text-emerald-200">
                  一句话带走
                </AlertTitle>
                <AlertDescription className="mt-1.5 text-sm leading-relaxed text-zinc-300">
                  <b className="text-zinc-100">有空间相干性</b> = 波前上各点&ldquo;步调一致&rdquo;、相位差恒定 → 能形成稳定干涉条纹；
                  <b className="text-zinc-100">没有</b> = 各点&ldquo;各跳各的&rdquo;、相位差随机 → 条纹被抹平。
                  一切成败只取决于光源的角尺寸：<b className="font-mono text-emerald-300">ℓ ≈ λ/θ</b>。
                </AlertDescription>
              </Alert>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* ---------------- 页脚 ---------------- */}
      <footer className="mt-auto border-t border-white/5 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
          <p className="text-sm text-zinc-400">
            <Waves className="mr-1.5 inline h-4 w-4 text-emerald-400" />
            波前 = 等相位面。空间相干性：有 = 波前步调一致 → 条纹清晰；没有 = 各自为战 → 条纹消失。
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            波动光学交互式讲解 · 所有动画在浏览器中实时计算渲染
          </p>
        </div>
      </footer>
    </div>
  )
}
