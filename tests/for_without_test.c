int main(void)
{
    int i, n = 0;

    for (i = 0; ; i += 1) {
        if (i >= 10) break;
        n = n + i;
    }

    return n;
}
