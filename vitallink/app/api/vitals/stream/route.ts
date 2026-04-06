import { getLatestVitals, subscribeVitals } from "@/lib/vitals-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const writeEvent = (event: string, data: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const closeStream = () => {
        if (closed) {
          return;
        }

        closed = true;
        unsubscribe();
        request.signal.removeEventListener("abort", closeStream);
        controller.close();
      };

      const unsubscribe = subscribeVitals((reading) => {
        writeEvent("vitals", reading);
      });

      writeEvent("ready", { connected: true });

      const latest = getLatestVitals();
      if (latest) {
        writeEvent("vitals", latest);
      }

      request.signal.addEventListener("abort", closeStream);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}