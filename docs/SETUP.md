# Cloudflare and Optional Hardware Setup

## 1. Run the virtual lab first — no hardware

The primary project experience has no physical prerequisites.

```bash
cd dashboard
python -m http.server 8080
```

Open `http://localhost:8080`. Use the scenario library to demonstrate normal operation, a perimeter intrusion sequence, night activity, a sensor fault and camera-offline recovery. See [VIRTUAL_LAB.md](VIRTUAL_LAB.md).

## 2. Deploy the browser simulator to Cloudflare

The Worker serves the static dashboard from `../dashboard`. D1 and secrets are optional for hosting the simulator.

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

After deployment, open the `workers.dev` URL shown by Wrangler. The dashboard should load at the root; `/api/health` reports Worker status.

## 3. Optional durable event storage

Only needed when integrating an authenticated device or a future server-side event producer.

```bash
npx wrangler d1 create esp32-cam-events
```

Copy the returned database ID into `wrangler.toml` under `[[d1_databases]]`, uncomment the binding, then apply the schema:

```bash
npx wrangler d1 execute esp32-cam-events --remote --file=./schema.sql
npx wrangler secret put DEVICE_TOKEN
npx wrangler deploy
```

Keep `DEVICE_TOKEN` secret. Do not paste it into the frontend, firmware committed to GitHub, README, issue, or browser storage. The current browser simulator uses localStorage and does not send its data to the Worker.

## 4. Optional future physical integration

The default project demonstration does not require any physical board. If you later add hardware:

- Select the exact ESP32 board and ESP32-CAM module.
- Finalize the three sensor models and whether their outputs are digital or analog.
- Verify voltage levels, active levels, pin restrictions and grounding.
- Select proper driver circuits and a safe fail-state for all outputs.
- Test with a safe bench setup and manual override.

The example firmware uses placeholder pins and is not ready to flash without board-specific validation. Do not drive a relay coil or any high-current load directly from a GPIO. Keep camera endpoints on a trusted local network; do not port-forward them to the public internet.

## 5. Privacy and operations

The camera lab is generated canvas artwork and does not request webcam access, capture real people, or upload images. The browser simulator stores events, configuration and capture metadata locally in the current browser. Export CSV/JSON to preserve a demonstration. Clear browser storage or use the in-app reset to remove the local session.
