# Hardware-Free Virtual Lab

The browser simulator is the primary way to demonstrate and test this project. **No ESP32 board, ESP32-CAM module, sensor, relay, webcam, Wi-Fi credentials, API token, or Cloudflare account is needed to use the simulator.**

## Start locally

From the repository root:

```bash
cd dashboard
python -m http.server 8080
```

Open `http://localhost:8080`. Alternatively use VS Code Live Server. The simulator is static HTML, CSS and JavaScript; it does not need npm or a backend.

## What is simulated

- Three editable digital sensor channels (zone motion, entry contact, and window contact).
- Three virtual response indicators (status beacon, audible-alert indicator, and remote-notification flag).
- An ESP32 controller emulator with virtual connectivity and health status.
- An ESP32-CAM emulator that draws a moving scene on an HTML canvas. It is generated artwork, not a camera feed, photo, webcam capture, or AI vision result.
- One-click normal, perimeter intrusion, night activity, sensor fault, and camera-offline scenarios.
- A replayable event stream, event filters, simulated system health, an activity chart, and virtual camera frame metadata.
- Browser-local configuration and event history, plus CSV and JSON export.
- A lightweight service worker for offline loading after the app has been opened once online.

## Run a presentation demo

1. Open **Virtual Hardware**.
2. Choose **Perimeter intrusion** from the scenario library.
3. Watch the sequence: zone motion, entry contact, virtual camera verification, and a simulated alert.
4. Open **Camera Lab** to see the generated scene and capture local frame metadata.
5. Open **Analytics** to review the simulated activity.
6. Open **Event History** and export the session CSV.

Use **Normal operation** to return all channels to their healthy idle state. **Sensor fault** and **Camera offline** are useful fault-tolerance demonstrations.

## Data integrity

Every generated value is browser-simulated. The dashboard labels itself as simulation mode and does not pretend a physical board is online. A camera snapshot stores event metadata only, not an image. Session data is stored in that browser's localStorage; it does not automatically sync between browsers or to Cloudflare. Export JSON/CSV when you need to retain or share a demo session.

## Later physical integration

The firmware folders remain optional hardware-integration templates. They are not needed for this virtual lab. When hardware is eventually available, validate the exact board pinout, sensor electrical levels, driver circuits and safe behavior before flashing or connecting anything. The virtual lab should remain available as the software-only demo mode.

## Screenshot-ready analytics and chart export

Open **Analytics** to see four pre-filled visualizations without waiting for events:

1. Sensor signal trend across 60 virtual samples.
2. Hourly event volume grouped into 2-hour windows.
3. Sensor activity distribution across motion, entry and window channels.
4. Illustrative system-health trend across a 24-hour window.

The page also includes an event-composition summary. The fixed baseline is marked as illustrative simulated demo data; it is not physical sensor telemetry.

Use **Export charts PNG** to download a single 2×2 report image named `sentinel-analytics-demo-report.png`. It includes all four graphs, a timestamp, and a clear simulated-data note. The image is suitable for project documentation and presentation slides.
