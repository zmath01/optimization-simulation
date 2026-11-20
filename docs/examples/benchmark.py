"""Compare fixed-boundary five-point Jacobi sweeps using one CPU thread."""
import argparse
import ctypes
import platform
from pathlib import Path
from statistics import median
from time import perf_counter

import numpy as np


def python_sweeps(first, second, steps):
    for _ in range(steps):
        for row in range(1, len(first) - 1):
            for col in range(1, len(first) - 1):
                second[row, col] = (first[row - 1, col] + first[row + 1, col] +
                                    first[row, col - 1] + first[row, col + 1]) * 0.25
        first, second = second, first


def numpy_sweeps(first, second, steps):
    for _ in range(steps):
        interior = second[1:-1, 1:-1]
        np.add(first[:-2, 1:-1], first[2:, 1:-1], out=interior)
        interior += first[1:-1, :-2]
        interior += first[1:-1, 2:]
        interior *= 0.25
        first, second = second, first


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--side", type=int, default=256)
    parser.add_argument("--steps", type=int, default=50)
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--library", type=Path, default=Path(__file__).with_name("stencil.so"))
    args = parser.parse_args()
    if min(args.side - 2, args.steps, args.repeats) < 1:
        parser.error("side must be at least 3 and steps and repeats must be positive")

    native = ctypes.CDLL(str(args.library.resolve())).diffuse
    array_type = np.ctypeslib.ndpointer(dtype=np.float64, ndim=2, flags="C_CONTIGUOUS")
    native.argtypes = [array_type, array_type, ctypes.c_int, ctypes.c_int]
    native.restype = None
    initial = np.random.default_rng(4).random((args.side, args.side))
    initial[1:-1, 1:-1] = 0

    methods = [
        ("Python loops", python_sweeps),
        ("NumPy slices", numpy_sweeps),
        ("C (-O3)", lambda first, second, steps: native(first, second, args.side, steps)),
    ]
    print(f"{platform.machine()} | {platform.python_version()=} | NumPy {np.__version__}")
    print(f"{args.side}² float64 grid, {args.steps} sweeps, median of {args.repeats}")
    reference = None
    for label, sweep in methods:
        sweep(initial.copy(), initial.copy(), 1)
        durations = []
        for _ in range(args.repeats):
            first, second = initial.copy(), initial.copy()
            start = perf_counter()
            sweep(first, second, args.steps)
            durations.append(perf_counter() - start)
            result = second if args.steps % 2 else first
            if reference is None:
                reference = result.copy()
            np.testing.assert_allclose(result, reference, rtol=1e-14, atol=1e-14)
        print(f"{label:15s} {median(durations) * 1000:9.3f} ms")
    print("All results agree within 1e-14 absolute and relative tolerance.")


if __name__ == "__main__":
    main()
