'use client';

import Image from 'next/image';
import Link from 'next/link';

import { ArrowRight, Box, Play, Terminal, Activity, Globe, Layers } from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1dd4f6';
const BG_DARK = '#050914';

const FT_DATA = [
  8.2, 9.1, 8.4, 8.7, 9.3, 8.1, 8.8, 12.4, 9.0, 8.3, 8.6, 9.8, 8.2, 8.5,
  16.7, 8.9, 8.4, 8.1, 8.7, 9.2, 8.3, 8.8, 9.1, 8.4, 10.2, 8.6, 8.3, 9.0,
  8.5, 8.7, 8.2, 9.4,
];

// ─── useSmoothScroll ──────────────────────────────────────────────────────────
// RAF lerp (factor 0.08) — returns damped global progress [0,1].
function useSmoothScroll(): number {
  const [smooth, setSmooth] = useState(0);
  const current = useRef(0);
  const target = useRef(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      target.current = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const tick = () => {
      current.current += (target.current - current.current) * 0.08;
      setSmooth(current.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return smooth;
}

// ─── mapRange ─────────────────────────────────────────────────────────────────
// Map progress through an input range [a,b] → output range [c,d], clamped.
function mapRange(value: number, a: number, b: number, c: number, d: number): number {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return c + (d - c) * t;
}

// ─── lerpColor ────────────────────────────────────────────────────────────────
function lerpColor(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Scene enter transition — each scene fades + slides in from lp 0→0.12
function enterOpacity(lp: number): number { return mapRange(lp, 0, 0.12, 0, 1); }
function enterY(lp: number): number { return mapRange(lp, 0, 0.12, 24, 0); }

// ─── HexBg ───────────────────────────────────────────────────────────────────
function HexBg({ opacity = 1 }: { opacity?: number }) {
  const [data] = useState(() =>
    Array.from({ length: 64 }, () =>
      `0x${Math.floor(Math.random() * 255).toString(16).padStart(2, '0').toUpperCase()}`
    )
  );
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ opacity, willChange: 'opacity' }}
    >
      <div className="grid grid-cols-8 gap-x-5 gap-y-3 text-[9px] font-mono text-[#1dd4f6]/18 p-10 select-none">
        {data.map((h, i) => (
          <span key={i} className={i % 7 === 0 ? 'text-[#8b5cf6]/28' : ''}>{h}</span>
        ))}
      </div>
    </div>
  );
}

// ─── WireframeMesh ────────────────────────────────────────────────────────────
function WireframeMesh({
  assembly = 1,
  pulse = 0,
  color = PRIMARY,
}: {
  assembly?: number;
  pulse?: number;
  color?: string;
}) {
  const CX = 300, CY = 220, S = 28;
  const C30 = S * 0.866, S30 = S * 0.5;
  const rotY = assembly * Math.PI * 0.8;
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const pulseMag = Math.sin(pulse * Math.PI * 8) * 0.15 * pulse;
  const explode = 1 + pulseMag;
  const cx = 0, cy = 1.6, cz = 0;

  const project = (x: number, y: number, z: number) => {
    const rx = x * cosY + z * sinY;
    const rz = -x * sinY + z * cosY;
    return { sx: CX + (rx - rz) * C30, sy: CY + (rx + rz) * S30 - y * S };
  };

  const ROW = [-3, -2, -1, 0, 1, 2, 3];
  const gridLen = 560;
  const gridDash = gridLen * assembly;

  const xPts = ROW.map(z =>
    ROW.map(x => { const p = project(x, 0, z); return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`; }).join(' ')
  );
  const zPts = ROW.map(x =>
    ROW.map(z => { const p = project(x, 0, z); return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`; }).join(' ')
  );

  const baseV: [number, number, number][] = [
    [0, 3.2, 0], [0, 0, 0], [1.6, 1.6, 0], [-1.6, 1.6, 0], [0, 1.6, 1.6], [0, 1.6, -1.6],
  ];
  const ov = baseV.map(([x, y, z]) =>
    project(cx + (x - cx) * explode, cy + (y - cy) * explode, cz + (z - cz) * explode)
  );
  const edges = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
  const edgeLen = 80;
  const edgeDash = edgeLen * assembly;
  const origin = project(0, 0, 0);
  const axX = project(2.8, 0, 0), axY = project(0, 2.8, 0), axZ = project(0, 0, 2.8);

  return (
    <svg viewBox="0 0 600 440" className="h-full w-full" style={{ willChange: 'transform' }}>
      {ROW.map((z, i) => (
        <polyline key={`gx${z}`} points={xPts[i]} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5} strokeDasharray={`${gridDash} ${gridLen}`} />
      ))}
      {ROW.map((x, i) => (
        <polyline key={`gz${x}`} points={zPts[i]} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5} strokeDasharray={`${gridDash} ${gridLen}`} />
      ))}
      {edges.map(([a, b], i) => (
        <line key={i}
          x1={ov[a].sx} y1={ov[a].sy} x2={ov[b].sx} y2={ov[b].sy}
          stroke={color} strokeWidth={2} strokeOpacity={0.9 * assembly}
          strokeDasharray={`${edgeDash} ${edgeLen}`}
          style={{ willChange: 'stroke-dasharray' }}
        />
      ))}
      {ov.map((v, i) => (
        <circle key={i} cx={v.sx} cy={v.sy} r={(i === 0 ? 4 : 3) * (0.4 + assembly * 0.6)} fill={color} opacity={assembly} />
      ))}
      <line x1={origin.sx} y1={origin.sy} x2={axX.sx} y2={axX.sy} stroke="#ff3366" strokeWidth={2} opacity={assembly} />
      <line x1={origin.sx} y1={origin.sy} x2={axY.sx} y2={axY.sy} stroke={PRIMARY} strokeWidth={2} opacity={assembly} />
      <line x1={origin.sx} y1={origin.sy} x2={axZ.sx} y2={axZ.sy} stroke="#8b5cf6" strokeWidth={2} opacity={assembly} />
    </svg>
  );
}

