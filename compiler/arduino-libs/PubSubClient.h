#ifndef PubSubClient_h
#define PubSubClient_h

#include <Arduino.h>
#include <WiFi.h>

#define MQTT_MAX_PACKET_SIZE 256
#define MQTT_KEEPALIVE 15

class PubSubClient {
public:
  PubSubClient() {}
  PubSubClient(WiFiClient &client) { (void)client; }
  PubSubClient(const char *domain, uint16_t port, WiFiClient &client) { (void)domain; (void)port; (void)client; }
  PubSubClient(IPAddress ip, uint16_t port, WiFiClient &client) { (void)ip; (void)port; (void)client; }

  void setServer(const char *domain, uint16_t port) { (void)domain; (void)port; }
  void setServer(IPAddress ip, uint16_t port) { (void)ip; (void)port; }
  void setCallback(void (*callback)(char*, uint8_t*, unsigned int)) { (void)callback; }
  void setClient(WiFiClient &client) { (void)client; }
  void setBufferSize(uint16_t size) { (void)size; }
  bool connect(const char *id) { (void)id; return true; }
  bool connect(const char *id, const char *user, const char *pass) { (void)id; (void)user; (void)pass; return true; }
  bool connect(const char *id, const char *willTopic, uint8_t willQos, boolean willRetain, const char *willMessage) { (void)id; (void)willTopic; (void)willQos; (void)willRetain; (void)willMessage; return true; }
  bool connected() { return true; }
  bool disconnect() { return true; }
  bool publish(const char *topic, const char *payload) { (void)topic; (void)payload; return true; }
  bool publish(const char *topic, const uint8_t *payload, unsigned int length) { (void)topic; (void)payload; (void)length; return true; }
  bool publish(const char *topic, const char *payload, boolean retained) { (void)topic; (void)payload; (void)retained; return true; }
  bool subscribe(const char *topic) { (void)topic; return true; }
  bool subscribe(const char *topic, uint8_t qos) { (void)topic; (void)qos; return true; }
  bool unsubscribe(const char *topic) { (void)topic; return true; }
  void loop() {}
  boolean state() { return true; }
};

#endif
