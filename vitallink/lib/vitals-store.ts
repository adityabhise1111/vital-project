export type VitalsInput = {
  name: string;
  heartRate: number;
  spo2: number;
};

export type VitalsReading = {
  name: string;
  heartRate: number;
  spo2: number;
  updatedAt: string;
};

type VitalsListener = (reading: VitalsReading) => void;

/** Latest vitals per patient, keyed by patient name */
const latestVitalsMap = new Map<string, VitalsReading>();
const listeners = new Set<VitalsListener>();

/** Returns the latest vitals for all patients */
export function getAllLatestVitals(): Map<string, VitalsReading> {
  return latestVitalsMap;
}

/** Returns the latest vitals for a specific patient */
export function getLatestVitals(patientName?: string): VitalsReading | null {
  if (patientName) {
    return latestVitalsMap.get(patientName) ?? null;
  }
  // Backward compat: return first entry if no name given
  const first = latestVitalsMap.values().next();
  return first.done ? null : first.value;
}

export function subscribeVitals(listener: VitalsListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function updateVitals(input: VitalsInput): VitalsReading {
  const reading: VitalsReading = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  latestVitalsMap.set(input.name, reading);

  for (const listener of listeners) {
    listener(reading);
  }

  return reading;
}

export function isValidVitalsPayload(payload: unknown): payload is VitalsInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const data = payload as Partial<VitalsInput>;

  return (
    typeof data.name === "string" &&
    data.name.trim().length > 0 &&
    typeof data.heartRate === "number" &&
    Number.isFinite(data.heartRate) &&
    typeof data.spo2 === "number" &&
    Number.isFinite(data.spo2)
  );
}