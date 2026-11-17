# Sentinel Lab — ESP32-CAM Intrusion Detection Digital Twin

**Run the complete software demonstration without physical hardware.** The default experience is a browser-based virtual IoT lab. No ESP32, ESP32-CAM, sensors, relays, webcam, Wi-Fi credentials, API key, or Cloudflare account is needed to open and use the simulator locally.

## Hosted demo

**Cloudflare Worker deployment:** [Open Sentinel Virtual IoT Lab](https://esp32-cam-iot.ronakanantkijaan.workers.dev)

The Worker deployment is published on the account's workers.dev subdomain. The browser simulator is hardware-free and labels generated sensor data and camera scenes as simulated. Its current session data is stored locally in your browser.

## Start here: hardware-free simulator

The dashboard is a self-contained static application with a simulated ESP32 controller, three virtual sensors, three response indicators, an ESP32-CAM scene emulator, event history, analytics, scenario replays, and local exports.

**Local quick start**

```bash
cd dashboard
python -m http.server 8080
```

Open `http://localhost:8080`.

Or open the GitHub repository and enable GitHub Pages from the `dashboard` folder using a Pages-compatible build workflow. For Cloudflare hosting, see [Cloudflare deployment](#cloudflare-deployment).

### Included virtual experiences

- **Overview:** system health, simulated sensor channels, virtual actuator indicators, camera scene and live activity stream.
- **Virtual Hardware Lab:** toggle all three inputs and three outputs; rename the channels; inspect the virtual ESP32 controller.
- **Camera Lab:** animated generated scene, simulated motion overlay, camera link fault injection and frame metadata capture. It does not access a webcam or create real photographs.
- **Scenario library:** normal operation, perimeter intrusion, night activity, sensor fault and camera-offline replays.
- **Analytics:** four screenshot-ready graphs (sensor signal timeline, hourly event-volume bars, sensor distribution doughnut, and virtual system-health trend), plus event composition and a one-click PNG report export. The baseline is explicitly marked as simulated demo data.
- **Event History:** filter system, sensor and alert records; export CSV.
- **Configuration:** rename device/zone, choose simulation speed, enable/disable generated telemetry and camera overlays, export JSON, reset local state.
- **Offline support:** service worker caches the static app after the first online visit.

All generated values are explicitly marked as **simulated**. Events, preferences and frame metadata stay in the browser's localStorage; they do not automatically sync between browsers or to Cloudflare. Export data when you need to preserve a demonstration.

## Architecture

```text
Browser Virtual Lab (no hardware)
  ├── ESP32 controller emulator
  │     ├── 3 virtual sensor inputs
  │     └── 3 virtual response indicators
  ├── ESP32-CAM scene emulator (generated canvas artwork)
  ├── Scenario engine + event timeline
  ├── Analytics + CSV/JSON export
  └── Local browser storage + offline cache

Optional cloud layer
  └── Cloudflare Worker API + optional D1 event persistence

Optional future physical layer
  ├── ESP32 controller firmware template
  └── ESP32-CAM firmware template
```

## Repository layout

- `dashboard/` — hardware-free web application and offline assets.
- `docs/VIRTUAL_LAB.md` — detailed simulator guide and demo script.
- `docs/SETUP.md` — optional Cloudflare and future hardware setup.
- `firmware/esp32_controller/` — optional Arduino starter for the main ESP32.
- `firmware/esp32_cam/` — optional camera-board connectivity starter.
- `worker/` — Cloudflare Worker API, Wrangler config and D1 schema.
- `.github/workflows/ci.yml` — syntax checks for the Worker and browser app.

## Cloudflare deployment

The browser simulator can be hosted by the Worker without D1 and without a device token. From the repository root:

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

Wrangler serves the static files from `dashboard/` and exposes `GET /api/health`. To persist authenticated physical-device telemetry later, create a D1 database, apply `schema.sql`, configure the D1 binding in `wrangler.toml`, and add a `DEVICE_TOKEN` Worker secret. None of those optional steps is required for the virtual simulator.

## Optional hardware integration

The firmware folders are future integration templates, not requirements for the software demo. The hardware pin assignments and sensor types have not been finalized. Verify the exact board, pinout, voltage levels, drivers and safe fail-states before connecting or flashing real equipment. Never drive a load directly from a GPIO pin.

## Safety, privacy and data integrity

This is an educational prototype, not a certified alarm or access-control product. No real alarm, lock, siren, camera, notification or actuator is controlled by the simulator. The virtual camera is generated illustration, not a live feed or AI recognition. Use consent and appropriate retention controls before any future real-world recording. Do not expose a physical ESP32-CAM stream directly to the public internet.

## API (optional device path)

- `GET /api/health` — Worker health and D1 availability.
- `GET /api/status?device_id=...` — recent persisted device events.
- `POST /api/telemetry` — authenticated telemetry ingestion, requiring a `DEVICE_TOKEN` secret.

A deployed dashboard is not evidence that physical hardware is connected. The app continuously labels its own data source.
