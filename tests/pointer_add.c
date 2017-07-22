int arr[4];

int main(void) {
    *(arr + 1) = 42;
    *arr = 0;
    return *(1 + arr);
}
