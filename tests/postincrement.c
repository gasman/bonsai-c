int main(void)
{
    int i = 41;

    if (i++ > 41) {
        return 99;
    } else {
        return i;
    }
}
