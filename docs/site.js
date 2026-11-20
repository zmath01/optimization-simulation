const energy = document.getElementById("energy");
const rate = document.getElementById("rate");
const cost = document.getElementById("cost");
const output = document.getElementById("payback");
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const years = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function updatePayback() {
  const inputs = [energy, rate, cost];
  if (inputs.some((input) => !input.validity.valid || !Number.isFinite(input.valueAsNumber))) {
    output.textContent = "Enter three nonnegative values.";
    return;
  }
  const yearlySavings = energy.valueAsNumber * rate.valueAsNumber;
  const paybackYears = cost.valueAsNumber / yearlySavings;
  if (!Number.isFinite(yearlySavings) || (yearlySavings > 0 && !Number.isFinite(paybackYears))) {
    output.textContent = "Values exceed the calculator range.";
    return;
  }
  output.textContent = yearlySavings > 0
    ? currency.format(yearlySavings) + "/year · " + years.format(paybackYears) + " years"
    : "$0/year · no payback at these inputs";
}

for (const input of [energy, rate, cost]) {
  input.addEventListener("input", updatePayback);
}

function revealSection() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement && !target.open) {
    target.open = true;
    target.scrollIntoView();
  }
}

window.addEventListener("hashchange", revealSection);
revealSection();
