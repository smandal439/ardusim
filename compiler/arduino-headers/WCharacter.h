#ifndef WCharacter_h
#define WCharacter_h

#include <ctype.h>

inline boolean isAlphaNumeric(int c) __attribute__((const));
inline boolean isAlpha(int c) __attribute__((const));
inline boolean isWhitespace(int c) __attribute__((const));
inline boolean isDigit(int c) __attribute__((const));
inline boolean isHexadecimalDigit(int c) __attribute__((const));
inline boolean isControl(int c) __attribute__((const));
inline boolean isGraph(int c) __attribute__((const));
inline boolean isLowerCase(int c) __attribute__((const));
inline boolean isPrintable(int c) __attribute__((const));
inline boolean isPunct(int c) __attribute__((const));
inline boolean isUpperCase(int c) __attribute__((const));
inline boolean isSpace(int c) __attribute__((const));

inline boolean isAlphaNumeric(int c) { return (isalnum(c) == 0 ? false : true); }
inline boolean isAlpha(int c) { return (isalpha(c) == 0 ? false : true); }
inline boolean isWhitespace(int c) { return (isblank(c) == 0 ? false : true); }
inline boolean isDigit(int c) { return (isdigit(c) == 0 ? false : true); }
inline boolean isHexadecimalDigit(int c) { return (isxdigit(c) == 0 ? false : true); }
inline boolean isControl(int c) { return (iscntrl(c) == 0 ? false : true); }
inline boolean isGraph(int c) { return (isgraph(c) == 0 ? false : true); }
inline boolean isLowerCase(int c) { return (islower(c) == 0 ? false : true); }
inline boolean isPrintable(int c) { return (isprint(c) == 0 ? false : true); }
inline boolean isPunct(int c) { return (ispunct(c) == 0 ? false : true); }
inline boolean isUpperCase(int c) { return (isupper(c) == 0 ? false : true); }
inline boolean isSpace(int c) { return (isspace(c) == 0 ? false : true); }

#endif
