#ifndef Adafruit_SSD1306_h
#define Adafruit_SSD1306_h

#include <Adafruit_GFX.h>
#include <Wire.h>

#define SSD1306_SWITCHCAPVCC 0x01
#define SSD1306_EXTERNALVCC  0x02
#define SSD1306_WHITE 1
#define SSD1306_BLACK 0

#define SSD1306_I2C_ADDRESS 0x3C

class Adafruit_SSD1306 : public Adafruit_GFX {
public:
  Adafruit_SSD1306(uint8_t width, uint8_t height, TwoWire *wire = &Wire, int8_t rst = -1, uint32_t clock = 400000) { (void)width; (void)height; (void)wire; (void)rst; (void)clock; }

  bool begin(uint8_t switchvcc = SSD1306_SWITCHCAPVCC, uint8_t i2caddr = SSD1306_I2C_ADDRESS, bool reset = true) { (void)switchvcc; (void)i2caddr; (void)reset; return true; }
  void display(void) {}
  void clearDisplay(void) {}
  void invertDisplay(bool i) { (void)i; }
  void dim(bool dim) { (void)dim; }
  void drawPixel(int16_t x, int16_t y, uint16_t color) override { (void)x; (void)y; (void)color; }
  void drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color) override { (void)x0; (void)y0; (void)x1; (void)y1; (void)color; }
  void drawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) override { (void)x; (void)y; (void)w; (void)h; (void)color; }
  void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) override { (void)x; (void)y; (void)w; (void)h; (void)color; }
  void drawCircle(int16_t x0, int16_t y0, int16_t r, uint16_t color) override { (void)x0; (void)y0; (void)r; (void)color; }
  void fillCircle(int16_t x0, int16_t y0, int16_t r, uint16_t color) override { (void)x0; (void)y0; (void)r; (void)color; }
  void drawRoundRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t r, uint16_t color) override { (void)x; (void)y; (void)w; (void)h; (void)r; (void)color; }
  void fillRoundRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t r, uint16_t color) override { (void)x; (void)y; (void)w; (void)h; (void)r; (void)color; }
  void drawTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) override { (void)x0; (void)y0; (void)x1; (void)y1; (void)x2; (void)y2; (void)color; }
  void fillTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) override { (void)x0; (void)y0; (void)x1; (void)y1; (void)x2; (void)y2; (void)color; }
  void drawBitmap(int16_t x, int16_t y, const uint8_t bitmap[], int16_t w, int16_t h, uint16_t color) override { (void)x; (void)y; (void)bitmap; (void)w; (void)h; (void)color; }
  void setCursor(int16_t x, int16_t y) override { (void)x; (void)y; }
  void setTextColor(uint16_t color) override { (void)color; }
  void setTextColor(uint16_t color, uint16_t bg) override { (void)color; (void)bg; }
  void setTextSize(uint8_t size) override { (void)size; }
  void setTextWrap(bool w) override { (void)w; }
  void cp437(bool enable = true) override { (void)enable; }
  void setRotation(uint8_t r) override { (void)r; }
  uint8_t getRotation(void) override { return 0; }
  int16_t width(void) override { return 128; }
  int16_t height(void) override { return 64; }
  void drawChar(int16_t x, int16_t y, unsigned char c, uint16_t color, uint16_t bg, uint8_t size) override { (void)x; (void)y; (void)c; (void)color; (void)bg; (void)size; }

  void setContrast(uint8_t contrast) { (void)contrast; }
};

#endif