// ─── FrameTimeGraph ───────────────────────────────────────────────────────────
function FrameTimeGraph({ noise = 0 }: { noise?: number }) {
  const isHot = noise > 0.5;
  const roundedNoise = Math.round(noise * 40) / 40;
  const liveData = useMemo(() => {
    const f = roundedNoise * 10;
    return FT_DATA.map(v => Math.max(6, Math.min(22, v + Math.sin(v * roundedNoise * 12) * f)));
  }, [roundedNoise]);

  const avg = (liveData.reduce((a, b) => a + b, 0) / liveData.length).toFixed(1);
  const W = 240, H = 50, P = 4, MAX = 22, MIN = 6, n = liveData.length;
  const pts = liveData.map((v, i) => {
    const x = P + (i / (n - 1)) * (W - P * 2);
    const y = P + ((MAX - v) / (MAX - MIN)) * (H - P * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const tY = P + ((MAX - 8.33) / (MAX - MIN)) * (H - P * 2);

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
          <line x1={P} y1={tY} x2={W - P} y2={tY} stroke={PRIMARY} strokeOpacity={0.25} strokeWidth={1} strokeDasharray="4,4" />
          <polyline points={pts} fill="none" stroke={isHot ? '#ff3366' : PRIMARY} strokeWidth={2} strokeLinejoin="round" />
          {liveData.map((v, i) =>
            v > 12 ? (
              <circle key={i}
                cx={P + (i / (n - 1)) * (W - P * 2)}
                cy={P + ((MAX - v) / (MAX - MIN)) * (H - P * 2)}
                r={3} fill="#ff3366" className="animate-pulse"
              />
            ) : null
          )}
        </svg>
      </div>
      <div className="min-w-16">
        <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Avg</p>
        <p className={`text-xl font-mono font-bold ${isHot ? 'text-[#ff3366]' : 'text-white'}`}>
          {avg}<span className="text-xs text-slate-500 ml-0.5">ms</span>
        </p>
      </div>
    </div>
  );
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────
const CODE_LINES = [
  { t: 'kw', c: 'use vertra::prelude::*;' },
  { t: 'blank' },
  { t: 'kw', c: 'fn main() {' },
  { t: 'n', c: '    Window::new()' },
  { t: 'n', c: '        .with_title("Solar Simulation")' },
  { t: 'n', c: '        .on_startup(|scene, _| {' },
  { t: 'cm', c: '            // Spawn the sun at origin' },
  { t: 'n', c: '            let sun = Object::new(Geometry::Sphere(2.0));' },
  { t: 'n', c: '            let sun_id = scene.spawn(sun, None);' },
  { t: 'blank' },
  { t: 'cm', c: "            // Planet inherits Sun's transform" },
  { t: 'n', c: '            let planet = Object::new(Geometry::Sphere(0.8))' },
  { t: 'n', c: '                .with_position([6.0, 0.0, 0.0]);' },
  { t: 'n', c: '            scene.spawn(planet, Some(sun_id));' },
  { t: 'n', c: '        })' },
  { t: 'n', c: '        .on_update(|state, scene, ctx| {' },
  { t: 'cm', c: '            // Rotate Sun; children orbit' },
  { t: 'n', c: '            if let Some(sun) = scene.world.get_mut(state.sun_id) {' },
  { t: 'n', c: '                sun.transform.rotation[1] += 30.0 * ctx.dt;' },
  { t: 'n', c: '            }' },
  { t: 'n', c: '        })' },
  { t: 'n', c: '        .create();' },
  { t: 'kw', c: '}' },
  { t: 'blank' },
  { t: 'cm', c: '// Compiling vertra v2.0.0' },
  { t: 'ok', c: '   Compiling scene_graph v0.3.1' },
  { t: 'ok', c: '   Compiling renderer_wgpu v0.5.7' },
  { t: 'ok', c: '    Finished release [optimized] target(s)' },
];

function renderCodeLine(t: string, c?: string) {
  if (t === 'blank' || !c) return null;
  if (t === 'cm') return <span className="text-slate-600">{c}</span>;
  if (t === 'ok') return <span className="text-emerald-400">{c}</span>;
  const html = c
    .replace(/(use|fn|let|if|Some|None)\b/g, '<kw>$1</kw>')
    .replace(/(Window|Object|Geometry|Sphere|scene|world|sun|planet|state|ctx)\b/g, '<id>$1</id>')
    .replace(/"([^"]*)"/g, '<str>"$1"</str>')
    .replace(/\b(\d+\.?\d*)\b/g, '<nm>$1</nm>')
    .replace(/<kw>(.*?)<\/kw>/g, '<span style="color:#f472b6">$1</span>')
    .replace(/<id>(.*?)<\/id>/g, '<span style="color:#93c5fd">$1</span>')
    .replace(/<str>(.*?)<\/str>/g, '<span style="color:#86efac">$1</span>')
    .replace(/<nm>(.*?)<\/nm>/g, '<span style="color:#fdba74">$1</span>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function CodeBlock({ codeProgress }: { codeProgress: number }) {
  const lineH = 20, visible = 12;
  const maxScroll = Math.max(0, CODE_LINES.length - visible) * lineH;
  const scrollTop = codeProgress * maxScroll;
  const isCompiled = codeProgress > 0.9;

  return (
    <div className="rounded-xl border border-white/10 bg-[#080d1c] overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-[#0d1326]">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        <span className="ml-2 text-xs font-mono text-slate-500">src/main.rs</span>
        <span className={`ml-auto text-xs font-mono ${isCompiled ? 'text-emerald-400' : 'text-yellow-500/70'}`}>
          {isCompiled ? '● compiled' : '○ compiling…'}
        </span>
      </div>
      <div className="relative overflow-hidden" style={{ height: `${visible * lineH + 20}px` }}>
        <div
          className="p-3 font-mono text-xs"
          style={{ transform: `translateY(-${scrollTop}px)`, willChange: 'transform' }}
        >
          {CODE_LINES.map((line, i) => (
            <div key={i} className="flex items-center" style={{ height: lineH }}>
              <span className="text-slate-700 mr-3 text-[10px] w-4 text-right shrink-0 select-none">{i + 1}</span>
              <span className="text-slate-300 whitespace-pre">{renderCodeLine(line.t, line.c)}</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-8 bg-linear-to-t from-[#080d1c] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

// ─── StickyFrame ──────────────────────────────────────────────────────────────
// Outer div provides scroll height; inner div sticks at the top of the viewport.
function StickyFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '200vh', position: 'relative' }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Scene 1 — The Void ───────────────────────────────────────────────────────
// Intro frame: skybox starfield, floating hex data, big headline.
function Scene1({ lp }: { lp: number }) {
  const skyboxOpacity = mapRange(lp, 0, 0.5, 0, 0.28);
  const hexDriftY = mapRange(lp, 0, 0.9, 60, -30);
  const hexOpacity = mapRange(lp, 0, 0.45, 0, 0.9);
  const hintOpacity = mapRange(lp, 0, 0.08, 1, 0);

  return (
    <div
      className="relative h-full w-full flex items-center justify-center"
      style={{ background: BG_DARK }}
    >
      {/* Skybox */}
      <div className="absolute inset-0" style={{ opacity: skyboxOpacity, willChange: 'opacity' }}>
        <Image src="/assets/home/skybox.jpeg" alt="" fill className="object-cover" priority quality={85} />
        <div className="absolute inset-0 bg-linear-to-b from-[#050914]/70 via-transparent to-[#050914]" />
      </div>

      {/* Hex grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: hexOpacity, transform: `translateY(${hexDriftY}px)`, willChange: 'transform, opacity' }}
      >
        <HexBg opacity={1} />
      </div>

      {/* Headline */}
      <div className="relative z-10 text-center max-w-5xl px-6">
        <div>
          <h1 className="text-6xl lg:text-8xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
            Build simulations<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#1dd4f6] to-[#8b5cf6]">
              that defy limits.
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A high-performance 3D simulation engine — crafted in Rust, compiled to WebAssembly.
          </p>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        style={{ opacity: hintOpacity }}
      >
        <span className="text-xs font-mono text-slate-500 tracking-[0.2em] uppercase">Scroll to assemble</span>
        <div className="w-px h-10 bg-linear-to-b from-[#1dd4f6]/60 to-transparent" />
      </div>
    </div>
  );
}

// ─── Scene 2 — Assembly ───────────────────────────────────────────────────────
// Geometry showcase: primitives image reveals, wireframe assembles.
function Scene2({ lp }: { lp: number }) {
  const imgReveal = mapRange(lp, 0.05, 0.60, 100, 0); // clip-path inset %
  const badgeOp = mapRange(lp, 0.25, 0.50, 0, 1);
  const badgeScale = mapRange(lp, 0.25, 0.50, 0.8, 1);
  const copyOp = mapRange(lp, 0.35, 0.60, 0, 1);
  const copyY = mapRange(lp, 0.35, 0.60, 28, 0);
  const tagsOp = mapRange(lp, 0.50, 0.72, 0, 1);
  const contentOp = enterOpacity(lp);
  const contentY = enterY(lp);

  return (
    <div
      className="relative h-full w-full flex items-center"
      style={{ background: BG_DARK, opacity: contentOp, transform: `translateY(${contentY}px)`, willChange: 'transform, opacity' }}
    >
      <HexBg opacity={0.45} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center">

        {/* LEFT: copy */}
        <div className="flex flex-col gap-7">
          <div
            style={{ opacity: badgeOp, transform: `scale(${badgeScale})`, transformOrigin: 'left center', willChange: 'transform, opacity' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1dd4f6]/30 bg-[#1dd4f6]/8 text-[#1dd4f6] text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              v2.0 Beta Engine Live
            </div>
          </div>

          <div style={{ opacity: copyOp, transform: `translateY(${copyY}px)`, willChange: 'transform, opacity' }}>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              Every primitive,<br />
              <span className="text-[#1dd4f6]">perfectly formed.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Vertra&apos;s scene graph assembles your world from first-class geometric primitives.
              Shapes compose hierarchically — with transforms that cascade automatically.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-3 max-w-xs"
            style={{ opacity: tagsOp, willChange: 'opacity' }}
          >
            {['Sphere', 'Box', 'Pyramid', 'Plane'].map((name, i) => (
              <div
                key={name}
                className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5"
                style={{
                  opacity: mapRange(lp, 0.50 + i * 0.04, 0.68 + i * 0.04, 0, 1),
                  transform: `translateX(${mapRange(lp, 0.50 + i * 0.04, 0.68 + i * 0.04, -16, 0)}px)`,
                  willChange: 'transform, opacity',
                }}
              >
                <div className="w-2 h-2 rounded-full bg-[#1dd4f6] shrink-0" />
                <span className="text-xs font-mono text-slate-300">Geometry::{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: geometries.png reveal + wireframe overlay */}
        <div className="relative">
          {/* Image with top-clip reveal */}
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ clipPath: `inset(${imgReveal}% 0 0 0)`, willChange: 'clip-path' }}
          >
            <Image
              src="/assets/home/geometries.png"
              alt="Vertra 3D geometry primitives"
              width={960}
              height={720}
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#050914]/70 via-transparent to-transparent" />
            {/* Engine chrome overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#0d1326]/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <Play className="w-3 h-3 text-[#1dd4f6]" />
              <span className="text-xs font-mono text-slate-400">scene_graph.vrt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 3 — The Pulse ─────────────────────────────────────────────────────
// Performance frame: pulsing mesh, telemetry graph, WASM copy.
function Scene3({ lp }: { lp: number }) {
  const pulse = mapRange(lp, 0.10, 0.90, 0, 1);
  const gradientT = lp;
  const glowColor = lerpColor('#1dd4f6', '#8b5cf6', gradientT);
  const bgColor = lerpColor('#050914', '#0e0520', gradientT);
  const copyOp = mapRange(lp, 0.12, 0.38, 0, 1);
  const copyY = mapRange(lp, 0.12, 0.38, 36, 0);
  const graphOp = mapRange(lp, 0.22, 0.48, 0, 1);
  const graphSY = mapRange(lp, 0.22, 0.48, 0.3, 1);
  const statsOp = mapRange(lp, 0.50, 0.68, 0, 1);
  const contentOp = enterOpacity(lp);
  const contentY = enterY(lp);

  return (
    <div
      className="relative h-full w-full flex items-center"
      style={{
        background: bgColor,
        opacity: contentOp,
        transform: `translateY(${contentY}px)`,
        willChange: 'transform, opacity',
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 65% 55% at 50% 50%, ${glowColor}28 0%, transparent 65%)`,
          willChange: 'background',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center">

        {/* LEFT: large pulsing wireframe mesh */}
        <div className="relative h-110">
          <WireframeMesh assembly={1} pulse={pulse} color={glowColor} />
        </div>

        {/* RIGHT: copy + telemetry */}
        <div className="flex flex-col gap-8">
          <div style={{ opacity: copyOp, transform: `translateY(${copyY}px)`, willChange: 'transform, opacity' }}>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              Harness the power<br />
              <span style={{ color: glowColor }}>of WebAssembly.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Sub-frame latencies. Thousands of entities. Zero compromise.
              Vertra&apos;s WASM runtime runs natively in any modern browser with a zero-install footprint.
            </p>
          </div>

          {/* Telemetry panel */}
          <div
            className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-5"
            style={{
              opacity: graphOp,
              transform: `scaleY(${graphSY}) translateY(${(1 - graphSY) * 18}px)`,
              transformOrigin: 'bottom',
              willChange: 'transform, opacity',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: glowColor }} />
                Engine Telemetry
              </h3>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ color: glowColor, background: `${glowColor}18` }}
              >
                {pulse > 0.3 ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>
            <FrameTimeGraph noise={pulse} />
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-4 pt-4 border-t border-white/8"
            style={{ opacity: statsOp, willChange: 'opacity' }}
          >
            {[
              { val: '120fps', label: 'Render Target' },
              { val: '~8ms', label: 'Frame Latency' },
              { val: '0 lag', label: 'Local-First' },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="text-xl font-bold mb-0.5" style={{ color: glowColor }}>{val}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 4 — The Core ───────────────────────────────────────────────────────
// Toolchain frame: code auto-scrolls, UI panels slide in.
function Scene4({ lp }: { lp: number }) {
  const codeOp = mapRange(lp, 0.05, 0.25, 0, 1);
  const codeTx = mapRange(lp, 0.05, 0.25, 60, 0);
  const codeProgress = mapRange(lp, 0.18, 0.95, 0, 1);
  const titleOp = mapRange(lp, 0, 0.20, 0, 1);
  const titleY = mapRange(lp, 0, 0.20, 20, 0);
  const panel1Op = mapRange(lp, 0.20, 0.44, 0, 1);
  const panel1Tx = mapRange(lp, 0.20, 0.44, -64, 0);
  const panel2Op = mapRange(lp, 0.35, 0.58, 0, 1);
  const panel2Tx = mapRange(lp, 0.35, 0.58, -64, 0);
  const contentOp = enterOpacity(lp);
  const contentY = enterY(lp);

  return (
    <div
      className="relative h-full w-full flex items-center"
      style={{ background: BG_DARK, opacity: contentOp, transform: `translateY(${contentY}px)`, willChange: 'transform, opacity' }}
    >
      <HexBg opacity={0.28} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-start pt-6">

        {/* LEFT: UI panels */}
        <div className="flex flex-col gap-6">
          <h2
            className="text-4xl font-bold text-white"
            style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, willChange: 'transform, opacity' }}
          >
            Plug in your<br />
            <span className="text-[#1dd4f6]">toolchain.</span>
          </h2>

          {/* Scene Editor */}
          <div
            className="rounded-2xl border border-white/10 bg-white/3 p-6 flex flex-col gap-4"
            style={{ opacity: panel1Op, transform: `translateX(${panel1Tx}px)`, willChange: 'transform, opacity' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1dd4f6]/15 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-[#1dd4f6]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Scene Editor</h3>
                <p className="text-xs text-slate-500">Visual hierarchy builder</p>
              </div>
            </div>
            <svg viewBox="0 0 220 80" className="w-full opacity-70">
              <path d="M 40 40 L 100 18 M 40 40 L 100 62 M 100 18 L 165 10 M 100 18 L 165 32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="3 2" />
              <rect x="18" y="27" width="40" height="26" rx="6" fill="#0a0f1d" stroke="#1dd4f6" strokeWidth="1.5" />
              <rect x="76" y="5" width="40" height="26" rx="6" fill="#0a0f1d" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <rect x="76" y="49" width="40" height="26" rx="6" fill="#0a0f1d" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <rect x="141" y="0" width="34" height="20" rx="5" fill="#0a0f1d" stroke="#8b5cf6" strokeWidth="1.5" />
              <rect x="141" y="26" width="34" height="20" rx="5" fill="#0a0f1d" stroke="#8b5cf6" strokeWidth="1" />
            </svg>
          </div>

          {/* Cloud Sync */}
          <div
            className="rounded-2xl border border-white/10 bg-white/3 p-6 flex items-center gap-6"
            style={{ opacity: panel2Op, transform: `translateX(${panel2Tx}px)`, willChange: 'transform, opacity' }}
          >
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#1dd4f6]/20 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="absolute inset-2 rounded-full border border-[#1dd4f6]/30" />
              <div className="w-5 h-5 rounded-full bg-[#1dd4f6] shadow-[0_0_14px_#1dd4f6]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-[#1dd4f6]" />
                <h3 className="text-sm font-bold text-white">Instant Cloud Sync</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Local-first architecture. Offline-reliable, auto-syncing when reconnected.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: code block */}
        <div
          style={{ opacity: codeOp, transform: `translateX(${codeTx}px)`, willChange: 'transform, opacity' }}
        >
          <CodeBlock codeProgress={codeProgress} />
        </div>
      </div>
    </div>
  );
}

// ─── Scene 5 — The Launch ─────────────────────────────────────────────────────
// CTA frame: skybox at full brightness, final call-to-action.
function Scene5({ lp }: { lp: number }) {
  const skyboxOp = mapRange(lp, 0, 0.5, 0.18, 0.55);
  const headlineOp = mapRange(lp, 0.05, 0.30, 0, 1);
  const headlineY = mapRange(lp, 0.05, 0.30, 28, 0);
  const ctaOp = mapRange(lp, 0.30, 0.55, 0, 1);
  const ctaY = mapRange(lp, 0.30, 0.55, 18, 0);
  const contentOp = enterOpacity(lp);
  const contentY = enterY(lp);

  return (
    <div
      className="relative h-full w-full flex items-center justify-center"
      style={{ background: BG_DARK, opacity: contentOp, transform: `translateY(${contentY}px)`, willChange: 'transform, opacity' }}
    >
      {/* Skybox — brighter than Scene 1 */}
      <div className="absolute inset-0" style={{ opacity: skyboxOp, willChange: 'opacity' }}>
        <Image src="/assets/home/skybox.jpeg" alt="" fill className="object-cover" quality={85} />
        <div className="absolute inset-0 bg-linear-to-b from-[#050914]/60 via-[#050914]/20 to-[#050914]/75" />
      </div>

      <div className="relative z-10 text-center max-w-3xl px-6">
        <div
          style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)`, willChange: 'transform, opacity' }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1dd4f6]/30 bg-[#1dd4f6]/8 text-[#1dd4f6] text-xs font-semibold mb-6">
            <Activity className="w-3.5 h-3.5" />
            Ready to ship
          </div>
          <h2 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Start building<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#1dd4f6] to-[#8b5cf6]">
              your simulation.
            </span>
          </h2>
          <p className="text-xl text-slate-400 mb-10 leading-relaxed">
            Zero boilerplate. Native-speed WASM. Open a project and your engine is live in seconds.
          </p>
        </div>

        <div
          className="flex flex-wrap items-center justify-center gap-4"
          style={{ opacity: ctaOp, transform: `translateY(${ctaY}px)`, willChange: 'transform, opacity' }}
        >
          <Link
            href="/projects"
            className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm transition-all hover:shadow-xl group"
            style={{ background: 'linear-gradient(to right, #1dd4f6, #8b5cf6)', color: BG_DARK }}
          >
            Open Editor
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-sm border border-white/15 hover:bg-white/5 transition-all text-white"
          >
            <Terminal className="w-4 h-4" />
            Read the Docs
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Global progress bar ──────────────────────────────────────────────────────
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-px bg-white/5 z-50 pointer-events-none">
      <div
        className="h-full transition-none"
        style={{ width: `${progress * 100}%`, background: `linear-gradient(to right, ${color}, #8b5cf6)`, willChange: 'width' }}
      />
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const smooth = useSmoothScroll();

  // Each scene owns 20% of global scroll range (1000vh total, 200vh per scene)
  const s1 = mapRange(smooth, 0.00, 0.20, 0, 1);
  const s2 = mapRange(smooth, 0.20, 0.40, 0, 1);
  const s3 = mapRange(smooth, 0.40, 0.60, 0, 1);
  const s4 = mapRange(smooth, 0.60, 0.80, 0, 1);
  const s5 = mapRange(smooth, 0.80, 1.00, 0, 1);

  const glowColor = lerpColor('#1dd4f6', '#8b5cf6', smooth);

  return (
    <main style={{ backgroundColor: BG_DARK }}>

      {/* ── Scene 1 — The Void ───────────────────────────────────────────── */}
      <StickyFrame><Scene1 lp={s1} /></StickyFrame>

      {/* ── Scene 2 — Assembly ──────────────────────────────────────────── */}
      <StickyFrame><Scene2 lp={s2} /></StickyFrame>

      {/* ── Scene 3 — The Pulse ─────────────────────────────────────────── */}
      <StickyFrame><Scene3 lp={s3} /></StickyFrame>

      {/* ── Scene 4 — The Core ──────────────────────────────────────────── */}
      <StickyFrame><Scene4 lp={s4} /></StickyFrame>

      {/* ── Scene 5 — The Launch ────────────────────────────────────────── */}
      <StickyFrame><Scene5 lp={s5} /></StickyFrame>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#050914] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Box className="w-6 h-6 text-[#1dd4f6]" />
            <span className="font-bold text-xl tracking-wide text-white">Vertra</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Twitter / X</Link>
            <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
          </div>
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} Vertra Systems. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ── Global scroll progress bar ──────────────────────────────────── */}
      <ProgressBar progress={smooth} color={glowColor} />
    </main>
  );
}
