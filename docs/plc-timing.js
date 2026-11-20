const scanPeriod = document.getElementById("scan-ms");
const pulseWidth = document.getElementById("pulse-ms");
const pulseResult = document.getElementById("pulse-result");
const hitRate = document.getElementById("pulse-hit-rate");

function updatePulseResult() {
  const period = scanPeriod.valueAsNumber;
  const width = pulseWidth.valueAsNumber;
  if (!scanPeriod.validity.valid || !pulseWidth.validity.valid ||
      !Number.isInteger(period) || !Number.isInteger(width)) {
    pulseResult.textContent = "请输入 1 到 1000 之间的整数毫秒。";
    hitRate.hidden = true;
    return;
  }
  const hits = Math.min(period, width);
  pulseResult.textContent = hits + " / " + period + " 个相位命中，" +
    (period - hits) + " 个漏采。命中时最大等待 " + (hits - 1) + " ms。";
  hitRate.max = period;
  hitRate.value = hits;
  hitRate.textContent = hits + " / " + period;
  hitRate.hidden = false;
}

scanPeriod.addEventListener("input", updatePulseResult);
pulseWidth.addEventListener("input", updatePulseResult);
updatePulseResult();
