"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VitalsReading } from "@/lib/vitals-store";
import { saveReading, getHistory, getAllPatientNames } from "@/lib/patient-storage";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString();
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */

export function VitalsDashboard() {
  // Per-patient latest vitals (keyed by name)
  const [patients, setPatients] = useState<Map<string, VitalsReading>>(new Map());
  const [connected, setConnected] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [history, setHistory] = useState<VitalsReading[]>([]);

  // Ref to avoid stale closures
  const selectedRef = useRef(selectedPatient);
  selectedRef.current = selectedPatient;

  // Handle incoming SSE vitals event
  const handleVitals = useCallback((reading: VitalsReading) => {
    // 1. Update in-memory patient map
    setPatients((prev) => {
      const next = new Map(prev);
      next.set(reading.name, reading);
      return next;
    });

    // 2. Persist to localStorage
    saveReading(reading.name, reading);

    // 3. If viewing this patient's detail, refresh history
    if (selectedRef.current === reading.name) {
      setHistory(getHistory(reading.name));
    }
  }, []);

  // SSE connection
  useEffect(() => {
    const source = new EventSource("/api/vitals/stream");

    const onReady = () => setConnected(true);

    const onVitals = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as VitalsReading;
        handleVitals(parsed);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };

    source.addEventListener("ready", onReady);
    source.addEventListener("vitals", onVitals);
    source.onerror = () => setConnected(false);

    return () => {
      source.removeEventListener("ready", onReady);
      source.removeEventListener("vitals", onVitals);
      source.close();
    };
  }, [handleVitals]);

  // On mount, load any patients already in localStorage
  useEffect(() => {
    const storedNames = getAllPatientNames();
    if (storedNames.length > 0) {
      setPatients((prev) => {
        const next = new Map(prev);
        for (const name of storedNames) {
          if (!next.has(name)) {
            const hist = getHistory(name);
            if (hist.length > 0) {
              next.set(name, hist[hist.length - 1]);
            }
          }
        }
        return next;
      });
    }
  }, []);

  // When selecting/deselecting a patient
  const openPatient = useCallback((name: string) => {
    setSelectedPatient(name);
    setHistory(getHistory(name));
  }, []);

  const closePatient = useCallback(() => {
    setSelectedPatient(null);
    setHistory([]);
  }, []);

  const statusText = connected ? "Connected" : "Waiting for data";
  const statusColor = connected ? "bg-emerald-500" : "bg-amber-500";

  const patientList = useMemo(() => Array.from(patients.entries()), [patients]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.2),transparent_35%)]" />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
        {/* Header */}
        <header className="rounded-2xl border border-cyan-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Vital Link Monitoring
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Real-Time IoT Patient Dashboard
          </h1>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            Streaming vitals from MAX30102 on ESP32 into a live hospital view
            with SSE updates.
          </p>
        </header>

        {/* Status bar */}
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Stream Status
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
              <p className="text-lg font-semibold text-slate-800">
                {statusText}
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Active Patients
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-800">
              {patientList.length}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              ESP32 Endpoint
            </p>
            <p className="mt-3 text-sm font-medium text-slate-800">
              POST /api/vitals
            </p>
          </article>
        </section>

        {/* Conditional: Patient List or Patient Detail */}
        {selectedPatient === null ? (
          <PatientListView
            patients={patientList}
            onSelect={openPatient}
          />
        ) : (
          <PatientDetailView
            patientName={selectedPatient}
            current={patients.get(selectedPatient) ?? null}
            history={history}
            onBack={closePatient}
          />
        )}

        {/* ESP32 payload hint */}
        <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-sm text-cyan-900 shadow-sm">
          <p className="font-semibold">ESP32 JSON payload format</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
{`{
  "name": "Patient Name",
  "heartRate": 78,
  "spo2": 98
}`}
          </pre>
        </section>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Patient List View                                                  */
/* ------------------------------------------------------------------ */

function PatientListView({
  patients,
  onSelect,
}: {
  patients: [string, VitalsReading][];
  onSelect: (name: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        All Patients
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-xl">
          <thead>
            <tr className="bg-slate-900 text-left text-xs uppercase tracking-[0.16em] text-slate-100">
              <th className="px-5 py-4 font-semibold">Patient Name</th>
              <th className="px-5 py-4 font-semibold">Heart Rate (bpm)</th>
              <th className="px-5 py-4 font-semibold">SpO2 (%)</th>
              <th className="px-5 py-4 font-semibold">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-sm text-slate-400"
                >
                  No patients connected yet. Waiting for ESP32 data…
                </td>
              </tr>
            ) : (
              patients.map(([name, reading]) => (
                <tr
                  key={name}
                  onClick={() => onSelect(name)}
                  className="cursor-pointer border-b border-slate-100 text-slate-800 transition-colors hover:bg-cyan-50"
                >
                  <td className="px-5 py-4 text-base font-semibold">
                    {name}
                  </td>
                  <td className="px-5 py-4 text-base font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-rose-500">♥</span>
                      {reading.heartRate}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-base font-medium">
                    {reading.spo2}%
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatTimestamp(reading.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Patient Detail View                                                */
/* ------------------------------------------------------------------ */

function PatientDetailView({
  patientName,
  current,
  history,
  onBack,
}: {
  patientName: string;
  current: VitalsReading | null;
  history: VitalsReading[];
  onBack: () => void;
}) {
  const recentHistory = useMemo(
    () => [...history].reverse().slice(0, 50),
    [history],
  );

  return (
    <>
      {/* Back button & patient name */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold text-slate-800">
          {patientName}
        </h2>
      </div>

      {/* Current vitals cards */}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Heart Rate
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-rose-500">
              {current?.heartRate ?? "--"}
            </span>
            <span className="text-lg text-slate-400">bpm</span>
          </div>
        </article>

        <article className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            SpO2
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-sky-500">
              {current?.spo2 ?? "--"}
            </span>
            <span className="text-lg text-slate-400">%</span>
          </div>
        </article>
      </section>

      {/* History table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Reading History
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({history.length} total)
          </span>
        </h3>
        <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-xl">
            <thead className="sticky top-0">
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-[0.16em] text-slate-100">
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">Heart Rate</th>
                <th className="px-5 py-3 font-semibold">SpO2</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-sm text-slate-400"
                  >
                    No history yet. Data will appear as readings arrive.
                  </td>
                </tr>
              ) : (
                recentHistory.map((r, i) => (
                  <tr
                    key={r.updatedAt + i}
                    className="border-b border-slate-100 text-slate-800"
                  >
                    <td className="px-5 py-3 text-sm text-slate-400">
                      {history.length - i}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {formatTime(r.updatedAt)}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">
                      <span className="text-rose-500">♥</span> {r.heartRate}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">
                      {r.spo2}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}