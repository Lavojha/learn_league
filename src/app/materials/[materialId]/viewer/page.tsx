"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Session = { id: string; expiresAt: string; status: "active" | "paused" | "ended" | "expired" };

export default function MaterialViewerPage({ params }: { params: Promise<{ materialId: string }> }) {
  const [id, setId] = useState("");
  const [url, setUrl] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [message, setMessage] = useState("Starting secure study session…");
  const [allowPause, setAllowPause] = useState(false);
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    params.then(async ({ materialId }) => {
      if (cancelled) return;
      setId(materialId);
      const currentDeviceId = localStorage.getItem("learn-league-device") || crypto.randomUUID();
      localStorage.setItem("learn-league-device", currentDeviceId);
      setDeviceId(currentDeviceId);

      const start = await fetch(`/api/materials/${materialId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: currentDeviceId }),
      });
      const startData = await start.json();
      if (!start.ok) return setMessage(startData.error ?? "Unable to start access");

      setSession(startData.session);
      setSeconds(Math.max(0, Math.floor((new Date(startData.session.expiresAt).getTime() - Date.now()) / 1000)));

      const view = await fetch(`/api/materials/${materialId}/viewer?sessionId=${encodeURIComponent(startData.session.id)}&deviceId=${encodeURIComponent(currentDeviceId)}`);
      const viewData = await view.json();
      if (!view.ok) return setMessage(viewData.error ?? "Unable to open PDF");
      setUrl(viewData.signedUrl ?? viewData.url);
      setAllowPause(Boolean(viewData.allowPause));

      timer = setInterval(() => {
        setSession((current) => {
          if (!current || current.status !== "active") return current;
          const remaining = Math.max(0, Math.floor((new Date(current.expiresAt).getTime() - Date.now()) / 1000));
          setSeconds(remaining);
          if (remaining === 0) {
            setMessage("Access time expired.");
            return { ...current, status: "expired" };
          }
          return current;
        });
      }, 1000);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [params]);

  const action = async (value: "pause" | "resume" | "end") => {
    if (!session || !deviceId) return;
    const r = await fetch(`/api/materials/${id}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: value, sessionId: session.id, deviceId }),
    });
    const data = await r.json();
    if (!r.ok) {
      setMessage(data.error ?? "Unable to update session");
      if (data.session) setSession(data.session);
      return;
    }
    setSession(data.session);
    if (value === "end") {
      setUrl("");
      setMessage("Study session ended.");
    } else if (value === "pause") {
      setMessage("Access paused. Your remaining time is frozen.");
    } else {
      setSeconds(Math.max(0, Math.floor((new Date(data.session.expiresAt).getTime() - Date.now()) / 1000)));
      setMessage("Access resumed.");
    }
  };

  const clock = seconds === null ? "--:--" : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <main className="flex min-h-screen flex-col bg-black"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><Link href={`/materials/${id}`} className="muted text-sm">← Material</Link><div className="rounded-full bg-violet-500/10 px-4 py-2 font-mono text-violet-300">{clock}</div><div className="flex gap-2">{session?.status === "paused" ? <button onClick={() => void action("resume")} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">Resume</button> : allowPause && session?.status === "active" ? <button onClick={() => void action("pause")} className="rounded-lg bg-white/10 px-3 py-2 text-xs">Pause</button> : null}{session && !["ended", "expired"].includes(session.status) && <button onClick={() => void action("end")} className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">End</button>}</div></header>{message !== "Starting secure study session…" && <p className="px-4 py-2 text-center text-xs text-violet-300">{message}</p>}{url && session?.status !== "ended" && session?.status !== "expired" ? <iframe title="Learn League PDF viewer" src={url} className="min-h-[calc(100vh-64px)] w-full flex-1 bg-white" /> : <div className="flex flex-1 items-center justify-center"><p className="muted">{message}</p></div>}</main>;
}
