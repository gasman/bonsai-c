int foo() {
    return 99;
}

int main(void)
{
    int i;

    0 || foo();

    i = 0 || 99;
    if (i != 1) return 0;

    if (0 || 99) i = 2;
    if (i != 2) return 0;

    i = 0 || (2 < 3);
    if (i != 1) return 0;

    1 && foo();

    i = 1 && 99;
    if (i != 1) return 0;

    if (1 && 99) i = 2;
    if (i != 2) return 0;

    i = 1 && (2 < 3);
    if (i != 1) return 0;

    return 42;
}
