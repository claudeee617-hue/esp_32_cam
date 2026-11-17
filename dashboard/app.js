const DEVICE_ID = "esp32-main-01";
const $ = (id) => document.getElementById(id);
$("device-label").textContent = DEVICE_ID;

function renderChannels(target, data, prefix) {
  const entries = [1,2,3].map((n) => [prefix+n, data?.[prefix+n] === true]);
  $(target).innerHTML = entries.map(([name, active]) =>
    `<div class="channel"><span class="channel-name">${name.toUpperCase()}</span><span class="state ${active ? "active" : "inactive"}">${active ? "ACTIVE" : "INACTIVE"}</span></div>`
  ).join("");
}
function time(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
async function refresh() {
  try {
    const response = await fetch(`/api/status?device_id=${encodeURIComponent(DEVICE_ID)}`, {cache:"no-store"});
    if (!response.ok) throw new Error("API unavailable");
    const data = await response.json();
    $("connection").textContent = "API ONLINE";
    $("mode").textContent = data.persistence ? "D1 persistence enabled" : "D1 not configured";
    const events = data.events || [];
    $("event-count").textContent = events.length;
    const latest = events[0];
    $("device-state").textContent = latest ? "REPORTING" : "AWAITING";
    $("last-seen").textContent = latest ? "Last event " + time(latest.received_at) : "Waiting for first event";
    renderChannels("sensors", latest?.sensors, "sensor");
    renderChannels("outputs", latest?.outputs, "output");
    $("active-sensors").textContent = latest ? Object.values(latest.sensors).filter(Boolean).length + " / 3" : "— / 3";
    $("active-outputs").textContent = latest ? Object.values(latest.outputs).filter(Boolean).length + " / 3" : "— / 3";
    $("events").innerHTML = events.length ? events.map((event) =>
      `<tr><td>${String(event.event).replace(/[<>]/g,"")}</td><td>${String(event.device_id).replace(/[<>]/g,"")}</td><td>${Object.values(event.sensors).filter(Boolean).length} active</td><td>${time(event.received_at)}</td></tr>`
    ).join("") : '<tr><td colspan="4" class="empty">No events received yet.</td></tr>';
  } catch (error) {
    $("connection").textContent = "API OFFLINE";
    $("device-state").textContent = "NO DATA";
    $("mode").textContent = "Unable to load telemetry";
  }
}
function tick() { $("clock").textContent = new Date().toLocaleTimeString(); }
$("refresh").addEventListener("click", refresh);
tick(); refresh(); setInterval(tick, 1000); setInterval(refresh, 5000);
