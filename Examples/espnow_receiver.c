#include <esp_now.h>
#include <WiFi.h>

#define GND_PIN 15
// Correct pin mapping matching JSON wires: l1->21, l2->19, l3->18, l4->5, l5->17, l6->16, l7->4, l8->2
const int Leds[8] = {21, 19, 18, 5, 17, 16, 4, 2};

void updateLEDs(uint8_t received_data) {
    for (int i = 0; i < 8; i++) {
        int state = bitRead(received_data, i);
        digitalWrite(Leds[i], state);
    }
}

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
void onRecvData(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
#else
void onRecvData(const uint8_t *mac, const uint8_t *data, int len) {
#endif
    if (len == sizeof(uint8_t)) {
        updateLEDs(data[0]);
    }
}

void setup() {
    Serial.begin(115200);

    // Provide GND reference on D15 as per schematic wiring
    pinMode(GND_PIN, OUTPUT);
    digitalWrite(GND_PIN, LOW);

    // Configure all 8 LED control pins
    for (int i = 0; i < 8; i++) {
        pinMode(Leds[i], OUTPUT);
        digitalWrite(Leds[i], LOW);
    }

    WiFi.mode(WIFI_STA);
    if (esp_now_init() != ESP_OK) return;

    esp_now_register_recv_cb(onRecvData);
}

void loop() {
    // Callback handles incoming ESP-NOW data
}