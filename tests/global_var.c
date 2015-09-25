int i = 21;
int j;

void increment_i()
{
    i++;
}
void set_j()
{
    j = 20;
}
int main(void) {
    increment_i();
    set_j();
    return i + j;
}
