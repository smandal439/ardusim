#ifndef LiquidCrystal_h
#define LiquidCrystal_h

#include <Arduino.h>

class LiquidCrystal {
public:
  LiquidCrystal(uint8_t rs, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3) { (void)rs; (void)enable; (void)d0; (void)d1; (void)d2; (void)d3; }
  LiquidCrystal(uint8_t rs, uint8_t rw, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3) { (void)rs; (void)rw; (void)enable; (void)d0; (void)d1; (void)d2; (void)d3; }
  LiquidCrystal(uint8_t rs, uint8_t rw, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3, uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7) { (void)rs; (void)rw; (void)enable; (void)d0; (void)d1; (void)d2; (void)d3; (void)d4; (void)d5; (void)d6; (void)d7; }
  LiquidCrystal(uint8_t rs, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3, uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7) { (void)rs; (void)enable; (void)d0; (void)d1; (void)d2; (void)d3; (void)d4; (void)d5; (void)d6; (void)d7; }

  void init() {}
  void begin(uint8_t cols, uint8_t rows) { (void)cols; (void)rows; }
  void clear() {}
  void home() {}
  void noDisplay() {}
  void display() {}
  void noBlink() {}
  void blink() {}
  void noCursor() {}
  void cursor() {}
  void scrollDisplayLeft() {}
  void scrollDisplayRight() {}
  void leftToRight() {}
  void rightToLeft() {}
  void autoscroll() {}
  void noAutoscroll() {}
  void setRow(uint8_t row) { (void)row; }
  void setCol(uint8_t col) { (void)col; }
  void setCursor(uint8_t col, uint8_t row) { (void)col; (void)row; }
  size_t write(uint8_t value) { (void)value; return 1; }
  size_t write(const char *str) { (void)str; return 0; }
  size_t write(const uint8_t *buffer, size_t size) { (void)buffer; (void)size; return size; }
  void command(uint8_t value) { (void)value; }

  operator bool() { return true; }
};

#endif
