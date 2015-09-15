double foo(void) {
    return 42.0;
}

double bar(double i) {
    return i;
}

int main(void)
{
    double i, k;
    double j = 42.0;

    i = foo();
    k = bar(j);

    return 42;
}
