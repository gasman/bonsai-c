int main(void)
{
    int i = 43;

    if (i-- < 43) {
        return 99;
    } else {
        return i;
    }
}
