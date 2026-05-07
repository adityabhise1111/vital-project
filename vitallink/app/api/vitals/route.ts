import {
  getAllLatestVitals,
  isValidVitalsPayload,
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
      { error: "Payload must include name (string), heartRate (number), and spo2 (number)" },
      {
        status: 400,
      },
    );
  }

  const reading = updateVitals(payload);

  return Response.json({ ok: true, reading });
}

export function GET() {
  const map = getAllLatestVitals();
  const patients: Record<string, unknown> = {};
  for (const [name, reading] of map) {
    patients[name] = reading;
  }
  return Response.json({ patients });
}