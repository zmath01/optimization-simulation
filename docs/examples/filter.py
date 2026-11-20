"""Synthesize a passive, buffered two-pole low-pass filter for a sensor input.

Enumerates commercial nominal values and evaluates independent R/C corner cases.
The two stages are isolated by an ideal unity-gain buffer in this model.
"""
from itertools import product

import numpy as np

RESISTORS = np.array([1000, 1200, 1500, 1800, 2200, 2700, 3300, 3900, 4700])
CAPACITORS = np.array([10, 15, 22, 33, 47, 68, 100]) * 1e-9
CORNERS = np.array(list(product([0.99, 1.01], [0.90, 1.10], repeat=2)))


def gain_db(frequency, values):
    r1, c1, r2, c2 = np.moveaxis(values, -1, 0)
    angular = 2 * np.pi * frequency
    return -10 * (np.log10(1 + (angular*r1*c1)**2) +
                  np.log10(1 + (angular*r2*c2)**2))


def main():
    candidates = np.array(list(product(RESISTORS, CAPACITORS, RESISTORS, CAPACITORS)))
    corners = candidates[:, None, :] * CORNERS[None, :, :]
    pass_loss = gain_db(100, corners).min(axis=1)
    stop_gain = gain_db(10_000, corners).max(axis=1)
    feasible = np.flatnonzero(pass_loss >= -0.5)
    best = feasible[np.argmin(stop_gain[feasible])]
    r1, c1, r2, c2 = candidates[best]
    if stop_gain[best] > -30:
        raise RuntimeError("No part combination meets the stopband requirement.")
    print(f"R1={r1:.0f} Ω, C1={c1*1e9:.0f} nF, R2={r2:.0f} Ω, C2={c2*1e9:.0f} nF")
    print(f"Worst corners: {pass_loss[best]:.3f} dB at 100 Hz, {stop_gain[best]:.3f} dB at 10 kHz")
    gains = gain_db(np.array([100, 10_000]), candidates[best])
    print(f"Nominal: {gains[0]:.3f} dB at 100 Hz, {gains[1]:.3f} dB at 10 kHz")


if __name__ == "__main__":
    main()
