int main(void)
{
    int i = 10, n = 0;
    int j = 10;

    while (i) {
        int j = 1;

        n = n + i;
        i = i - j;
    }

    n = n + j;

    return n;
}
