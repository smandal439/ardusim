#ifndef WString_h
#define WString_h

#include <stdlib.h>
#include <string.h>
#include <math.h>

class String {
public:
  String(const char *cstr = "") { if (cstr) _buffer = strdup(cstr); }
  String(const String &other) { if (other._buffer) _buffer = strdup(other._buffer); }
  ~String() { free(_buffer); _buffer = nullptr; }

  String & operator = (const String &rhs) { if (this != &rhs) { free(_buffer); _buffer = rhs._buffer ? strdup(rhs._buffer) : nullptr; } return *this; }
  String & operator = (const char *cstr) { free(_buffer); _buffer = cstr ? strdup(cstr) : nullptr; return *this; }

  unsigned long length() const { return _buffer ? strlen(_buffer) : 0; }
  const char * c_str() const { return _buffer ? _buffer : ""; }

  char charAt(unsigned int index) const { return _buffer ? _buffer[index] : 0; }
  void getBytes(unsigned char *buf, unsigned int bufsize) const { if (_buffer) strncpy((char*)buf, _buffer, bufsize); }

  int indexOf(char ch) const { return _buffer ? (int)strchr(_buffer, ch) - (int)_buffer : -1; }
  int indexOf(char ch, unsigned int fromIndex) const { return _buffer ? (int)strchr(_buffer + fromIndex, ch) - (int)_buffer : -1; }
  int indexOf(const String &str) const { return _buffer ? (int)strstr(_buffer, str._buffer) - (int)_buffer : -1; }

  String substring(unsigned int fromIndex) const { return _buffer ? String(_buffer + fromIndex) : String(); }
  String substring(unsigned int fromIndex, unsigned int toIndex) const { return _buffer ? String(_buffer + fromIndex, toIndex - fromIndex) : String(); }

  char charAt(unsigned int index);

  bool startsWith(const String &str) const { return _buffer && str._buffer ? strncmp(_buffer, str._buffer, str.length()) == 0 : false; }
  bool endsWith(const String &str) const;

  String trim() const;
  String toLowerCase() const;
  String toUpperCase() const;

  int compareTo(const String &s) const { return _buffer && s._buffer ? strcmp(_buffer, s._buffer) : (_buffer ? 1 : -1); }
  bool equals(const String &s) const { return compareTo(s) == 0; }
  bool equals(const char *cstr) const { return _buffer ? strcmp(_buffer, cstr) == 0 : (cstr[0] == '\0'); }
  bool operator == (const String &s) const { return equals(s); }
  bool operator == (const char *cstr) const { return equals(cstr); }

  operator bool() const { return _buffer && _buffer[0] != '\0'; }

private:
  char *_buffer = nullptr;
  String(const char *cstr, unsigned int length) { if (cstr) { _buffer = (char*)malloc(length + 1); if (_buffer) { strncpy(_buffer, cstr, length); _buffer[length] = '\0'; } } }
};

#endif
