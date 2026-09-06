"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function StudyTimerPage() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<Date | null>(null);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    if (!startedAt.current) startedAt.current = new Date();
    lastTick.current = Date.now();
    setRunning(true);
  };
  const stop = async () => {
    setRunning(false);
    if (!startedAt.current || seconds <= 0) return;
    await fetch("/api/study/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personalMaterialId: null, startedAt: startedAt.current.toISOString(), endedAt: new Date().toISOString(), durationSeconds: seconds }) });
    startedAt.current = null;
    lastTick.current = null;
  };
  const reset = () => { setRunning(false); setSeconds(0); startedAt.current = null; lastTick.current = null; };
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");

  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10"><div className="mb-8 flex items-center justify-between"><div><p className="text-sm text-violet-400">Personal Study</p><h1 className="mt-1 text-3xl font-bold">Focus Timer</h1></div><Link href="/study/history" className="text-sm text-violet-400">History →</Link></div><section className="card p-8 text-center"><p className="muted text-sm">Timer-only study session</p><div className="mx-auto my-10 flex h-64 w-64 items-center justify-center rounded-full border-8 border-violet-500/30 bg-violet-500/5 shadow-[0_0_80px_rgba(124,92,255,0.12)]"><span className="font-mono text-5xl font-bold tracking-tight">{h}:{m}:{s}</span></div><div className="flex justify-center gap-3">{!running ? <button onClick={start} className="rounded-xl bg-violet-500 px-6 py-3 font-semibold">Start</button> : <button onClick={() => setRunning(false)} className="rounded-xl bg-white/10 px-6 py-3 font-semibold">Pause</button>}{running || seconds > 0 ? <button onClick={stop} className="rounded-xl bg-emerald-500/20 px-6 py-3 font-semibold text-emerald-300">Save & end</button> : null}{seconds > 0 && !running ? <button onClick={reset} className="rounded-xl bg-white/5 px-6 py-3">Reset</button> : null}</div></section></main>;
}
