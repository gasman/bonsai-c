function Module() {
	function calc(c, d) {
		var MAX_ITERATIONS = 32;
		var iterations = 0;

		/*
		z := a + bi ; initially a = 0, b = 0
		k := c + di

		z' = z^2 + k ; bail out when |z| >= 2, i.e. a^2 + b^2 >= 4

		z' = (a + bi)(a + bi) + (c + di)
		z' = a*a + 2*a*b*i - b*b + c + di

		a' = a*a - b*b + c
		b' = 2*a*b + d
		*/

		var a = 0.0, b = 0.0;
		while (a*a + b*b < 4.0 && iterations < MAX_ITERATIONS) {
			var aNew = a*a - b*b + c;
			b = 2.0*a*b + d;
			a = aNew;
			iterations++;
		}

		return iterations;
	}

	return {calc: calc};
}
