int main(void)
{
    int i = 1;
    int j;

    j = (i = 42, 99, i);

    return j;
}
