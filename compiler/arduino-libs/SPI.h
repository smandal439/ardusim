#ifndef SPI_h
#define SPI_h

#include <stdint.h>
#include <Arduino.h>

#define SPI_CLOCK_DIV2   2
#define SPI_CLOCK_DIV4   4
#define SPI_CLOCK_DIV8   8
#define SPI_CLOCK_DIV16  16
#define SPI_CLOCK_DIV32  32
#define SPI_CLOCK_DIV64  64
#define SPI_CLOCK_DIV128 128

#define SPI_MODE0 0x00
#define SPI_MODE1 0x04
#define SPI_MODE2 0x08
#define SPI_MODE3 0x0C

#define LSBFIRST 0
#define MSBFIRST 1

class SPISettings {
public:
  SPISettings(uint32_t clock, uint8_t bitOrder, uint8_t dataMode) { (void)clock; (void)bitOrder; (void)dataMode; }
  SPISettings() {}
};

class SPIClass {
public:
  void begin() {}
  void end() {}
  void beginTransaction(SPISettings settings) { (void)settings; }
  void endTransaction(void) {}
  uint8_t transfer(uint8_t data) { (void)data; return 0; }
  uint16_t transfer16(uint16_t data) { (void)data; return 0; }
  void transfer(void *buf, size_t count) { (void)buf; (void)count; }
  void setBitOrder(uint8_t bitOrder) { (void)bitOrder; }
  void setDataMode(uint8_t dataMode) { (void)dataMode; }
  void setClockDivider(uint8_t clockDiv) { (void)clockDiv; }
};

extern SPIClass SPI;

#endif
