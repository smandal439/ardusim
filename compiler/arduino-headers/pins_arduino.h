#ifndef Pins_Arduino_h
#define Pins_Arduino_h

#include <stdint.h>

#define NUM_DIGITAL_PINS 20
#define NUM_ANALOG_INPUTS 6

#define analogInputToDigitalPin(p) ((p < 6) ? (p) + 14 : -1)
#define digitalPinHasPWM(p) ((p) == 3 || (p) == 5 || (p) == 6 || (p) == 9 || (p) == 10 || (p) == 11)

#define SS   10
#define MOSI 11
#define MISO 12
#define SCK  13

#define SDA 18
#define SCL 19
#define LED_BUILTIN 13

#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19

static const uint8_t SS   = 10;
static const uint8_t MOSI = 11;
static const uint8_t MISO = 12;
static const uint8_t SCK  = 13;
static const uint8_t SDA  = 18;
static const uint8_t SCL  = 19;
static const uint8_t LED_BUILTIN = 13;

static const uint8_t A0 = 14;
static const uint8_t A1 = 15;
static const uint8_t A2 = 16;
static const uint8_t A3 = 17;
static const uint8_t A4 = 18;
static const uint8_t A5 = 19;

#define digitalPinToPCICR(p)    (((p) >= 0 && (p) <= 21) ? (&PCICR) : ((uint8_t *)0))
#define digitalPinToPCICRbit(p) (((p) <= 7) ? 2 : (((p) <= 13) ? 0 : 1))
#define digitalPinToPCMSK(p)    (((p) <= 7) ? (&PCMSK2) : (((p) <= 13) ? (&PCMSK0) : (&PCMSK1)))
#define digitalPinToPCMSKbit(p) (((p) <= 7) ? (p) : (((p) <= 13) ? ((p) - 8) : ((p) - 14)))

#define digitalPinToInterrupt(p) ((p) == 2 ? 0 : ((p) == 3 ? 1 : NOT_A_INTERRUPT))

#define PA 1
#define PB 2
#define PC 3
#define PD 4
#define PE 5
#define PF 6

#define PIN_PF0 0
#define PIN_PF1 1
#define PIN_PF4 4
#define PIN_PF5 5
#define PIN_PF6 6
#define PIN_PF7 7

#define PIN_PD0 0
#define PIN_PD1 1
#define PIN_PD2 2
#define PIN_PD3 3
#define PIN_PD4 4
#define PIN_PD5 5
#define PIN_PD6 6
#define PIN_PD7 7

#define PIN_PB0 8
#define PIN_PB1 9
#define PIN_PB2 10
#define PIN_PB3 11
#define PIN_PB4 12
#define PIN_PB5 13

#define PIN_PC0 14
#define PIN_PC1 15
#define PIN_PC2 16
#define PIN_PC3 17
#define PIN_PC4 18
#define PIN_PC5 19

#endif
