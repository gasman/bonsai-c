int subtotal(void) {
    double i = 7.0;
    return i + i;
}

int main(void)
{
    double i = 7.0;
    int j;
    j = i + i;

    int k = i + i;

    return j + k + subtotal();
}
