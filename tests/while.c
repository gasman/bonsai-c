int main(void)
{
    int i = 10, n = 0;

    while (i) {
        n = n + i;
        i = i - 1;
    }

    return n;
}
