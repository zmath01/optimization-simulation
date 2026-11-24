import assert from "node:assert/strict";
import test from "node:test";
import { boxProblem, minimize, problems, solveBox } from "../docs/solver-core.mjs";

test("analytical derivatives match centred differences", () => {
  const epsilon = 1e-5;
  for (const problem of Object.values(problems)) {
    const point = [0.83, 0.37];
    const [a, b, c] = problem.hessian(point);
    const hessian = [[a, b], [b, c]];
    for (let axis = 0; axis < 2; axis++) {
      const plus = [...point], minus = [...point];
      plus[axis] += epsilon;
      minus[axis] -= epsilon;
      const approximate = (problem.value(plus) - problem.value(minus)) / (2 * epsilon);
      assert.ok(Math.abs(approximate - problem.gradient(point)[axis]) < 1e-6);
      const pg = problem.gradient(plus), mg = problem.gradient(minus);
      for (let row = 0; row < 2; row++) {
        assert.ok(Math.abs((pg[row] - mg[row]) / (2 * epsilon) - hessian[row][axis]) < 1e-5);
      }
    }
  }
});

test("Armijo methods descend and Newton solves a positive definite quadratic in one step", () => {
  for (const problem of Object.values(problems)) {
    for (const method of ["gd", "newton", "bfgs"]) {
      const result = minimize(problem, method, problem.start, 130);
      assert.ok(result.values.every((value, i) => i === 0 || value <= result.values[i - 1]));
      assert.ok(result.evaluations >= result.points.length);
      if (method !== "gd") assert.equal(result.status, "Converged", method);
    }
  }
  const quadratic = minimize(problems.quadratic, "newton", [1, 2], 4);
  assert.equal(quadratic.points.length, 2);
  assert.ok(quadratic.residual < 1e-10);
});

test("projected gradient and exact edge search satisfy box KKT conditions including zero bounds", () => {
  for (const [target, upper] of [
    [[2.7, 0.3], [1.6, 1.6]],
    [[-1, 2], [1, 0]],
    [[1.2, 0.3], [2, 2]],
    [[-0.7, -0.4], [2, 2]],
    [[4, -3], [0, 0]],
  ]) {
    const model = boxProblem(target, upper);
    const result = solveBox(model, 100);
    assert.ok(model.certificate(result.exact) < 1e-9);
    assert.ok(model.value(result.exact) <= model.value(result.clipped) + 1e-12);
    assert.ok(model.value(result.points.at(-1)) - model.value(result.exact) < 1e-9);
    assert.ok(result.points.every((point) => point.every((v, i) => v >= 0 && v <= upper[i])));
  }
  const model = boxProblem([2.7, 0.3], [1.6, 1.6]);
  const { clipped, exact } = solveBox(model, 100);
  assert.ok(model.value(clipped) > model.value(exact) + 0.5);
});
