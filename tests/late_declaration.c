int foo(void) {
    return 0;
}

int main(void)
{
    int i;
    int m = 40;
    for (int m = foo(), x = 42, y = foo(); m < 3; m++) { i = m; int m = 10; i += m; }

    int j;
    j = m + i;

    return j;
}
