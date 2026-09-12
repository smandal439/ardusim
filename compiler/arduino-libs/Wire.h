#ifndef Wire_h
#define Wire_h

#include <stdint.h>
#include <Arduino.h>

#define WIRE_INTERFACES_COUNT 1

class TwoWire {
public:
  void begin() {}
  void begin(int sda, int scl) { (void)sda; (void)scl; }
  void setClock(uint32_t clock) { (void)clock; }
  void setSDA(uint8_t pin) { (void)pin; }
  void setSCL(uint8_t pin) { (void)pin; }
  void beginTransmission(uint8_t address) { (void)address; }
  uint8_t endTransmission(bool stop = true) { (void)stop; return 0; }
  uint8_t requestFrom(uint8_t address, uint8_t quantity, bool sendStop = true) { (void)address; (void)quantity; (void)sendStop; return 0; }
  size_t write(uint8_t data) { (void)data; return 1; }
  size_t write(const uint8_t *data, size_t quantity) { (void)data; (void)quantity; return quantity; }
  int available(void) { return 0; }
  int read(void) { return -1; }
  int peek(void) { return -1; }
  void flush(void) {}

  void onReceive(void(*)(int)) {}
  void onRequest(void(*)(void)) {}

  operator bool() { return true; }
};

extern TwoWire Wire;

#endif
