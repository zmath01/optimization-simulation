import { boxProblem, minimize, problems, solveBox } from "./solver-core.mjs";

const $ = (id) => document.getElementById(id);
const number = (id) => $(id).valueAsNumber;
const methods = [
  ["gd", "Gradient descent", "#14634d"],
  ["newton", "Damped Newton", "#a5402b"],
  ["bfgs", "BFGS", "#334cab"],
];
const smoothFields = ["start-x", "start-y", "budget"];
const boundFields = ["desired-x", "desired-y", "upper-x", "upper-y", "box-budget"];
let selected = "unconstrained";
let landscape;

function canvasFrame(id) {
  const canvas = $(id);
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return { ctx, width, height };
}

function segment(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function dot(ctx, x, y, color, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

function trail(ctx, points, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach(([u, v], index) => {
    if (index) ctx.lineTo(x(u), y(v));
    else ctx.moveTo(x(u), y(v));
  });
  ctx.stroke();
  const [lastX, lastY] = points.at(-1);
  dot(ctx, x(lastX), y(lastY), color, 4);
}

function backdrop(id, domain, value) {
  const { ctx, width, height } = canvasFrame(id);
  const [xMin, xMax, yMin, yMax] = domain;
  const left = 44, right = width - 14, top = 12, bottom = height - 29;
  const x = (u) => left + (right - left) * (u - xMin) / (xMax - xMin);
  const y = (v) => bottom - (bottom - top) * (v - yMin) / (yMax - yMin);
  const invX = (u) => xMin + (u - left) * (xMax - xMin) / (right - left);
  const invY = (v) => yMin + (bottom - v) * (yMax - yMin) / (bottom - top);
  ctx.fillStyle = "#f3f6f2";
  ctx.fillRect(0, 0, width, height);
  for (let py = top; py < bottom; py += 4) {
    for (let px = left; px < right; px += 4) {
      const level = Math.min(12, Math.floor(2.2 * Math.log1p(value([invX(px + 2), invY(py + 2)]))));
      ctx.fillStyle = `hsl(${147 + level * 2} 24% ${94 - level * 2.6}%)`;
      ctx.fillRect(px, py, Math.min(4, right - px), Math.min(4, bottom - py));
    }
  }
  ctx.strokeStyle = "#587063";
  ctx.strokeRect(left, top, right - left, bottom - top);
  ctx.fillStyle = "#385048";
  ctx.font = "11px ui-monospace,monospace";
  for (let i = 0; i <= 4; i++) {
    const u = xMin + i * (xMax - xMin) / 4;
    const v = yMin + i * (yMax - yMin) / 4;
    ctx.fillText(u.toFixed(1), x(u) - 13, bottom + 17);
    ctx.fillText(v.toFixed(1), 5, y(v) + 4);
  }
  return { ctx, x, y, invX, invY, left, right, top, bottom };
}

function showConvergence(results) {
  const { ctx, width, height } = canvasFrame("convergence");
  const left = 48, top = 12, bottom = height - 25, right = width - 14;
  const budget = Math.max(1, ...results.map(({ values }) => values.length - 1));
  const peak = Math.max(0, Math.ceil(Math.max(...results.map(({ values }) => Math.log10(Math.max(1e-12, values[0]))))));
  const x = (i) => left + (right - left) * i / budget;
  const y = (v) => bottom - (bottom - top) * (v + 12) / (peak + 12);
  ctx.fillStyle = "#f3f6f2";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "11px ui-monospace,monospace";
  ctx.fillStyle = "#385048";
  ctx.strokeStyle = "#acbeb1";
  for (const v of [peak, -4, -8, -12]) {
    ctx.fillText("1e" + v, 5, y(v) + 4);
    segment(ctx, left, y(v), right, y(v));
  }
  ctx.fillText("0", left, height - 8);
  ctx.fillText(budget + " iterations", right - 94, height - 8);
  for (const [i, result] of results.entries()) {
    trail(ctx, result.values.map((v, j) => [j, Math.log10(Math.max(1e-12, v))]), x, y, methods[i][2]);
  }
}

function updateFieldDisplays(fields) {
  for (const field of fields) $(field + "-value").textContent = number(field).toFixed(field.includes("budget") ? 0 : 2);
}

function runSmooth() {
  const problem = problems[$("problem").value];
  const start = [number("start-x"), number("start-y")];
  const results = methods.map(([method]) => minimize(problem, method, start, number("budget")));
  updateFieldDisplays(smoothFields);
  const points = results.flatMap((result) => result.points);
  const [xMin, xMax, yMin, yMax] = problem.domain;
  const domain = [
    Math.min(xMin, ...points.map(([x]) => x - .15)), Math.max(xMax, ...points.map(([x]) => x + .15)),
    Math.min(yMin, ...points.map(([,y]) => y - .15)), Math.max(yMax, ...points.map(([,y]) => y + .15)),
  ];
  landscape = backdrop("landscape", domain, problem.value);
  const { ctx, x, y } = landscape;
  results.forEach((result, i) => trail(ctx, result.points, x, y, methods[i][2]));
  dot(ctx, x(start[0]), y(start[1]), "#092d25", 4.5);
  dot(ctx, x(problem.minimum[0]), y(problem.minimum[1]), "#fff", 3);
  showConvergence(results);
  $("smooth-results").innerHTML = results.map(({ points, values, evaluations, residual, status }, i) =>
    `<tr><th scope="row">${methods[i][1]}</th><td>${points.length - 1} / ${evaluations}</td><td>${values.at(-1).toExponential(2)}</td><td>${residual.toExponential(2)}</td><td>${status}</td></tr>`).join("");
}

function runBox() {
  updateFieldDisplays(boundFields);
  const problem = boxProblem([number("desired-x"), number("desired-y")], [number("upper-x"), number("upper-y")]);
  const { exact, clipped, points } = solveBox(problem, number("box-budget"));
  const { ctx, x, y } = backdrop("box-plot", [-.7, 3.8, -.65, 2.85], problem.value);
  ctx.fillStyle = "#ffffff7f";
  const boxWidth = x(problem.upper[0]) - x(0);
  const boxHeight = y(0) - y(problem.upper[1]);
  ctx.fillRect(x(0), y(problem.upper[1]), boxWidth, boxHeight);
  ctx.strokeStyle = "#385048";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x(0), y(problem.upper[1]), boxWidth, boxHeight);
  trail(ctx, points, x, y, methods[0][2]);
  dot(ctx, x(clipped[0]), y(clipped[1]), methods[1][2], 6);
  dot(ctx, x(exact[0]), y(exact[1]), methods[2][2], 4);
  const formatPoint = (point) => "(" + point.map((v) => v.toFixed(3)).join(", ") + ")";
  $("box-results").innerHTML = [["Projected gradient", points.at(-1)], ["Clip the target", clipped], ["Exact edge search", exact]]
    .map(([label, point]) => `<tr><th scope="row">${label}</th><td>${formatPoint(point)}</td><td>${problem.value(point).toFixed(5)}</td><td>${problem.certificate(point).toExponential(2)}</td></tr>`).join("");
}

function resetStart() {
  const [x, y] = problems[$("problem").value].start;
  $("start-x").value = x;
  $("start-y").value = y;
  runSmooth();
}
$("problem").addEventListener("change", resetStart);
$("reset-start").addEventListener("click", resetStart);
for (const field of smoothFields) $(field).addEventListener("input", runSmooth);
for (const field of boundFields) $(field).addEventListener("input", runBox);
$("landscape").addEventListener("click", (event) => {
  const { left, right, top, bottom, invX, invY } = landscape;
  const { offsetX: px, offsetY: py } = event;
  if (px < left || px > right || py < top || py > bottom) return;
  for (const [id, value] of [["start-x", invX(px)], ["start-y", invY(py)]]) {
    const input = $(id);
    const step = Number(input.step);
    const min = Number(input.min);
    input.value = Math.max(min, Math.min(Number(input.max), min + Math.round((value - min) / step) * step));
  }
  runSmooth();
});
const labButtons = document.querySelectorAll("[data-lab]");
for (const button of labButtons) {
  button.addEventListener("click", () => {
    selected = button.dataset.lab;
    for (const option of labButtons) {
      const active = option === button;
      option.setAttribute("aria-pressed", String(active));
      $(option.dataset.lab).hidden = !active;
    }
    if (selected === "unconstrained") runSmooth();
    else runBox();
  });
}
window.addEventListener("resize", () => {
  if (selected === "unconstrained") runSmooth();
  else runBox();
});
runSmooth();
