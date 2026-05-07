import type { VitalsReading } from "./vitals-store";

const STORAGE_PREFIX = "vitallink_history_";
const MAX_READINGS_PER_PATIENT = 500;

/**
 * Saves a vitals reading to localStorage for a specific patient.
 * Caps history at MAX_READINGS_PER_PATIENT entries (oldest are dropped).
 */
export function saveReading(patientName: string, reading: VitalsReading): void {
  const key = STORAGE_PREFIX + patientName;

  try {
    const existing = localStorage.getItem(key);
    const history: VitalsReading[] = existing ? JSON.parse(existing) : [];

    history.push(reading);

    // Keep only the most recent readings
    if (history.length > MAX_READINGS_PER_PATIENT) {
      history.splice(0, history.length - MAX_READINGS_PER_PATIENT);
    }

    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // localStorage full or unavailable — silently fail
    console.warn(`[patient-storage] Failed to save reading for "${patientName}"`);
  }
}

/**
 * Returns the full history of readings for a patient.
 */
export function getHistory(patientName: string): VitalsReading[] {
  const key = STORAGE_PREFIX + patientName;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as VitalsReading[];
  } catch {
    return [];
  }
}

/**
 * Returns the most recent reading for a patient from localStorage.
 */
export function getLatestStored(patientName: string): VitalsReading | null {
  const history = getHistory(patientName);
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * Returns a list of all patient names that have data in localStorage.
 */
export function getAllPatientNames(): string[] {
  const names: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        names.push(key.slice(STORAGE_PREFIX.length));
      }
    }
  } catch {
    // localStorage unavailable
  }

  return names;
}

/**
 * Clears all stored data for a specific patient.
 */
export function clearPatient(patientName: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + patientName);
  } catch {
    // ignore
  }
}

/**
 * Clears all patient data from localStorage.
 */
export function clearAllPatients(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
