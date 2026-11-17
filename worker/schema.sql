CREATE TABLE IF NOT EXISTS telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT 'heartbeat',
  sensors_json TEXT NOT NULL,
  outputs_json TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_received
  ON telemetry(device_id, received_at DESC);
