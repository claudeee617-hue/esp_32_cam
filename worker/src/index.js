const MAX_BODY_BYTES = 8 * 1024;
const MAX_EVENTS = 100;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validChannels(value, prefix) {
  if (!isPlainObject(value)) return false;
  const allowed = [1, 2, 3].map((n) => prefix + n);
  return Object.keys(value).every((key) =>
    allowed.includes(key) && typeof value[key] === "boolean"
  );
}

function sanitizePayload(input) {
  if (!isPlainObject(input)) throw new Error("Body must be a JSON object");
  const deviceId = String(input.device_id || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,48}$/.test(deviceId)) {
    throw new Error("device_id must be 1-48 letters, numbers, underscores or hyphens");
  }
  const sensors = input.sensors ?? {};
  const outputs = input.outputs ?? {};
  if (!validChannels(sensors, "sensor")) throw new Error("Invalid sensors; use sensor1-sensor3 boolean values");
  if (!validChannels(outputs, "output")) throw new Error("Invalid outputs; use output1-output3 boolean values");
  const event = String(input.event || "heartbeat").slice(0, 48);
  if (!/^[a-zA-Z0-9_-]+$/.test(event)) throw new Error("Invalid event label");
  return { deviceId, sensors, outputs, event };
}

async function readJsonLimited(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("Payload too large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error("Payload too large");
  return JSON.parse(text);
}

async function persist(env, item) {
  if (!env.DB) return false;
  await env.DB.prepare(
    "INSERT INTO telemetry (device_id, event, sensors_json, outputs_json, received_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    item.deviceId,
    item.event,
    JSON.stringify(item.sensors),
    JSON.stringify(item.outputs),
    item.receivedAt
  ).run();
  return true;
}

async function latest(env, deviceId) {
  if (!env.DB) return [];
  const result = await env.DB.prepare(
    "SELECT device_id, event, sensors_json, outputs_json, received_at FROM telemetry WHERE device_id = ? ORDER BY id DESC LIMIT ?"
  ).bind(deviceId, MAX_EVENTS).all();
  return (result.results || []).map((row) => ({
    device_id: row.device_id,
    event: row.event,
    sensors: JSON.parse(row.sensors_json),
    outputs: JSON.parse(row.outputs_json),
    received_at: row.received_at
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "esp32-cam-iot", persistence: Boolean(env.DB) });
    }

    if (url.pathname === "/api/telemetry" && request.method === "POST") {
      if (!env.DEVICE_TOKEN) return json({ error: "Server token is not configured" }, 503);
      const auth = request.headers.get("authorization") || "";
      if (auth !== `Bearer ${env.DEVICE_TOKEN}`) return unauthorized();
      try {
        const payload = sanitizePayload(await readJsonLimited(request));
        const item = { ...payload, receivedAt: new Date().toISOString() };
        const persisted = await persist(env, item);
        return json({ ok: true, persisted, received_at: item.receivedAt }, 201);
      } catch (error) {
        return json({ error: error instanceof SyntaxError ? "Invalid JSON" : error.message }, 400);
      }
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      const deviceId = String(url.searchParams.get("device_id") || "").trim();
      if (!/^[a-zA-Z0-9_-]{1,48}$/.test(deviceId)) {
        return json({ error: "Valid device_id query parameter required" }, 400);
      }
      return json({ device_id: deviceId, events: await latest(env, deviceId), persistence: Boolean(env.DB) });
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Dashboard assets are not configured.", { status: 503 });
  }
};
