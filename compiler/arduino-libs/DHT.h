#ifndef DHT_h
#define DHT_h

#include <Arduino.h>

#define DHT11 11
#define DHT22 22
#define DHT21 21
#define AM2301 21

class DHT {
public:
  DHT(uint8_t pin, uint8_t type, uint8_t count = 6) { (void)pin; (void)type; (void)count; }
  void begin() {}
  float readTemperature(bool S = false, bool force = false) { (void)S; (void)force; return 0.0f; }
  float convertCtoF(float c) { return c * 9.0f / 5.0f + 32.0f; }
  float convertFtoC(float f) { return (f - 32.0f) * 5.0f / 9.0f; }
  float readHumidity(bool force = false) { (void)force; return 0.0f; }
  float computeHeatIndex(float temperature, float percentHumidity, bool isFahrenheit = true) { (void)temperature; (void)percentHumidity; (void)isFahrenheit; return 0.0f; }

  static const uint8_t DHT11 = 11;
  static const uint8_t DHT22 = 22;
  static const uint8_t DHT21 = 21;
  static const uint8_t AM2301 = 21;
};

#endif
