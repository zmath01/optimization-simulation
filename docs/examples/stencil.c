#include <stddef.h>

/* Fixed boundary cells. The callee may swap its local pointers only. */
void diffuse(double *restrict first, double *restrict second, int side, int steps) {
    const size_t stride = (size_t)side;
    for (int step = 0; step < steps; ++step) {
        for (int row = 1; row < side - 1; ++row) {
            for (int col = 1; col < side - 1; ++col) {
                size_t i = (size_t)row * stride + (size_t)col;
                second[i] = (first[i - stride] + first[i + stride] +
                             first[i - 1] + first[i + 1]) * 0.25;
            }
        }
        double *swap = first;
        first = second;
        second = swap;
    }
}
