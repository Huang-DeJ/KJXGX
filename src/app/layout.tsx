import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "空间相干性与波前 · 动画讲解",
  description:
    "波前（wavefront）是同一时刻相位相同的点连成的等相位面，点光源的波前是向四面八方膨胀的同心球面；空间相干性描述波前上横向两点相位差是否恒定：有则干涉条纹清晰，无则条纹被抹平。四个交互动画（2D/3D）讲清波前与光的空间相干性。",
  keywords: ["空间相干性", "波前", "等相位面", "相干性", "波动光学", "双缝干涉", "杨氏双缝", "相干宽度", "平面波", "球面波", "激光"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  )
}
