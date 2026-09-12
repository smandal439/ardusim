#ifndef Adafruit_ILI9341_h
#define Adafruit_ILI9341_h

#include <Adafruit_GFX.h>

#define ILI9341_BLACK   0x0000
#define ILI9341_WHITE   0xFFFF
#define ILI9341_RED     0xF800
#define ILI9341_GREEN   0x07E0
#define ILI9341_BLUE    0x001F
#define ILI9341_CYAN    0x07FF
#define ILI9341_MAGENTA 0xF81F
#define ILI9341_YELLOW  0xFFE0
#define ILI9341_ORANGE  0xFD20

class Adafruit_ILI9341 : public Adafruit_GFX {
public:
  Adafruit_ILI9341(uint8_t cs, uint8_t dc, int8_t rst = -1) { (void)cs; (void)dc; (void)rst; }
  Adafruit_ILI9341(uint8_t cs, uint8_t dc, uint8_t mosi, uint8_t sclk, uint8_t rst = -1) { (void)cs; (void)dc; (void)mosi; (void)sclk; (void)rst; }

  void begin(void) {}
  void setRotation(uint8_t r) { (void)r; }
  void fillScreen(uint16_t color) { (void)color; }
  void drawPixel(int16_t x, int16_t y, uint16_t color) override { (void)x; (void)y; (void)color; }
  void drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color) override { (void)x0; (void)y0; (void)x1; (void)y1; (void)color; }
  void drawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) override { (void)x; (void)y; (void)w; (void)h; (void)color; }
  void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) override { (void)x; (void)y; (void)w; (void)h; (void)color; }
  void drawCircle(int16_t x0, int16_t y0, int16_t r, uint16_t color) override { (void)x0; (void)y0; (void)r; (void)color; }
  void fillCircle(int16_t x0, int16_t y0, int16_t r, uint16_t color) override { (void)x0; (void)y0; (void)r; (void)color; }
  void drawTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) override { (void)x0; (void)y0; (void)x1; (void)y1; (void)x2; (void)y2; (void)color; }
  void fillTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) override { (void)x0; (void)y0; (void)x1; (void)y1; (void)x2; (void)y2; (void)color; }
  void setCursor(int16_t x, int16_t y) override { (void)x; (void)y; }
  void setTextColor(uint16_t color) override { (void)color; }
  void setTextColor(uint16_t color, uint16_t bg) override { (void)color; (void)bg; }
  void setTextSize(uint8_t size) override { (void)size; }
  void setTextWrap(bool w) override { (void)w; }
  int16_t width(void) override { return 240; }
  int16_t height(void) override { return 320; }
  void drawChar(int16_t x, int16_t y, unsigned char c, uint16_t color, uint16_t bg, uint8_t size) override { (void)x; (void)y; (void)c; (void)color; (void)bg; (void)size; }
  void drawBitmap(int16_t x, int16_t y, const uint8_t bitmap[], int16_t w, int16_t h, uint16_t color) override { (void)x; (void)y; (void)bitmap; (void)w; (void)h; (void)color; }
  void invertDisplay(bool i) { (void)i; }
};

#endif
