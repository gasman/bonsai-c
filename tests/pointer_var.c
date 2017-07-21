int arr[1];

int main(void) {
    *arr = 42;
    int *ptr = arr;
    return *ptr;
}
