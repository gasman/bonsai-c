int main(void)
{
    double a = 42.9;
    double b = 0.9;
    double result = a - b;
    if (result > 41.9 && result < 42.1) {
        return 42;
    } else {
        return 0;
    }
}
