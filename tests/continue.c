int main(void)
{
    int i, n = 0;

    for (i = 0; i < 10; i += 1) {
        if (i == 3) continue;
        n = n + i;
    }

    return n;
}
