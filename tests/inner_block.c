int main(void)
{
    int i = 41;

    {
        int j = 1;
        i = i + j;
    }

    return i;
}
