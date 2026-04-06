export const PATIENT_NAME = "Ram Bhau";

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

let latestVitals: VitalsReading | null = null;
const listeners = new Set<VitalsListener>();

export function getLatestVitals() {
  return latestVitals;
}

export function subscribeVitals(listener: VitalsListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function updateVitals(input: VitalsInput) {
  latestVitals = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  for (const listener of listeners) {
    listener(latestVitals);
  }

  return latestVitals;
}

export function isValidVitalsPayload(payload: unknown): payload is VitalsInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const data = payload as Partial<VitalsInput>;

  return (
    typeof data.name === "string" &&
    typeof data.heartRate === "number" &&
    Number.isFinite(data.heartRate) &&
    typeof data.spo2 === "number" &&
    Number.isFinite(data.spo2)
  );
}