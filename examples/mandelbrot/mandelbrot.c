int calc(double c, double d) {
	int MAX_ITERATIONS = 32;
	int iterations = 0;

	double a = 0.0, b = 0.0;
	while (a*a + b*b < 4.0 && iterations < MAX_ITERATIONS) {
		double aNew = a*a - b*b + c;
		b = 2.0*a*b + d;
		a = aNew;
		iterations++;
	}

	return iterations;
}
