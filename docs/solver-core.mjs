const norm = (x) => Math.hypot(...x);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const multiply = ([a, b, c], [x, y]) => [a * x + b * y, b * x + c * y];
const identity = () => [1, 0, 1];
const tolerance = 1e-6;

export const problems = {
  quadratic: {
    domain: [-3, 3, -2.2, 2.2],
    start: [-2, 1.4],
    minimum: [0, 0],
    value: ([x, y]) => (20.8 * x * x + 38.4 * x * y + 32.2 * y * y) / 2,
    gradient: (p) => multiply([20.8, 19.2, 32.2], p),
    hessian: () => [20.8, 19.2, 32.2],
  },
  rosenbrock: {
    domain: [-2.2, 2, -1, 3.1],
    start: [-1.2, 1],
    minimum: [1, 1],
    value: ([x, y]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    gradient: ([x, y]) => [2 * (x - 1) - 400 * x * (y - x * x), 200 * (y - x * x)],
    hessian: ([x, y]) => [2 + 1200 * x * x - 400 * y, -400 * x, 200],
  },
};

function newtonDirection([a, b, c], gradient) {
  const minimumEigenvalue = (a + c - Math.hypot(a - c, 2 * b)) / 2;
  const shift = Math.max(0, 0.5 - minimumEigenvalue);
  const diagonalA = a + shift;
  const diagonalC = c + shift;
  const determinant = diagonalA * diagonalC - b * b;
  const [gx, gy] = gradient;
  return [(b * gy - diagonalC * gx) / determinant, (b * gx - diagonalA * gy) / determinant];
}

function nextInverseHessian(inverse, step, gradientChange) {
  const curvature = dot(step, gradientChange);
  if (curvature <= 1e-10 * norm(step) * norm(gradientChange)) return identity();
  const [hx, hy] = multiply(inverse, gradientChange);
  const [sx, sy] = step;
  const scale = (curvature + dot(gradientChange, [hx, hy])) / curvature ** 2;
  return [
    inverse[0] + scale * sx * sx - 2 * hx * sx / curvature,
    inverse[1] + scale * sx * sy - (hx * sy + hy * sx) / curvature,
    inverse[2] + scale * sy * sy - 2 * hy * sy / curvature,
  ];
}

export function minimize(problem, method, start, budget) {
  let point = [...start];
  let value = problem.value(point);
  let evaluations = 1;
  let inverse = identity();
  const points = [point];
  const values = [value];
  for (let iteration = 0; iteration < budget; iteration++) {
    const gradient = problem.gradient(point);
    if (norm(gradient) <= tolerance) break;
    let direction = gradient.map((v) => -v);
    if (method === "newton") direction = newtonDirection(problem.hessian(point), gradient);
    if (method === "bfgs") direction = multiply(inverse, direction);
    if (!Number.isFinite(dot(gradient, direction)) || dot(gradient, direction) >= 0) {
      inverse = identity();
      direction = gradient.map((v) => -v);
    }
    const slope = dot(gradient, direction);
    let candidate;
    for (let step = 1, attempt = 0; attempt < 40; attempt++, step *= 0.5) {
      const proposed = point.map((v, i) => v + step * direction[i]);
      const proposedValue = problem.value(proposed);
      evaluations++;
      if (Number.isFinite(proposedValue) && proposedValue <= value + 1e-4 * step * slope) {
        candidate = { point: proposed, value: proposedValue };
        break;
      }
    }
    if (!candidate) return { points, values, evaluations, residual: norm(gradient), status: "Line search stalled" };
    if (method === "bfgs") {
      const step = candidate.point.map((v, i) => v - point[i]);
      const gradientChange = problem.gradient(candidate.point).map((v, i) => v - gradient[i]);
      inverse = nextInverseHessian(inverse, step, gradientChange);
    }
    point = candidate.point;
    value = candidate.value;
    points.push(point);
    values.push(value);
  }
  const residual = norm(problem.gradient(point));
  return { points, values, evaluations, residual, status: residual <= tolerance ? "Converged" : "Iteration limit" };
}

export const boxMatrix = [6, 2, 3];
const clip = (value, limit) => Math.min(limit, Math.max(0, value));

export function boxProblem(target, upper) {
  const project = (x) => x.map((value, index) => clip(value, upper[index]));
  const gradient = (x) => multiply(boxMatrix, [x[0] - target[0], x[1] - target[1]]);
  const value = (x) => dot([x[0] - target[0], x[1] - target[1]], gradient(x)) / 2;
  const certificate = (x) => {
    const g = gradient(x);
    const projected = project([x[0] - g[0], x[1] - g[1]]);
    return norm([x[0] - projected[0], x[1] - projected[1]]);
  };
  return { target, upper, project, gradient, value, certificate };
}

export function solveBox(problem, budget) {
  const { target, upper, project, value, gradient, certificate } = problem;
  const [a, b, c] = boxMatrix;
  const clipped = project(target);
  const candidates = [clipped];
  for (const x of [0, upper[0]]) candidates.push(project([x, target[1] - b * (x - target[0]) / c]));
  for (const y of [0, upper[1]]) candidates.push(project([target[0] - b * (y - target[1]) / a, y]));
  const exact = candidates.reduce((best, x) => value(x) < value(best) ? x : best);
  const step = 2 / (a + c + Math.hypot(a - c, 2 * b));
  const points = [[0, 0]];
  const values = [value(points[0])];
  for (let i = 0; i < budget; i++) {
    const x = points.at(-1);
    if (certificate(x) <= tolerance) break;
    const g = gradient(x);
    const next = project(x.map((v, j) => v - step * g[j]));
    points.push(next);
    values.push(value(next));
  }
  return { clipped, exact, points, values, residual: certificate(points.at(-1)) };
}
