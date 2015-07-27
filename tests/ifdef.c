#define FOO 3

int main(void) {
  #ifdef FOO
  return FOO;
  #else
  return 4;
  #endif
}