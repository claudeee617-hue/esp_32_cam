/*
 * ESP32 main controller — configurable starter.
 * Replace pin assignments and active levels after confirming your exact board/sensors.
 * Outputs are deliberately not actuated by this starter.
 */
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "REPLACE_WIFI_SSID";
const char* WIFI_PASSWORD = "REPLACE_WIFI_PASSWORD";
const char* API_BASE_URL = "https://YOUR-WORKER.workers.dev";
const char* DEVICE_TOKEN = "REPLACE_WITH_DEVICE_TOKEN";
const char* DEVICE_ID = "esp32-main-01";

constexpr uint8_t SENSOR_PINS[3] = {32, 33, 25}; // VERIFY for your board
constexpr uint8_t OUTPUT_PINS[3] = {26, 27, 14}; // NOT ACTIVATED in this template
constexpr bool SENSOR_ACTIVE_HIGH = true;
constexpr unsigned long REPORT_INTERVAL_MS = 10000;

unsigned long lastReport = 0;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(300);
  }
}

void setup() {
  Serial.begin(115200);
  for (uint8_t pin : SENSOR_PINS) pinMode(pin, INPUT);
  // Configure outputs to a known safe state only after selecting a verified driver/polarity.
  for (uint8_t pin : OUTPUT_PINS) pinMode(pin, INPUT);
  connectWiFi();
}

bool sensorActive(uint8_t pin) {
  const int value = digitalRead(pin);
  return SENSOR_ACTIVE_HIGH ? value == HIGH : value == LOW;
}

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  bool sensor[3];
  for (int i = 0; i < 3; i++) sensor[i] = sensorActive(SENSOR_PINS[i]);

  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"event\":\"heartbeat\",";
  body += "\"sensors\":{";
  for (int i = 0; i < 3; i++) {
    if (i) body += ",";
    body += "\"sensor" + String(i + 1) + "\":" + (sensor[i] ? "true" : "false");
  }
  body += "},\"outputs\":{\"output1\":false,\"output2\":false,\"output3\":false}}";

  HTTPClient http;
  const String url = String(API_BASE_URL) + "/api/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.setTimeout(5000);
  const int status = http.POST(body);
  Serial.printf("Telemetry HTTP status: %d\n", status);
  http.end();
}

void loop() {
  if (millis() - lastReport >= REPORT_INTERVAL_MS) {
    lastReport = millis();
    sendTelemetry();
  }
  delay(20);
}
