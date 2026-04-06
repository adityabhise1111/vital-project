"use client";

import { useEffect, useMemo, useState } from "react";

import type { VitalsReading } from "@/lib/vitals-store";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString();
}

export function VitalsDashboard() {
  const [reading, setReading] = useState<VitalsReading | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/vitals/stream");

    const onReady = () => {
      setConnected(true);
    };

    const onVitals = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as VitalsReading;
        setReading(parsed);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };

    source.addEventListener("ready", onReady);
    source.addEventListener("vitals", onVitals);
    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.removeEventListener("ready", onReady);
      source.removeEventListener("vitals", onVitals);
      source.close();
    };
  }, []);

  const statusText = connected ? "Connected" : "Waiting for data";
  const statusColor = connected ? "bg-emerald-500" : "bg-amber-500";

  const lastUpdated = useMemo(
    () => formatTimestamp(reading?.updatedAt ?? null),
    [reading?.updatedAt],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.2),transparent_35%)]" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
        <header className="rounded-2xl border border-cyan-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Vital Link Monitoring
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Real-Time IoT Patient Dashboard
          </h1>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            Streaming vitals from MAX30102 on ESP32 into a live hospital view with
            SSE updates.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Stream Status
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
              <p className="text-lg font-semibold text-slate-800">{statusText}</p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Last Updated
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-800">{lastUpdated}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              ESP32 Endpoint
            </p>
            <p className="mt-3 text-sm font-medium text-slate-800">
              POST http://localhost:3000/api/vitals
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-xl">
              <thead>
                <tr className="bg-slate-900 text-left text-xs uppercase tracking-[0.16em] text-slate-100">
                  <th className="px-5 py-4 font-semibold">Patient Name</th>
                  <th className="px-5 py-4 font-semibold">Heart Rate (bpm)</th>
                  <th className="px-5 py-4 font-semibold">SpO2 (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 text-slate-800">
                  <td className="px-5 py-4 text-base font-semibold">
                    {reading?.name ?? "Ram Bhau"}
                  </td>
                  <td className="px-5 py-4 text-base font-medium">
                    {reading?.heartRate ?? "--"}
                  </td>
                  <td className="px-5 py-4 text-base font-medium">
                    {reading?.spo2 ?? "--"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-sm text-cyan-900 shadow-sm">
          <p className="font-semibold">ESP32 JSON payload format</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
{`{
  "name": "Ram Bhau",
  "heartRate": 78,
  "spo2": 98
}`}
          </pre>
        </section>
      </main>
    </div>
  );
}