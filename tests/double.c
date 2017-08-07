int main(void)
{
    double lower = 99.4, higher = 99.5;
    if (higher > lower ? lower < higher : 0) {
        return 42;
    } else {
        return 0;
    }
}
