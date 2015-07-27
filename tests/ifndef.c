int main(void) {
  #ifndef FOO
  return 56;
  #else
  return FOO;
  #endif
}