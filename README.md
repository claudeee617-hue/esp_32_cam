# ESP32-CAM Smart Intrusion Detection

A starter implementation for an ESP32 + ESP32-CAM IoT intrusion-monitoring project.

## Architecture

- **ESP32 controller**: reads up to three configurable digital sensors and controls up to three configurable outputs.
- **ESP32-CAM**: serves a camera stream/capture endpoint on the local network. Image upload to the cloud is handled separately by an authenticated client or future firmware integration.
- **Cloudflare Worker**: authenticated event and telemetry API.
- **Dashboard**: static responsive dashboard served by the Worker.
- **Cloudflare D1 (optional)**: stores telemetry and intrusion events. The API has an in-memory fallback for local development only; production persistence requires D1 binding.

## Repository layout

- `firmware/esp32_controller/` — Arduino sketch template for the main ESP32.
- `firmware/esp32_cam/` — ESP32-CAM camera web-server template (local LAN only).
- `worker/` — Cloudflare Worker API and dashboard.
- `worker/schema.sql` — D1 schema.
- `docs/SETUP.md` — hardware, firmware, and Cloudflare setup.
- `wrangler.toml` — Worker configuration.

## Important safety and privacy notes

This is a monitoring and alerting prototype, not a certified security system. The default firmware example uses placeholder GPIO assignments and generic digital inputs; verify your exact board, sensor output voltage, active level, and relay/driver requirements before connecting hardware. Do not connect motors, sirens, locks, or other high-current loads directly to GPIO pins. Use properly rated drivers, isolation, fusing, and a safe manual override. Do not configure this prototype to injure, trap, or physically confront anyone.

Camera streams should remain on a trusted local network. Do not expose the ESP32-CAM web server directly to the public internet. Use the Cloudflare API for event metadata and upload images only through an authenticated, size-limited endpoint after configuring object storage and access controls. Obtain appropriate consent and follow applicable privacy rules before recording people.

## Quick start

1. Follow [docs/SETUP.md](docs/SETUP.md).
2. Run the Worker locally with Wrangler.
3. Configure the dashboard device ID and API token.
4. Flash firmware only after confirming the actual board and pinout.
5. Create the D1 database and apply `worker/schema.sql` before deploying production telemetry.

## API

- `GET /api/health` — service health.
- `GET /api/status?device_id=...` — latest status and recent events.
- `POST /api/telemetry` — authenticated telemetry/event ingestion.

All timestamps are generated/normalized server-side where possible. Never commit real API tokens, Wi-Fi credentials, Cloudflare account IDs, or private keys.

## Deployment status

The source and Worker configuration are provided here. A real Cloudflare deployment still requires your Cloudflare account, Worker deployment authorization, and (for durable history) D1 database binding. A successful GitHub commit does not mean the Worker is deployed.
