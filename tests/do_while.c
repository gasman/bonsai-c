int main(void)
{
    int i = 0, n = 0;

    do {
        i = 10;
    } while (n < 0);

    do {
        n += i;
        i = i - 1;
    } while (i > 0);

    return n;
}
