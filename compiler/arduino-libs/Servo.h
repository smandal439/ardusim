#ifndef Servo_h
#define Servo_h

#include <Arduino.h>

#define Servo_MIN 544
#define Servo_MAX 2400
#define MIN_ANGLE 0
#define MAX_ANGLE 180

class Servo {
public:
  uint8_t attach(int pin) { (void)pin; return 1; }
  uint8_t attach(int pin, int min, int max) { (void)pin; (void)min; (void)max; return 1; }
  void detach() {}
  void write(int value) { (void)value; }
  void writeMicroseconds(int value) { (void)value; }
  int read() { return 0; }
  int readMicroseconds() { return 0; }
  bool attached() { return false; }
};

#endif
