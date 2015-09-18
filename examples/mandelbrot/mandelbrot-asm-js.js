function Module() {
    'use asm';
    function calc(c, d) {
        c = +c;
        d = +d;
        var MAX_ITERATIONS = 32, iterations = 0, a = 0.0, b = 0.0, aNew = 0.0;
        while (a * a + b * b < 4.0 ? (iterations | 0) < (MAX_ITERATIONS | 0) : 0) {
            aNew = a * a - b * b + c;
            b = 2.0 * a * b + d;
            a = aNew;
            iterations = (iterations | 0) + 1 | 0;
        }
        return iterations | 0;
    }
    return { calc: calc };
}
