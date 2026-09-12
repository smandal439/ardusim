#ifndef WiFi_h
#define WiFi_h

#include <Arduino.h>

#define WIFI_MODE_STA 1
#define WIFI_MODE_AP  2
#define WIFI_MODE_AP_STA 3

#define WL_IDLE_STATUS      0
#define WL_NO_SSID_AVAIL    1
#define WL_SCAN_COMPLETED   2
#define WL_CONNECTED        3
#define WL_CONNECT_FAILED   4
#define WL_CONNECTION_LOST  5
#define WL_DISCONNECTED     6

#define WIFI_SUCCESS 0
#define WL_PING_DEST_UNREACHABLE -1

class WiFiClass {
public:
  void mode(uint8_t mode) { (void)mode; }
  void begin(const char* ssid) { (void)ssid; }
  void begin(const char* ssid, const char *passphrase) { (void)ssid; (void)passphrase; }
  void disconnect(bool wifioff = false) { (void)wifioff; }
  uint8_t status() { return WL_IDLE_STATUS; }
  const char* localIP() { return "192.168.1.100"; }
  const char* softAPIP() { return "192.168.4.1"; }
  void setAutoReconnect(bool autoReconnect) { (void)autoReconnect; }
  void reconnect() {}
  void softAP(const char* ssid) { (void)ssid; }
  void softAP(const char* ssid, const char* password) { (void)ssid; (void)password; }
  void softAPdisconnect(bool wifioff = false) { (void)wifioff; }
  String macAddress() { return "AA:BB:CC:DD:EE:FF"; }

  bool ping(const char* host) { (void)host; return true; }
  bool ping(const char* host, uint8_t ttl) { (void)host; (void)ttl; return true; }
};

extern WiFiClass WiFi;

class WiFiClient {
public:
  WiFiClient() {}
  WiFiClient(const char* host, uint16_t port) { (void)host; (void)port; }
  virtual ~WiFiClient() {}
  virtual int connect(const char* host, uint16_t port) { (void)host; (void)port; return 1; }
  virtual int connect(IPAddress ip, uint16_t port) { (void)ip; (void)port; return 1; }
  virtual void stop() {}
  virtual uint8_t connected() { return 1; }
  virtual uint8_t available() { return 0; }
  virtual int read() { return -1; }
  virtual size_t write(const uint8_t *buf, size_t size) { (void)buf; (void)size; return size; }
  virtual size_t write(uint8_t b) { (void)b; return 1; }
  virtual int peek() { return -1; }
  virtual void flush() {}
  virtual operator bool() { return true; }
};

class WiFiServer {
public:
  WiFiServer(uint16_t port = 80) { (void)port; }
  void begin() {}
  void begin(uint16_t port) { (void)port; }
  WiFiClient available() { return WiFiClient(); }
  virtual operator bool() { return true; }
};

#endif
