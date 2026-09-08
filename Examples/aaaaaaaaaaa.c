/*
 * ILI9341 TFT Display — Weather & Altimeter
 *
 * Wiring (Arduino Uno to ILI9341):
 *   5V  to VCC
 *   GND to GND
 *   D10 to CS
 *   D9  to DC
 *   D11 to MOSI
 *   D13 to SCK
 *
 * SimpleBME280:
 *   VCC -> 5V
 *   GND -> GND
 *   SCL -> A5
 *   SDA -> A4
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <SimpleBME280.h>

#define SEALEVELPRESSURE_HPA (1013.25)
#define TFT_CS 10
#define TFT_DC 9

Adafruit_ILI9341 tft(TFT_CS, TFT_DC);
SimpleBME280 bme;

void setup()
{
    Serial.begin(9600);
    Wire.begin();
    bme.begin();
    tft.begin();
    tft.setRotation(1); // Landscape mode (320x240)

    Serial.println("SimpleBME280 Altimeter");
    Serial.println("----------------------");

    // Background
    tft.fillScreen(ILI9341_NAVY);

    // Decorative border
    tft.drawRect(5, 5, 310, 230, ILI9341_CYAN);
    tft.drawRect(8, 8, 304, 224, ILI9341_DARKCYAN);

    // Title Block
    tft.setTextColor(ILI9341_YELLOW);
    tft.setTextSize(2);
    tft.setCursor(20, 18);
    tft.println("ArduSim TFT");

    tft.setTextColor(ILI9341_WHITE);
    tft.setTextSize(1);
    tft.setCursor(20, 40);
    tft.println("ILI9341 240x320 Color Display");

    // Horizontal divider line below header
    tft.drawFastHLine(15, 55, 290, ILI9341_DARKCYAN);
}

void loop()
{
    float tempC = bme.readTemperature();
    float presPa = bme.readPressure();
    float altM = bme.readAltitude(SEALEVELPRESSURE_HPA);

    // Serial output
    Serial.print("Temp:     "); Serial.print(tempC, 1); Serial.println(" C");
    Serial.print("Pressure: "); Serial.print(presPa / 100.0, 1); Serial.println(" hPa");
    Serial.print("Altitude: "); Serial.print(altM, 1); Serial.println(" m");
    Serial.println("----------------------");

    // Clear previous sensor values area without wiping the frame/header
    tft.fillRect(15, 65, 290, 150, ILI9341_NAVY);

    tft.setTextSize(2);

    // Row 1: Temperature
    tft.setTextColor(ILI9341_CYAN);
    tft.setCursor(20, 75);
    tft.print("Temp:");
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(140, 75);
    tft.print(tempC, 1);
    tft.print(" C");

    // Row 2: Pressure
    tft.setTextColor(ILI9341_YELLOW);
    tft.setCursor(20, 120);
    tft.print("Pressure:");
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(140, 120);
    tft.print(presPa / 100.0, 1);
    tft.print(" hPa");

    // Row 3: Altitude
    tft.setTextColor(ILI9341_GREEN);
    tft.setCursor(20, 165);
    tft.print("Altitude:");
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(140, 165);
    tft.print(altM, 1);
    tft.print(" m");

    delay(2000);
}