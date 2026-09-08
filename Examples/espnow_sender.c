#include <esp_now.h>
#include <WiFi.h>

uint8_t receiverMAC[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x02};
esp_now_peer_info_t peerInfo;

const int sw[8] = {13, 12, 14, 27, 26, 25, 33, 32};

void onSendDone(const uint8_t *mac, esp_now_send_status_t status) {
    Serial.print("Send status: ");
    Serial.println(status == ESP_NOW_SEND_SUCCESS ? "OK" : "FAIL");
}

void setup() {
    Serial.begin(115200);
    for (int i = 0; i < 8; i++) {
        pinMode(sw[i], INPUT_PULLUP);
    }

    WiFi.mode(WIFI_STA);
    if (esp_now_init() != ESP_OK) return;
    
    esp_now_register_send_cb(onSendDone);
    memcpy(peerInfo.peer_addr, receiverMAC, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
}

void loop() {
    uint8_t sw_data = 0;
    for (int i = 0; i < 8; i++) {
        // Active-LOW logic: switch closed to GND reads LOW
        if (digitalRead(sw[i]) == LOW) {
            sw_data |= (1 << i);
        }
    }
    // esp_now_send(receiverMAC, &sw_data, sizeof(sw_data));
    esp_now_send(receiverMAC, (uint8_t *)&sw_data, sizeof(sw_data));
    delay(100); // Send updates every 100ms
}