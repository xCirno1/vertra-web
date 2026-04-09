'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Box, Play, Terminal, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

const PRIMARY = '#1dd4f6';
const PRIMARY_GLOW = 'rgba(29, 212, 246, 0.4)';
const BG_DARK = '#050914';

const FT_DATA = [
  8.2, 9.1, 8.4, 8.7, 9.3, 8.1, 8.8, 12.4, 9.0, 8.3, 8.6, 9.8, 8.2, 8.5,
  16.7, 8.9, 8.4, 8.1, 8.7, 9.2, 8.3, 8.8, 9.1, 8.4, 10.2, 8.6, 8.3, 9.0,
  8.5, 8.7, 8.2, 9.4,
];

function FrameTimeGraph() {
  const W = 240, H = 50, P = 4;
  const MAX = 20, MIN = 6;
  const n = FT_DATA.length;
  const pts = FT_DATA.map((v, i) => {
    const x = P + (i / (n - 1)) * (W - P * 2);
    const y = P + ((MAX - v) / (MAX - MIN)) * (H - P * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const targetY = P + ((MAX - 8.33) / (MAX - MIN)) * (H - P * 2);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible w-full">
      <line
        x1={P} y1={targetY} x2={W - P} y2={targetY}
        stroke={PRIMARY} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4,4"
      />
      <polyline points={pts} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinejoin="round" />
      {FT_DATA.map((v, i) =>
        v > 12 ? (
          <circle
            key={i}
            cx={P + (i / (n - 1)) * (W - P * 2)}
            cy={P + ((MAX - v) / (MAX - MIN)) * (H - P * 2)}
            r={3}
            fill="#ff3366"
            className="animate-pulse"
          />
        ) : null,
      )}
    </svg>
  );
}

function HexVisual() {
  const [hexData, setHexData] = useState<string[]>([]);

  useEffect(() => {
    const data = Array.from({ length: 32 }).map(() =>
      `0x${Math.floor(Math.random() * 255).toString(16).padStart(2, '0').toUpperCase()}`
    );
    setHexData(data);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-[10px] font-mono text-[#1dd4f6]/40">
      {hexData.map((hex: string, i: number) => (
        <span key={i} className={i % 7 === 0 ? "text-[#8b5cf6]" : ""}>
          {hex}
        </span>
      ))}
    </div>
  );
}

function WireframeMesh() {
  const CX = 300, CY = 240, S = 28;
  const C30 = S * 0.866;
  const S30 = S * 0.5;

  const project = (x: number, y: number, z: number) => ({
    sx: CX + (x - z) * C30,
    sy: CY + (x + z) * S30 - y * S,
  });

  const ROW = [-3, -2, -1, 0, 1, 2, 3];

  const xLines = ROW.map((z) => {
    const pts = ROW.map((x) => {
      const p = project(x, 0, z);
      return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
    }).join(' ');
    return <polyline key={`gx${z}`} points={pts} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1.5} />;
  });

  const zLines = ROW.map((x) => {
    const pts = ROW.map((z) => {
      const p = project(x, 0, z);
      return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
    }).join(' ');
    return <polyline key={`gz${x}`} points={pts} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1.5} />;
  });

  const ov = [
    project(0, 3.2, 0),
    project(0, 0, 0),
    project(1.6, 1.6, 0),
    project(-1.6, 1.6, 0),
    project(0, 1.6, 1.6),
    project(0, 1.6, -1.6),
  ];
  const edges = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [4, 3], [3, 5], [5, 2],
  ];

  const origin = project(0, 0, 0);
  const axX = project(2.8, 0, 0);
  const axY = project(0, 2.8, 0);
  const axZ = project(0, 0, 2.8);

  return (
    <svg viewBox="0 0 600 450" className="h-full w-full drop-shadow-2xl">
      {xLines}
      {zLines}

      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={ov[a].sx} y1={ov[a].sy}
          x2={ov[b].sx} y2={ov[b].sy}
          stroke={PRIMARY} strokeWidth={2} strokeOpacity={0.8}
        />
      ))}

      {ov.map((v, i) => (
        <circle key={i} cx={v.sx} cy={v.sy} r={i === 0 ? 4 : 3} fill={PRIMARY} />
      ))}

      <line x1={origin.sx} y1={origin.sy} x2={axX.sx} y2={axX.sy} stroke="#ff3366" strokeWidth={2} />
      <line x1={origin.sx} y1={origin.sy} x2={axY.sx} y2={axY.sy} stroke={PRIMARY} strokeWidth={2} />
      <line x1={origin.sx} y1={origin.sy} x2={axZ.sx} y2={axZ.sy} stroke="#8b5cf6" strokeWidth={2} />
    </svg>
  );
}

