void foo(void)
{
    return;
}
int main(void)
{
    int i;
    return i = 40, foo(), i+2;
}
