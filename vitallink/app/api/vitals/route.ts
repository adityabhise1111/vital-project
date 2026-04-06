import {
  getLatestVitals,
  isValidVitalsPayload,
  PATIENT_NAME,
  updateVitals,
} from "@/lib/vitals-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      {
        status: 400,
      },
    );
  }

  if (!isValidVitalsPayload(payload)) {
    return Response.json(
      { error: "Payload must include name, heartRate, and spo2 as numbers" },
      {
        status: 400,
      },
    );
  }

  if (payload.name !== PATIENT_NAME) {
    return Response.json(
      { error: `Only patient '${PATIENT_NAME}' is supported` },
      {
        status: 400,
      },
    );
  }

  const reading = updateVitals(payload);

  return Response.json({ ok: true, reading });
}

export function GET() {
  return Response.json({
    patient: PATIENT_NAME,
    latest: getLatestVitals(),
  });
}