export default function Home() {
  return (
    <div
      className="min-h-screen text-slate-200 selection:bg-[#1dd4f6] selection:text-[#050914]"
      style={{
        backgroundColor: BG_DARK,
        backgroundImage: `radial-gradient(circle at 50% -20%, ${PRIMARY_GLOW} 0%, transparent 50%)`,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Copy */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1dd4f6]/20 bg-[#1dd4f6]/5 text-[#1dd4f6] text-xs font-semibold mb-8 w-fit">
            <Activity className="w-3.5 h-3.5" />
            <span>v2.0 Beta Engine Live</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Build simulations that <span className="text-transparent bg-clip-text bg-linear-to-r from-[#1dd4f6] to-[#8b5cf6]">defy limits.</span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-xl">
            Vertra is the modern simulation engine designed for speed and scale.
            Harness the power of WebAssembly and intuitive visual tools to bring
            your complex virtual environments to life seamlessly in the browser.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-14">
            <Link
              href="/editor"
              className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base transition-all hover:shadow-lg hover:shadow-[#1dd4f6]/20 group"
              style={{ backgroundColor: PRIMARY, color: BG_DARK }}
            >
              Open Editor
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base border border-white/10 hover:bg-white/5 transition-all text-white"
            >
              <Terminal className="w-4 h-4" />
              Read the Docs
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-6 py-6 border-t border-white/10">
            <div>
              <p className="text-3xl font-bold text-white mb-1">120<span className="text-[#1dd4f6] text-lg">fps</span></p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Render Target</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">~8<span className="text-[#1dd4f6] text-lg">ms</span></p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Frame Latency</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">0<span className="text-[#1dd4f6] text-lg"> lag</span></p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Local-First</p>
            </div>
          </div>
        </motion.div>

        {/* Right Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
          className="relative"
        >
          <div className="rounded-2xl border border-white/10 bg-[#0a0f1d]/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <Play className="w-3 h-3 text-[#1dd4f6]" />
                Simulation_Preview.vrt
              </div>
            </div>

            <div className="relative h-80 bg-linear-to-b from-transparent to-[#1dd4f6]/5">
              <WireframeMesh />
            </div>

            <div className="border-t border-white/5 bg-black/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#1dd4f6]" />
                  Engine Telemetry
                </h3>
                <span className="text-xs font-mono text-[#1dd4f6] bg-[#1dd4f6]/10 px-2 py-1 rounded">ONLINE</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-full">
                  <FrameTimeGraph />
                </div>
                <div className="flex flex-col justify-center min-w-20">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Avg Frame</p>
                  <p className="text-2xl font-mono font-bold text-white">
                    8.4<span className="text-sm text-slate-500 ml-1">ms</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#1dd4f6]/20 blur-[120px] -z-10 pointer-events-none rounded-full" />
        </motion.div>
      </section>

      <section id="features" className="py-24 bg-[#03060d] border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
              Built for <span className="text-[#1dd4f6]">creators & engineers.</span>
            </h2>
            <p className="text-slate-400 text-lg">
              Stop fighting with overly complex tools. Vertra strikes the perfect balance
              between an intuitive interface and raw computational power.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[320px]">

            {/* Box 1: Intuitive Scene Editor (Spans 2 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="md:col-span-2 rounded-3xl bg-linear-to-br from-white/3 to-transparent border border-white/10 p-10 flex flex-col justify-between relative overflow-hidden group hover:border-[#1dd4f6]/30 transition-colors"
            >
              <div className="relative z-10 max-w-sm">
                <h3 className="text-2xl font-bold text-white mb-4">Intuitive Scene Editor</h3>
                <p className="text-slate-400 leading-relaxed">
                  Manage your simulation hierarchies with a modern, user-friendly visual editor. Connect entities, map logic flows, and focus entirely on creation.
                </p>
              </div>
              {/* Abstract Node Graph Visual */}
              <div className="absolute -right-10 -bottom-10 w-100 h-75 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 pointer-events-none">
                <svg viewBox="0 0 200 150" className="w-full h-full stroke-slate-700/50">
                  <path d="M 40 75 L 100 40 M 40 75 L 100 110 M 100 40 L 160 40" fill="none" strokeWidth="1.5" strokeDasharray="4 2" />
                  <rect x="25" y="60" width="30" height="30" rx="6" fill="#0a0f1d" className="stroke-[#1dd4f6]" strokeWidth="2" />
                  <rect x="85" y="25" width="30" height="30" rx="6" fill="#0a0f1d" strokeWidth="1.5" />
                  <rect x="85" y="95" width="30" height="30" rx="6" fill="#0a0f1d" strokeWidth="1.5" />
                  <rect x="145" y="25" width="30" height="30" rx="6" fill="#0a0f1d" className="stroke-[#8b5cf6]" strokeWidth="2" />
                  <circle cx="40" cy="75" r="4" fill="#1dd4f6" />
                  <circle cx="100" cy="40" r="4" fill="#fff" />
                  <circle cx="160" cy="40" r="4" fill="#8b5cf6" />
                </svg>
              </div>
            </motion.div>

            {/* Box 2: WASM Powered Core (1 column) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="rounded-3xl bg-linear-to-b from-white/3 to-transparent border border-white/10 p-8 flex flex-col relative overflow-hidden group hover:border-[#1dd4f6]/30 transition-colors"
            >
              <div className="relative z-10 mb-8">
                <h3 className="text-xl font-bold text-white mb-3">WASM-Powered</h3>
                <p className="text-sm text-slate-400">
                  Near-native performance. Process thousands of entities at sub-frame latencies directly in your browser.
                </p>
              </div>
              {/* Hex / Memory dump visual */}
              <div className="flex-1 rounded-xl bg-black/40 border border-white/5 p-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent z-10" />
                <HexVisual />
              </div>
            </motion.div>

            {/* Box 3: Cloud Sync (1 column) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="rounded-3xl bg-linear-to-b from-white/3 to-transparent border border-white/10 p-8 flex flex-col justify-end relative overflow-hidden group hover:border-[#1dd4f6]/30 transition-colors"
            >
              {/* Radar / Ping Visual */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-40 h-40 flex items-center justify-center pointer-events-none">
                <div className="absolute w-full h-full rounded-full border border-[#1dd4f6]/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="absolute w-2/3 h-2/3 rounded-full border border-[#1dd4f6]/20" />
                <div className="w-3 h-3 rounded-full bg-[#1dd4f6] shadow-[0_0_15px_#1dd4f6]" />
              </div>

              <div className="relative z-10 mt-auto">
                <h3 className="text-xl font-bold text-white mb-3">Instant Cloud Sync</h3>
                <p className="text-sm text-slate-400">
                  Local-first architecture guarantees offline reliability while seamlessly syncing state back to the cloud.
                </p>
              </div>
            </motion.div>

            {/* Box 4: Universal Export (Spans 2 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="md:col-span-2 rounded-3xl bg-linear-to-tr from-white/3 to-transparent border border-white/10 p-10 flex flex-col justify-center relative overflow-hidden group hover:border-[#1dd4f6]/30 transition-colors"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center z-10">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Universal Export</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Easily package your environments into zero-dependency standalone web bundles, or capture lossless framebuffers for high-fidelity video rendering.
                  </p>
                </div>
                {/* Compiler Pipeline Visual */}
                <div className="space-y-4">
                  {[
                    { label: 'Compile WASM Target', progress: 'w-full', color: 'bg-[#1dd4f6]' },
                    { label: 'Bundle Asset Textures', progress: 'w-[80%]', color: 'bg-[#8b5cf6]' },
                    { label: 'Generate Standalone .html', progress: 'w-[45%]', color: 'bg-white', pulse: true }
                  ].map((task, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-mono font-medium">
                        <span className="text-slate-400">{task.label}</span>
                        <span className="text-slate-500">{task.progress === 'w-full' ? 'DONE' : 'BUILDING...'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${task.progress} ${task.color} rounded-full ${task.pulse ? 'animate-pulse' : ''}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="engine" className="py-24 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Developer-friendly <br /> from the ground up.
          </h2>
          <p className="text-slate-400 mb-8 max-w-md text-lg leading-relaxed">
            Need to go beyond the visual editor? Vertra&apos;s Native SDK gives you bare-metal performance with ergonomic abstractions in Rust. Build robust simulation hierarchies, then compile seamlessly to WebAssembly or desktop with zero friction.
          </p>
          <ul className="space-y-4 mb-8">
            {['Ergonomic Builder Pattern & ECS', 'Native cross-platform performance', 'First-class WebAssembly compilation'].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-5 h-5 rounded-full bg-[#1dd4f6]/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#1dd4f6]" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="rounded-xl border border-white/10 bg-[#0a0f1d] overflow-hidden shadow-2xl">
            {/* Window Controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0d1326]">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <span className="ml-2 text-xs font-mono text-slate-500">src/main.rs</span>
            </div>

            {/* Code Block */}
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre">
              <p className="text-slate-400">
                <span className="text-pink-400">use</span> vertra::prelude::*;
              </p>
              <br />
              <p className="text-slate-400">
                <span className="text-pink-400">fn</span> <span className="text-blue-300">main</span>() {'{'}
              </p>

              <p className="text-slate-400 pl-4">
                <span className="text-yellow-200">Window</span>::<span className="text-blue-300">new</span>()
              </p>
              <p className="text-slate-400 pl-8">
                .<span className="text-blue-300">with_title</span>(<span className="text-green-400">&quot;Solar Simulation&quot;</span>)
              </p>
              <p className="text-slate-400 pl-8">
                .<span className="text-blue-300">on_startup</span>(|scene, _| {'{'}
              </p>

              <p className="text-slate-500 pl-12">{'// Spawn the sun at origin'}</p>
              <p className="text-slate-400 pl-12">
                <span className="text-pink-400">let</span> sun = <span className="text-yellow-200">Object</span>::<span className="text-blue-300">new</span>(<span className="text-yellow-200">Geometry</span>::Sphere(<span className="text-orange-300">2.0</span>));
              </p>
              <p className="text-slate-400 pl-12">
                <span className="text-pink-400">let</span> sun_id = scene.<span className="text-blue-300">spawn</span>(sun, <span className="text-yellow-200">None</span>);
              </p>
              <br />

              <p className="text-slate-500 pl-12">{"// Planet inherits Sun's transform logic"}</p>
              <p className="text-slate-400 pl-12">
                <span className="text-pink-400">let</span> planet = <span className="text-yellow-200">Object</span>::<span className="text-blue-300">new</span>(<span className="text-yellow-200">Geometry</span>::Sphere(<span className="text-orange-300">0.8</span>))
              </p>
              <p className="text-slate-400 pl-16">
                .<span className="text-blue-300">with_position</span>([<span className="text-orange-300">6.0</span>, <span className="text-orange-300">0.0</span>, <span className="text-orange-300">0.0</span>]);
              </p>
              <p className="text-slate-400 pl-12">
                scene.<span className="text-blue-300">spawn</span>(planet, <span className="text-yellow-200">Some</span>(sun_id));
              </p>
              <p className="text-slate-400 pl-8">{'}'})</p>

              <p className="text-slate-400 pl-8">
                .<span className="text-blue-300">on_update</span>(|state, scene, ctx| {'{'}
              </p>
              <p className="text-slate-500 pl-12">{"// Rotate Sun; children orbit automatically"}</p>
              <p className="text-slate-400 pl-12">
                <span className="text-pink-400">if let</span> <span className="text-yellow-200">Some</span>(sun) = scene.world.<span className="text-blue-300">get_mut</span>(state.sun_id) {'{'}
              </p>
              <p className="text-slate-400 pl-16">
                sun.transform.rotation[<span className="text-orange-300">1</span>] += <span className="text-orange-300">30.0</span> * ctx.dt;
              </p>
              <p className="text-slate-400 pl-12">{'}'}</p>
              <p className="text-slate-400 pl-8">{'}'})</p>
              <p className="text-slate-400 pl-8">
                .<span className="text-blue-300">create</span>();
              </p>

              <p className="text-slate-400">{'}'}</p>
            </div>
          </div>

          {/* Decorative Glow */}
          <div className="absolute -inset-4 bg-linear-to-r from-[#1dd4f6]/10 to-[#8b5cf6]/10 blur-xl -z-10 rounded-3xl" />
        </div>
      </section>
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
    </div>
  );
}