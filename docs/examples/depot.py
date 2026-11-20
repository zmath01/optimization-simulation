"""Optimize one day of fleet-depot charging with SciPy/HiGHS.

Four one-hour slots, three vehicles, synthetic tariffs and site loads.
"""
import numpy as np
from scipy.optimize import linprog

DEMAND = np.array([50.0, 35.0, 40.0])  # kWh delivered to batteries
MAX_KW = np.array([[25, 25, 25, 25], [20, 20, 20, 0], [0, 30, 30, 30]], dtype=float)
LOAD_KW = np.array([45.0, 35.0, 25.0, 30.0])
PRICE = np.array([0.25, 0.15, 0.08, 0.12])  # USD/kWh at meter
STEP_H = 1.0
EFFICIENCY = 0.92
PEAK_VALUE = 1.0  # USD per kW for this illustrative single-day model
SITE_LIMIT = 110.0  # kW


def earliest_schedule():
    schedule = np.zeros_like(MAX_KW)
    remaining = DEMAND.copy()
    for slot, load in enumerate(LOAD_KW):
        available = SITE_LIMIT - load
        for vehicle in range(len(DEMAND)):
            power = min(MAX_KW[vehicle, slot], remaining[vehicle] / (STEP_H * EFFICIENCY), available)
            schedule[vehicle, slot] = power
            available -= power
            remaining[vehicle] -= power * STEP_H * EFFICIENCY
    if np.max(remaining) > 1e-6:
        raise RuntimeError("Baseline cannot meet departures with this scenario.")
    return schedule


def optimize():
    vehicles, slots = MAX_KW.shape
    indices = np.arange(MAX_KW.size).reshape(MAX_KW.shape)
    delivery = np.zeros((vehicles, MAX_KW.size + 1))
    for vehicle, columns in enumerate(indices):
        delivery[vehicle, columns] = STEP_H * EFFICIENCY

    peak = np.zeros((slots, MAX_KW.size + 1))
    for slot, columns in enumerate(indices.T):
        peak[slot, columns] = 1
    peak[:, -1] = -1
    objective = np.r_[np.tile(PRICE * STEP_H, vehicles), PEAK_VALUE]
    bounds = [(0, limit) for limit in MAX_KW.flat] + [(0, SITE_LIMIT)]
    result = linprog(
        objective, A_ub=peak, b_ub=-LOAD_KW, A_eq=delivery, b_eq=DEMAND,
        bounds=bounds, method="highs",
    )
    if not result.success:
        raise RuntimeError(result.message)
    return result.x[:-1].reshape(MAX_KW.shape)


def summarize(label, schedule):
    fleet_kw = schedule.sum(axis=0)
    peak_kw = np.max(LOAD_KW + fleet_kw)
    if not np.allclose(schedule.sum(axis=1) * STEP_H * EFFICIENCY, DEMAND):
        raise RuntimeError("Schedule fails the departure-energy check.")
    if peak_kw > SITE_LIMIT + 1e-6 or np.any(schedule > MAX_KW + 1e-6):
        raise RuntimeError("Schedule fails a power limit.")
    score = STEP_H * (fleet_kw @ PRICE) + PEAK_VALUE * peak_kw
    print(f"{label:>9}: peak {peak_kw:.2f} kW, objective ${score:.2f}")
    print(np.round(schedule, 2))
    return score


def main():
    before = summarize("Earliest", earliest_schedule())
    after = summarize("Optimized", optimize())
    if after > before + 1e-6:
        raise RuntimeError("Optimization lost to the feasible baseline.")


if __name__ == "__main__":
    main()
