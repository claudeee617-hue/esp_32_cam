# Setup and Deployment

## 1. Confirm hardware before flashing

The project description says three sensors and three actuators, but their exact models are not finalized. The firmware uses configurable placeholders. Before using it, decide:

- Sensor models and whether each output is digital or analog.
- Sensor active level (HIGH/LOW), voltage, and whether level shifting is needed.
- Exact ESP32 board variant and GPIO pinout.
- Output driver type and safe fail-state.

Never drive a relay coil or other load directly from an ESP32 GPIO. Use a rated transistor/MOSFET/relay driver, flyback protection where applicable, and an independent power supply where needed. Do not use GPIOs reserved for flash/PSRAM or boot strapping without checking the board documentation.

## 2. Firmware

### Main ESP32

Open `firmware/esp32_controller/esp32_controller.ino` in Arduino IDE. Install the ESP32 board package. Set:

- `WIFI_SSID`, `WIFI_PASSWORD`
- `DEVICE_ID`
- `API_BASE_URL` (your deployed Worker origin)
- `DEVICE_TOKEN` (a secret configured as Worker secret `DEVICE_TOKEN`)
- Sensor and output pins after validating your actual hardware.

The sketch reports generic three-channel digital sensor states. Its outputs are intentionally kept inactive in this starter; wire control logic only after the real actuator and safety behavior have been reviewed. The example does not claim that an intrusion is confirmed by a single sensor.

### ESP32-CAM

Open `firmware/esp32_cam/esp32_cam.ino`. Select the correct camera board model in the sketch and install the ESP32 camera libraries included with the Espressif Arduino core. Set Wi-Fi credentials locally. This sketch exposes a simple local status endpoint; use the camera web-server example for your exact module if you need a browser stream.

Keep the camera endpoint LAN-only. Do not port-forward it or expose it directly to the internet.

## 3. Cloudflare Worker

Install Node.js LTS, then:

```bash
cd worker
npm install
npx wrangler login
```

Create a D1 database:

```bash
npx wrangler d1 create esp32-cam-events
```

Copy the returned database ID into `wrangler.toml` under `[[d1_databases]]`, then apply the schema:

```bash
npx wrangler d1 execute esp32-cam-events --remote --file=./schema.sql
```

Set an API token (do not place it in source control):

```bash
npx wrangler secret put DEVICE_TOKEN
```

Deploy:

```bash
npx wrangler deploy
```

The Worker serves the dashboard at the root URL and API routes under `/api`.

## 4. Test locally

```bash
cd worker
npm install
npm run dev
```

Health check:

```bash
curl http://127.0.0.1:8787/api/health
```

Ingestion example (replace token):

```bash
curl -X POST http://127.0.0.1:8787/api/telemetry \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer YOUR_DEVICE_TOKEN' \
  -d '{"device_id":"esp32-main-01","sensors":{"sensor1":false,"sensor2":false,"sensor3":false},"outputs":{"output1":false,"output2":false,"output3":false},"event":"heartbeat"}'
```

## 5. GitHub Actions

A CI workflow validates basic Worker syntax and dependency installation. For deployment from GitHub Actions, configure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then add a deploy workflow only when you are ready to authorize automated production deployments.

## 6. Image storage (next integration step)

This starter deliberately does not accept arbitrary image uploads or make camera URLs public. For evidence images, create a private Cloudflare R2 bucket and implement a short-lived authenticated upload flow (prefer pre-signed URLs or Worker-mediated upload with strict content type and size checks). Keep bucket access private and serve objects only after authorization.

## 7. Privacy and operation

Use visible notice/consent where required. Minimize retention, restrict dashboard access, rotate tokens, and avoid collecting more footage than needed. Test with simulated telemetry before connecting real sensors or outputs.
