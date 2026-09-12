#ifndef Adafruit_GFX_h
#define Adafruit_GFX_h

#include <Arduino.h>
#include <WString.h>

#define BLACK 0
#define WHITE 1

#define TFT_BLACK   0x0000
#define TFT_WHITE   0xFFFF
#define TFT_RED     0xF800
#define TFT_GREEN   0x07E0
#define TFT_BLUE    0x001F
#define TFT_CYAN    0x07FF
#define TFT_MAGENTA 0xF81F
#define TFT_YELLOW  0xFFE0
#define TFT_ORANGE  0xFD20

class Adafruit_GFX {
public:
  Adafruit_GFX() {}
  virtual ~Adafruit_GFX() {}

  virtual void drawPixel(int16_t x, int16_t y, uint16_t color) = 0;
  virtual void drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color) { (void)x0; (void)y0; (void)x1; (void)y1; (void)color; }
  virtual void drawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) { (void)x; (void)y; (void)w; (void)h; (void)color; }
  virtual void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) { (void)x; (void)y; (void)w; (void)h; (void)color; }
  virtual void drawCircle(int16_t x0, int16_t y0, int16_t r, uint16_t color) { (void)x0; (void)y0; (void)r; (void)color; }
  virtual void fillCircle(int16_t x0, int16_t y0, int16_t r, uint16_t color) { (void)x0; (void)y0; (void)r; (void)color; }
  virtual void drawTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) { (void)x0; (void)y0; (void)x1; (void)y1; (void)x2; (void)y2; (void)color; }
  virtual void fillTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) { (void)x0; (void)y0; (void)x1; (void)y1; (void)x2; (void)y2; (void)color; }
  virtual void drawRoundRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t r, uint16_t color) { (void)x; (void)y; (void)w; (void)h; (void)r; (void)color; }
  virtual void fillRoundRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t r, uint16_t color) { (void)x; (void)y; (void)w; (void)h; (void)r; (void)color; }
  virtual void drawBitmap(int16_t x, int16_t y, const uint8_t bitmap[], int16_t w, int16_t h, uint16_t color) { (void)x; (void)y; (void)bitmap; (void)w; (void)h; (void)color; }
  virtual void setCursor(int16_t x, int16_t y) { (void)x; (void)y; }
  virtual void setTextColor(uint16_t color) { (void)color; }
  virtual void setTextColor(uint16_t color, uint16_t bg) { (void)color; (void)bg; }
  virtual void setTextSize(uint8_t size) { (void)size; }
  virtual void setTextWrap(bool w) { (void)w; }
  virtual void cp437(bool enable = true) { (void)enable; }
  virtual void setRotation(uint8_t r) { (void)r; }
  virtual uint8_t getRotation(void) { return 0; }
  virtual int16_t width(void) { return 0; }
  virtual int16_t height(void) { return 0; }
  virtual void drawChar(int16_t x, int16_t y, unsigned char c, uint16_t color, uint16_t bg, uint8_t size) { (void)x; (void)y; (void)c; (void)color; (void)bg; (void)size; }

  size_t write(uint8_t c) { (void)c; return 1; }
  size_t write(const char *str) { (void)str; return 0; }
  void print(const char *s) { (void)s; }
  void print(int n, int base = 10) { (void)n; (void)base; }
  void print(float n, int digits = 2) { (void)n; (void)digits; }
  void println(void) {}
  void println(const char *s) { (void)s; }
  void println(int n, int base = 10) { (void)n; (void)base; }
  void println(float n, int digits = 2) { (void)n; (void)digits; }
};

#endif
