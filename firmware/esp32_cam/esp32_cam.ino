/*
 * ESP32-CAM connectivity starter.
 * Choose the correct camera module and pin map for your exact board before enabling capture.
 * This template intentionally does not expose an unauthenticated public camera stream.
 */
#include <WiFi.h>
#include <WebServer.h>

const char* WIFI_SSID = "REPLACE_WIFI_SSID";
const char* WIFI_PASSWORD = "REPLACE_WIFI_PASSWORD";
WebServer server(80);

void handleHealth() {
  server.send(200, "application/json", "{\"ok\":true,\"device\":\"esp32-cam\",\"camera\":\"not_initialized\"}");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(300);
  }
  server.on("/health", HTTP_GET, handleHealth);
  server.begin();
  Serial.print("LAN health endpoint: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/health");
}

void loop() {
  server.handleClient();
  delay(2);
}
