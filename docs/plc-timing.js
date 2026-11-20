const pulseMessages = {
  en: {
    invalid: "Enter whole numbers from 1 to 1,000 milliseconds.",
    result: (hits, period) =>
      "Detected " + hits + " of " + period + " phases (" + (period - hits) +
      " missed). Maximum wait among detections is " + (hits - 1) + " ms.",
  },
  "zh-Hans": {
    invalid: "请输入 1 到 1000 之间的整数毫秒。",
    result: (hits, period) => hits + " / " + period + " 个相位命中，" +
      (period - hits) + " 个漏采。命中时最大等待 " + (hits - 1) + " ms。",
  },
};

const pulseCalculators = Array.from(document.querySelectorAll("[data-pulse-calculator]"), (element) => ({
  scan: element.querySelector('input[name="scan"]'),
  pulse: element.querySelector('input[name="pulse"]'),
  output: element.querySelector("output"),
  meter: element.querySelector("progress"),
  messages: pulseMessages[element.closest("[lang]").lang],
}));

function updatePulseCalculators(source) {
  const period = source.scan.valueAsNumber;
  const width = source.pulse.valueAsNumber;
  const valid = source.scan.validity.valid && source.pulse.validity.valid &&
    Number.isInteger(period) && Number.isInteger(width);
  for (const calculator of pulseCalculators) {
    if (calculator !== source) {
      calculator.scan.value = source.scan.value;
      calculator.pulse.value = source.pulse.value;
    }
    calculator.meter.hidden = !valid;
    if (!valid) {
      calculator.output.textContent = calculator.messages.invalid;
      continue;
    }
    const hits = Math.min(period, width);
    calculator.output.textContent = calculator.messages.result(hits, period);
    calculator.meter.max = period;
    calculator.meter.value = hits;
    calculator.meter.textContent = hits + " / " + period;
  }
}

for (const calculator of pulseCalculators) {
  const update = () => updatePulseCalculators(calculator);
  calculator.scan.addEventListener("input", update);
  calculator.pulse.addEventListener("input", update);
}
updatePulseCalculators(pulseCalculators[0]);
