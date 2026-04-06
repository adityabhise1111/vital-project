# Vital Link

Real-time IoT health monitoring system built with Next.js App Router.

## Overview

- One patient only: Ram Bhau
- ESP32 + MAX30102 sends heart rate and SpO2 every second
- Backend API route accepts incoming vitals and stores latest reading in memory
- Frontend dashboard receives updates via Server-Sent Events (SSE)
- No polling architecture and no database required

## Run Locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## API Endpoints

- POST `/api/vitals`
- GET `/api/vitals` (debug helper to inspect latest in-memory reading)
- GET `/api/vitals/stream` (SSE stream for real-time dashboard updates)

## ESP32 Payload Format

```json
{
	"name": "Ram Bhau",
	"heartRate": 78,
	"spo2": 98
}
```

## Example Endpoint Usage

```bash
curl -X POST http://localhost:3000/api/vitals \
	-H "Content-Type: application/json" \
	-d '{"name":"Ram Bhau","heartRate":81,"spo2":97}'
```

## Architecture Notes

- In-memory storage means values reset on server restart
- SSE keeps API usage low and avoids frontend polling
- Works well locally and in production-friendly Node runtime deployments
