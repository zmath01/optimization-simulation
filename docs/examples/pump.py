"""Calibrate a system curve and compare throttle control with a VFD.

Synthetic water-loop data. SI units except displayed flow (m³/h) and power (kW).
"""
import numpy as np
from scipy.optimize import least_squares

FLOW = np.array([40, 55, 70, 85, 100, 115]) / 3600
HEAD = np.array([7.1, 8.2, 9.9, 12.0, 14.6, 17.5])
DUTY = np.array([55, 75, 100]) / 3600
HOURS = np.array([2200, 1800, 1000])
SHUTOFF_M = 30.0
PUMP_CURVE = 1.5e4
WATER_RHO = 998.0
G = 9.81


def energy(flow, head, efficiency):
    """Energy by operating bin in kWh."""
    return WATER_RHO * G * flow * head / efficiency * HOURS / 1000


def main():
    fit = least_squares(
        lambda x: x[0] + x[1] * FLOW**2 - HEAD,
        x0=[5, 1.2e4], bounds=(0, np.inf), loss="soft_l1", f_scale=0.15,
    )
    if not fit.success:
        raise RuntimeError(fit.message)

    system_head = fit.x[0] + fit.x[1] * DUTY**2
    fixed_head = SHUTOFF_M - PUMP_CURVE * DUTY**2
    # H_p(Q,n) = H_shutoff*n² - k_p*Q². Solve H_p = H_system for n.
    speed = np.sqrt((system_head + PUMP_CURVE * DUTY**2) / SHUTOFF_M)
    if not (np.all(fixed_head >= system_head) and np.all((speed >= 0.45) & (speed <= 1.0))):
        raise RuntimeError("Duty falls outside the assumed allowable operating envelope.")

    baseline = energy(DUTY, fixed_head, 0.64).sum()
    vfd = energy(DUTY, system_head, 0.62).sum()
    print(f"Fitted H_system = {fit.x[0]:.3f} m + {fit.x[1]:.1f} s²/m⁵ × Q²")
    print("VFD speed ratios:", np.round(speed, 3))
    print(f"Throttled: {baseline:,.0f} kWh/yr, VFD: {vfd:,.0f} kWh/yr")
    print(f"Synthetic savings: {baseline-vfd:,.0f} kWh/yr ({1-vfd/baseline:.1%})")


if __name__ == "__main__":
    main()
