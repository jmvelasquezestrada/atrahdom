const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'calculadora.html'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js/calculadora-v22.js'), 'utf8');
const calculatorCss = fs.readFileSync(path.join(root, 'css/calculadora-v22.css'), 'utf8');
assert.match(html, /js\/calculadora-v22-policy\.js/);
assert.match(html, /js\/calculadora-v22\.js/);
assert.doesNotMatch(html, /js\/ui\.js/);
const firstSlideMatch = html.match(/<section class="wizard-step" data-step="work">([\s\S]*?)<\/section>/);
assert.ok(firstSlideMatch, 'existe el primer slide de trabajo');
assert.deepEqual(Array.from(firstSlideMatch[1].matchAll(/name="([^"]+)"/g), match => match[1]), ['activity', 'circumscription', 'startDate'], 'el primer slide contiene solo actividad, departamento y fecha de inicio, en ese orden');
assert.match(firstSlideMatch[1], /¿Qué actividad realizabas\?/);
assert.match(firstSlideMatch[1], /¿En qué departamento trabajabas\?/);
assert.match(firstSlideMatch[1], /¿Cuándo empezaste a trabajar allí\?/);
assert.doesNotMatch(html, /name="sector"|¿En qué sector trabajabas\?|scope-notice/);
assert.doesNotMatch(uiSource, /scopeNotice|values\(\)\.sector|Paso 0 de 6/);
assert.doesNotMatch(calculatorCss, /scope-notice/);
assert.match(uiSource, /class="report-section results-section"/);
assert.match(calculatorCss, /\.result-item:last-of-type\{border-bottom:0\}/, 'la última prestación no duplica la línea separadora del bloque');
assert.match(html, /<option value="ce1">CE1 – Departamento de Guatemala<\/option>/);
assert.match(html, /<option value="ce2">CE2 – Otro departamento<\/option>/);
assert.equal((html.match(/name="ordinarySalary"/g) || []).length, 1, 'el monto ordinario aparece en un único campo numérico');
for (const name of ['commissionsStatus', 'extraordinaryStatus', 'vacationStatus', 'aguinaldoStatus', 'bono14Status', 'economicAdvantages', 'overtimeStatus']) {
  const position = html.indexOf(`name="${name}"`);
  assert.notEqual(position, -1, `falta el control binario ${name}`);
  const labelStart = html.lastIndexOf('<label', position);
  const fieldsetStart = html.lastIndexOf('<fieldset', position);
  const start = Math.max(labelStart, fieldsetStart);
  const closingTag = start === fieldsetStart ? '</fieldset>' : '</label>';
  const end = html.indexOf(closingTag, position) + closingTag.length;
  const group = html.slice(start, end);
  assert.doesNotMatch(group, /value="unknown"|No lo sé|No lo recuerdo|No estoy segura|Desconozco/i, `${name} no ofrece respuestas de incertidumbre`);
}
assert.match(html, /<legend>¿Cuánto salario ordinario recibías al mes\?<\/legend><input type="number"[^>]*name="ordinarySalary"/);
assert.match(html, /name="ordinarySalary"[^>]*inputmode="decimal"/);
assert.match(html, /Si no conocés el monto, podés dejarlo vacío/);
assert.doesNotMatch(html, /name="salaryUnknown"|No recuerdo el monto/);
assert.match(html, /¿Tomaste vacaciones durante los últimos cinco años\?/);
assert.match(html, /No ingresés un monto\. El motor estima este concepto con su fórmula vigente/);
assert.doesNotMatch(html, /salaryPendingStatus|¿Recordás ese monto\?|name="salaryStatus"/);
assert.doesNotMatch(uiSource, /salaryPendingStatus|¿Recordás ese monto\?/);
assert.match(html, /data-show-when="overtimeStatus:yes"[^>]*>Horas extraordinarias no pagadas<input type="number"[^>]*name="overtimeHours"/);
assert.match(html, /data-show-when="overtimeStatus:yes"[^>]*>Tipo de jornada<select name="overtimeShift"/);
assert.match(uiSource, /Días acumulados: \$\{vacation\.generated\.toFixed\(2\)\}; disfrutados asignados: \$\{vacation\.taken\.toFixed\(2\)\}; pendientes: \$\{vacation\.pending\.toFixed\(2\)\}/);
assert.match(uiSource, /Ciclo \$\{cycleLabel\}; tramo computado/);
assert.doesNotMatch(uiSource, /Advertencias sobre tu estimación|review-notice/);
assert.match(uiSource, /policy\.overtimeAmountReady && result/);
assert.match(uiSource, /CE1 – Departamento de Guatemala/);
assert.match(uiSource, /CE2 – Otro departamento/);
assert.match(uiSource, /Si consideras que quedaron salarios pendientes o que recibiste menos del salario mínimo que correspondía, te recomendamos buscar asesoría laboral con ATRAHDOM para revisar tu caso\./);
for (const [, id] of uiSource.matchAll(/querySelector\('#([^']+)'\)/g)) {
  assert.match(html, new RegExp(`id="${id}"`), `falta el elemento #${id} en la página`);
}
assert.doesNotMatch(uiSource, /fetch\(|sendBeacon|localStorage|sessionStorage/);

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/calculadora-v22-policy.js'), 'utf8'), sandbox, {
  filename: 'js/calculadora-v22-policy.js'
});

const base = {
  startDate: '2024-01-01',
  endDate: '2026-07-31',
  salaryStatus: 'known',
  ordinarySalary: '4500',
  commissionsStatus: 'no',
  extraordinaryStatus: 'no',
  activity: 'noAgricola',
  circumscription: 'ce1',
  reason: 'despido_injustificado',
  vacationStatus: 'no',
  aguinaldoStatus: 'yes',
  bono14Status: 'yes',
  economicAdvantages: 'no',
  overtimeStatus: 'no'
};
const policy = sandbox.window.CalculadoraV22Policy;
let result = policy.assess(base);
assert.equal(result.indemnityReady, true, 'el caso completo permite estimar indemnización con la referencia de 2026');
assert.equal(result.vacationReady, true, 'la respuesta No representa explícitamente cero días gozados');
assert.equal(result.aguinaldoReady, true, 'Aguinaldo confirmado se puede estimar en su período actual');
assert.equal(result.bono14Ready, true, 'Bono 14 confirmado se puede estimar en su período actual');
assert.equal(result.overtimeAmountReady, false, 'la pregunta simple de horas extra no genera un monto');

const engineInput = policy.prepare(base);
assert.equal(engineInput.ordinarySalary, '4500');
assert.equal(engineInput.sector, 'privado', 'la política conserva el alcance privado sin pedirlo en el formulario');
assert.equal(engineInput.commissions, '0');
assert.equal(engineInput.extraordinarySalary, '0');
assert.equal(engineInput.bonusStatus, 'unknown', 'el adaptador no afirma que se pagó la bonificación incentivo');
assert.equal(engineInput.bonusPendingDays, '0');
assert.equal(engineInput.adjustments.length, 0, 'no crea registros históricos sin datos de la persona');

result = policy.assess({ ...base, salaryStatus: 'unknown' });
assert.equal(result.salaryKnown, false);
assert.equal(result.baseKnown, false);
assert.equal(result.vacationSalaryKnown, false);
assert.equal(result.aguinaldoSalaryKnown, false);
assert.equal(result.bono14SalaryKnown, false);
assert.equal(result.indemnityReady, false);
assert.equal(result.vacationReady, false);
assert.equal(result.aguinaldoReady, false);
assert.equal(result.bono14Ready, false);
result = policy.assess({ ...base, commissionsStatus: 'no', extraordinaryStatus: 'no' });
assert.equal(result.vacationSalaryKnown, true, 'responder No a componentes salariales confirma que no integran la base de vacaciones');
assert.equal(result.aguinaldoSalaryKnown, true);
assert.equal(result.bono14SalaryKnown, true);
assert.equal(result.vacationReady, true);
assert.equal(result.aguinaldoReady, true);
assert.equal(result.bono14Ready, true);

result = policy.assess({ ...base, commissionsStatus: 'unknown' });
assert.equal(result.baseKnown, false, 'comisiones desconocidas afectan la base salarial');
assert.equal(result.vacationSalaryKnown, false, 'comisiones desconocidas impiden determinar el promedio salarial');
assert.equal(result.indemnityReady, false);
assert.equal(result.vacationReady, false);

result = policy.assess({ ...base, extraordinaryStatus: 'unknown' });
assert.equal(result.baseKnown, true, 'otros pagos no cambian la base actual de indemnización');
assert.equal(result.vacationSalaryKnown, false);
assert.equal(result.aguinaldoSalaryKnown, false);
assert.equal(result.bono14SalaryKnown, false);
assert.equal(result.indemnityReady, true, 'un dato que solo afecta el promedio no bloquea la indemnización');
assert.equal(result.vacationReady, false);
assert.equal(result.aguinaldoReady, false);
assert.equal(result.bono14Ready, false);
result = policy.assess({ ...base, vacationStatus: 'unknown' });
assert.equal(result.vacationReady, false);
assert.equal(result.aguinaldoReady, true);
assert.equal(result.bono14Ready, true);

result = policy.assess({ ...base, aguinaldoStatus: 'unknown' });
assert.equal(result.aguinaldoReady, false);
assert.equal(result.bono14Ready, true, 'Aguinaldo desconocido no bloquea Bono 14');

result = policy.assess({ ...base, bono14Status: 'unknown' });
assert.equal(result.bono14Ready, false);
assert.equal(result.aguinaldoReady, true, 'Bono 14 desconocido no bloquea Aguinaldo');

result = policy.assess({ ...base, economicAdvantages: 'unknown' });
assert.equal(result.advantagesReady, false);
assert.equal(result.vacationReady, true);
assert.equal(result.aguinaldoReady, true);

result = policy.assess({ ...base, overtimeStatus: 'yes' });
assert.equal(result.overtimeAmountReady, false);
assert.equal(result.vacationReady, true);

result = policy.assess({ ...base, overtimeStatus: 'yes', overtimeHours: '4', overtimeShift: 'diurna' });
assert.equal(result.overtimeAmountReady, true, 'horas, jornada y base confirmadas habilitan la fórmula vigente');
assert.equal(result.engineInput.unpaidOvertime, '4');
assert.equal(result.engineInput.shift, 'diurna');
result = policy.assess({ ...base, overtimeStatus: 'yes', overtimeShift: 'diurna' });
assert.equal(result.overtimeAmountReady, false, 'sin horas no se habilita un monto de horas extra');

result = policy.assess({ ...base, endDate: '2025-07-31', ordinarySalary: '3000' });
assert.equal(result.indemnityReady, true, 'la advertencia retirada no altera la disponibilidad de indemnización');
assert.equal(result.vacationReady, true, 'la advertencia retirada no altera prestaciones independientes');

const salarySource = fs.readFileSync(path.join(root, 'data/salarios-minimos.js'), 'utf8');
vm.runInContext(salarySource, sandbox, { filename: 'data/salarios-minimos.js' });
sandbox.obtenerSalarioMinimo = sandbox.window.obtenerSalarioMinimo;
const engineSource = fs.readFileSync(path.join(root, 'js/prestaciones.js'), 'utf8');
vm.runInContext(engineSource, sandbox, { filename: 'js/prestaciones.js' });

const lowSalaryData = {
  ...base,
  startDate: '2025-01-01',
  endDate: '2026-12-31',
  ordinarySalary: '3000',
  vacationStatus: 'yes',
  vacationTaken: '10',
  aguinaldoStatus: 'no',
  bono14Status: 'no',
  overtimeStatus: 'yes',
  overtimeHours: '4',
  overtimeShift: 'diurna'
};
const lowSalaryPolicy = policy.assess(lowSalaryData, sandbox.obtenerSalarioMinimo(2026, 'noAgricola', 'ce1'));
assert.equal(lowSalaryPolicy.indemnityReady, true, 'salario menor al mínimo 2026 no activa la salvaguarda de tabla histórica');
const lowSalaryResult = sandbox.window.Prestaciones.calculate(lowSalaryPolicy.engineInput);
assert.ok(lowSalaryResult.values.vacaciones > 0, 'vacaciones siguen calculándose con la base promedio vigente');
assert.ok(lowSalaryResult.values.aguinaldo > 0, 'Aguinaldo no recibido muestra la proporción del período actual');
assert.ok(lowSalaryResult.values.bono14 > 0, 'Bono 14 no recibido muestra la proporción de su período distinto');
assert.notEqual(lowSalaryResult.aguinaldoStart.getTime(), lowSalaryResult.bonoStart.getTime(), 'Aguinaldo y Bono 14 conservan períodos diferentes');
assert.equal(lowSalaryResult.vacation.taken, 10);
assert.ok(Math.abs(lowSalaryResult.vacation.pending - Math.max(0, lowSalaryResult.vacation.generated - 10)) < 1e-9);
assert.ok(Math.abs(lowSalaryResult.values.vacaciones - lowSalaryResult.average / 30 * lowSalaryResult.vacation.pending) < 0.005);
assert.ok(lowSalaryResult.values.horasExtra > 0, 'horas extra se estiman usando el motor existente y los datos capturados');

const privateLongCase = {
  ...base,
  startDate: '2001-01-01',
  endDate: '2026-10-31',
  activity: 'agricola',
  circumscription: 'ce1',
  ordinarySalary: '1000',
  commissionsStatus: 'no',
  extraordinaryStatus: 'no',
  vacationStatus: 'yes',
  vacationTaken: '10',
  aguinaldoStatus: 'no',
  bono14Status: 'no',
  reason: 'despido_injustificado',
  economicAdvantages: 'no',
  overtimeStatus: 'no'
};

function runCalculator(data, beforeReport) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, hidden: false, disabled: false, required: false, textContent: '', innerHTML: '',
      dataset: {}, listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; },
      scrollIntoView() {}, focus() {}
    });
    return elements.get(id);
  }
  const form = element('calculator-form');
  form.reset = () => {
    for (const key of Object.keys(data)) delete data[key];
  };
  const steps = ['work','salary','termination','benefits','payments','summary','result'].map(step => ({ dataset: { step }, hidden: false }));
  form.querySelectorAll = selector => selector === '.wizard-step' ? steps : [];
  form.querySelector = selector => {
    const checkedMatch = selector.match(/^\[name="([^"]+)"\]:checked$/);
    if (checkedMatch) return data[checkedMatch[1]] ? { value: data[checkedMatch[1]] } : null;
    const nameMatch = selector.match(/^\[name="([^"]+)"\]$/);
    return nameMatch ? element(`field-${nameMatch[1]}`) : null;
  };
  form.elements = { namedItem: name => element(`field-${name}`) };
  form.listeners = {};
  const document = { querySelector(selector) { return selector === '#calculator-form' ? form : element(selector.replace(/^#/, '')); } };
  class MockFormData { entries() { return Object.entries(data)[Symbol.iterator](); } }
  const reportSandbox = {
    window: { Prestaciones: sandbox.window.Prestaciones, CalculadoraV22Policy: policy, obtenerSalarioMinimo: sandbox.obtenerSalarioMinimo, print() {} },
    document, FormData: MockFormData, Intl, console
  };
  vm.createContext(reportSandbox);
  vm.runInContext(uiSource, reportSandbox, { filename: 'js/calculadora-v22.js' });
  const next = element('wizard-next');
  let reportData = null;
  if (beforeReport) reportData = beforeReport({ element, next, data, steps });
  else {
    for (let index = 0; index < 5; index += 1) next.listeners.click({});
    reportData = element('wizard-prepare-report').listeners.click({});
  }
  return { html: element('results').innerHTML, element, reportData };
}

const navigationReport = runCalculator({ ...privateLongCase }, ({ element, next, data, steps }) => {
  assert.match(element('wizard-progress').innerHTML, /Paso 1 de 6/);
  assert.equal(steps.find(step => step.dataset.step === 'work').hidden, false, 'el flujo inicia en el primer slide');
  assert.equal(steps.find(step => step.dataset.step === 'salary').hidden, true);
  assert.equal(next.className, 'primary', 'Continuar conserva el botón morado fuera del resumen');
  data.activity = 'maquila';
  next.listeners.click({});
  assert.match(element('wizard-progress').innerHTML, /Paso 2 de 6/);
  assert.equal(steps.find(step => step.dataset.step === 'salary').hidden, false, 'Continuar avanza al paso siguiente');
  element('wizard-back').listeners.click({});
  assert.match(element('wizard-progress').innerHTML, /Paso 1 de 6/);
  assert.equal(steps.find(step => step.dataset.step === 'work').hidden, false, 'Atrás regresa al primer slide');
  assert.equal(data.activity, 'maquila', 'la respuesta de actividad persiste al regresar');
  assert.equal(data.circumscription, 'ce1', 'la respuesta de departamento persiste al regresar');
  assert.equal(data.startDate, '2001-01-01', 'la fecha de inicio persiste al regresar');
  next.listeners.click({});
  assert.equal(data.activity, 'maquila', 'la respuesta se conserva al avanzar de nuevo');
  for (let index = 0; index < 4; index += 1) next.listeners.click({});
  assert.match(element('wizard-progress').innerHTML, /Paso 6 de 6/);
  return element('wizard-prepare-report').listeners.click({});
});
assert.match(navigationReport.html, /Exportación y maquila/, 'la respuesta conservada llega al informe');

const restartFlow = runCalculator({ ...privateLongCase }, ({ element, next, data, steps }) => {
  for (let index = 0; index < 5; index += 1) next.listeners.click({});
  assert.equal(next.textContent, 'Reiniciar', 'el botón de la captura cambia su etiqueta en el resumen');
  assert.equal(element('wizard-prepare-report').hidden, false, 'Preparar informe conserva una acción propia');
  assert.equal(next.className, 'secondary-action', 'Reiniciar se muestra blanco como Atrás');
  assert.equal(element('wizard-prepare-report').className, 'primary', 'Preparar informe se muestra morado');
  data.activity = 'maquila';
  next.listeners.click({});
  assert.match(element('wizard-progress').innerHTML, /Paso 1 de 6/);
  assert.equal(steps.find(step => step.dataset.step === 'work').hidden, false);
  assert.equal(steps.find(step => step.dataset.step === 'salary').hidden, true);
  assert.equal(Object.keys(data).length, 0, 'Reiniciar limpia las respuestas anteriores');
  assert.equal(element('wizard-prepare-report').hidden, true);
  return null;
});
assert.equal(restartFlow.html, '', 'reiniciar vuelve al formulario sin mostrar una pantalla vacía intermedia');

const overtimeData = {
  ...privateLongCase,
  overtimeStatus: 'yes',
  overtimeHours: '4',
  overtimeShift: 'diurna'
};
let report = runCalculator(overtimeData, ({ element, next }) => {
  assert.equal(element('results').innerHTML, '', 'el informe solo aparece al final del flujo');
  for (let index = 0; index < 5; index += 1) next.listeners.click({});
  return element('wizard-prepare-report').listeners.click({});
});
assert.match(report.html, /Indemnización/);
assert.match(report.html, /Esta es una estimación orientativa calculada con base en las fechas y el salario declarados/);
assert.equal((report.html.match(/<h4>Vacaciones pendientes estimadas<\/h4>/g) || []).length, 1);
assert.equal((report.html.match(/<h4>Aguinaldo pendiente estimado<\/h4>/g) || []).length, 1);
assert.equal((report.html.match(/<h4>Bono 14 pendiente estimado<\/h4>/g) || []).length, 1);
assert.match(report.html, /10\.00 gozados/, 'los diez días gozados aparecen descontados del saldo');
assert.match(report.html, /últimos cinco años/);
assert.match(report.html, /4 horas; jornada diurna/);
assert.match(report.html, /Salario ordinario reportado/);
assert.doesNotMatch(report.html, /sector público|Ley de Servicio Civil/);
assert.doesNotMatch(report.html, /(?:Vacaciones|Aguinaldo|Bono 14) · 20\d{2}-\d{2}-\d{2}/, 'el informe principal no lista importes por período');
assert.match(report.html, /Suma orientativa de los rubros calculados/);
const amounts = [...report.html.matchAll(/<article class="result-item">[\s\S]*?<strong>Q\s*([\d,]+\.\d{2})<\/strong><\/article>/g)].map(match => Number(match[1].replace(/,/g, '')));
assert.equal(amounts.length, 5, 'el informe muestra indemnización, tres rubros consolidados y horas extra');
const expectedSum = amounts.reduce((sum, amount) => sum + amount, 0);
const displayedTotal = Number(report.html.match(/<div class="guided-total">[\s\S]*?<strong>Q\s*([\d,]+\.\d{2})<\/strong>/)[1].replace(/,/g, ''));
assert.equal(displayedTotal, Number(expectedSum.toFixed(2)), 'el total coincide exactamente con la suma de los importes visibles');
const expectedIndemnity = sandbox.window.Prestaciones.calculate(policy.prepare(overtimeData)).values.indemnizacion;
assert.ok(Number.isFinite(expectedIndemnity) && expectedIndemnity > 0, 'antigüedad desde 2001 produce indemnización con la fórmula vigente');
const indemnityCard = report.html.match(/<article class="result-item"><div><h4>Indemnización<\/h4>[\s\S]*?<\/div><strong>Q\s*([\d,]+\.\d{2})<\/strong><\/article>/);
assert.ok(indemnityCard, 'el informe muestra el importe de indemnización');
assert.equal(Number(indemnityCard[1].replace(/,/g, '')), Number(expectedIndemnity.toFixed(2)), 'la indemnización del informe coincide con el motor vigente');
const overtimeCard = report.html.match(/<article class="result-item"><div><h4>Horas extraordinarias<\/h4>[\s\S]*?<\/div><strong>Q\s*([\d,]+\.\d{2})<\/strong><\/article>/);
const expectedOvertime = sandbox.window.Prestaciones.calculate(policy.prepare(overtimeData)).values.horasExtra;
assert.ok(overtimeCard, 'horas declaradas y jornada ingresada producen un rubro con importe');
assert.equal(Number(overtimeCard[1].replace(/,/g, '')), Number(expectedOvertime.toFixed(2)), 'horas extra usan la fórmula vigente del motor');

function localDate(value) { return new Date(`${value}T00:00:00`); }
function dateString(value) { return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function addDays(value, amount) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }
function privateAnnualPeriodTotals(kind) {
  const start = localDate(privateLongCase.startDate);
  const end = localDate(privateLongCase.endDate);
  const month = kind === 'aguinaldo' ? 11 : 6;
  const engineInput = policy.prepare(overtimeData);
  let year = start.getMonth() >= month ? start.getFullYear() : start.getFullYear() - 1;
  const periods = [];
  for (; ; year += 1) {
    const cycleStart = new Date(year, month, 1);
    if (cycleStart > end) break;
    const cycleEnd = kind === 'aguinaldo' ? new Date(year + 1, 11, 0) : new Date(year + 1, 6, 0);
    const actualStart = start > cycleStart ? start : cycleStart;
    const actualEnd = end < cycleEnd ? end : cycleEnd;
    if (actualStart <= actualEnd) {
      const result = sandbox.window.Prestaciones.calculate({
        ...engineInput,
        endDate: dateString(actualEnd),
        [kind === 'aguinaldo' ? 'aguinaldoLastPaid' : 'bono14LastPaid']: dateString(actualStart)
      });
      periods.push(result.values[kind]);
    }
  }
  return periods;
}
function privateVacationPeriodTotals() {
  const start = localDate(privateLongCase.startDate);
  const end = localDate(privateLongCase.endDate);
  const cutoff = new Date(end.getFullYear() - 5, end.getMonth(), end.getDate());
  const periods = [];
  let anchor = addDays(start, -1);
  let nextAnniversary = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  while (nextAnniversary <= end) {
    if (nextAnniversary >= cutoff) {
      const allowedStart = anchor < addDays(cutoff, -1) ? addDays(cutoff, -1) : anchor;
      periods.push({ anchor: allowedStart, periodEnd: nextAnniversary });
    }
    anchor = nextAnniversary;
    nextAnniversary = new Date(nextAnniversary.getFullYear() + 1, start.getMonth(), start.getDate());
  }
  if (end >= cutoff && addDays(anchor, 1) <= end) periods.push({ anchor, periodEnd: end });
  let remaining = Number(privateLongCase.vacationTaken);
  const taken = new Map();
  for (const period of [...periods].reverse()) {
    const accrued = Math.max(0, sandbox.window.Prestaciones.days(addDays(period.anchor, 1), period.periodEnd) * 15 / 365);
    const assigned = Math.min(accrued, remaining);
    taken.set(period, assigned);
    remaining -= assigned;
  }
  const engineInput = policy.prepare(overtimeData);
  const values = periods.map(period => sandbox.window.Prestaciones.calculate({
    ...engineInput,
    endDate: dateString(period.periodEnd),
    vacationLastPaid: dateString(period.anchor),
    vacationTaken: String(taken.get(period) || 0)
  }).values.vacaciones);
  return { periods: values, unassignedDays: remaining };
}
function consolidatedAmount(label) {
  const card = report.html.match(new RegExp(`<article class="result-item"><div><h4>${label}<\\/h4>[\\s\\S]*?<\\/div><strong>Q\\s*([\\d,]+\\.\\d{2})<\\/strong><\\/article>`));
  assert.ok(card, `falta el rubro consolidado ${label}`);
  return Number(card[1].replace(/,/g, ''));
}
const vacationTrace = privateVacationPeriodTotals();
const aguinaldoTrace = privateAnnualPeriodTotals('aguinaldo');
const bono14Trace = privateAnnualPeriodTotals('bono14');
assert.ok(report.reportData && Array.isArray(report.reportData.items), 'el resultado técnico conserva los rubros calculados y su detalle por período');
function tracedSubtotal(label) {
  const item = report.reportData.items.find(row => row.name === label);
  assert.ok(item, `falta el subtotal técnico ${label}`);
  assert.ok(Array.isArray(item.periodDetails), `${label} conserva sus períodos internos`);
  return item;
}
assert.equal(vacationTrace.periods.length, 6, 'el cálculo interno conserva los seis tramos comprendidos dentro de la ventana de cinco años');
assert.equal(aguinaldoTrace.length, 26, 'el cálculo interno conserva todos los ciclos de Aguinaldo aplicables');
assert.equal(bono14Trace.length, 27, 'el cálculo interno conserva los ciclos propios del Bono 14');
assert.equal(tracedSubtotal('Vacaciones pendientes estimadas').periodDetails.length, 6);
assert.equal(tracedSubtotal('Aguinaldo pendiente estimado').periodDetails.length, 26);
assert.equal(tracedSubtotal('Bono 14 pendiente estimado').periodDetails.length, 27);
assert.deepEqual(Array.from(tracedSubtotal('Vacaciones pendientes estimadas').periodDetails, row => row.value), vacationTrace.periods);
assert.deepEqual(Array.from(tracedSubtotal('Aguinaldo pendiente estimado').periodDetails, row => row.value), aguinaldoTrace);
assert.deepEqual(Array.from(tracedSubtotal('Bono 14 pendiente estimado').periodDetails, row => row.value), bono14Trace);
assert.equal(consolidatedAmount('Vacaciones pendientes estimadas'), Number(vacationTrace.periods.reduce((sum, amount) => sum + amount, 0).toFixed(2)), 'el subtotal de vacaciones coincide con sus períodos calculados');
assert.equal(consolidatedAmount('Aguinaldo pendiente estimado'), Number(aguinaldoTrace.reduce((sum, amount) => sum + amount, 0).toFixed(2)), 'el subtotal de Aguinaldo coincide con sus períodos calculados');
assert.equal(consolidatedAmount('Bono 14 pendiente estimado'), Number(bono14Trace.reduce((sum, amount) => sum + amount, 0).toFixed(2)), 'el subtotal de Bono 14 coincide con sus períodos calculados');
assert.equal(Number(report.reportData.sum.toFixed(2)), displayedTotal, 'el total técnico coincide con el importe mostrado');

const minimumReferenceCase = runCalculator({
  ...base,
  startDate: '2026-01-01',
  endDate: '2026-05-10',
  ordinarySalary: '300',
  vacationStatus: 'no',
  aguinaldoStatus: 'yes',
  bono14Status: 'yes',
  economicAdvantages: 'no',
  overtimeStatus: 'no'
});
assert.doesNotMatch(minimumReferenceCase.html, /Advertencias sobre tu estimación|Referencia mínima|Historial salarial/);
assert.match(minimumReferenceCase.html, /Indemnización/, 'se conservan los cálculos aunque se retire el cuadro de comparación salarial');

const unknownOvertime = runCalculator({ ...privateLongCase, overtimeStatus: 'unknown' }).html;
assert.doesNotMatch(unknownOvertime, /Advertencias sobre tu estimación|review-notice/);
assert.match(unknownOvertime, /Indemnización/);
assert.match(unknownOvertime, /Aguinaldo pendiente estimado/);
assert.doesNotMatch(unknownOvertime, /Horas extraordinarias<\/h4>/);
const latestPaid = runCalculator({ ...privateLongCase, aguinaldoStatus: 'yes', bono14Status: 'yes' }).html;
assert.equal((latestPaid.match(/<h4>Aguinaldo pendiente estimado<\/h4>/g) || []).length, 1, 'Aguinaldo declarado pagado se limita al último período estimable');
assert.equal((latestPaid.match(/<h4>Bono 14 pendiente estimado<\/h4>/g) || []).length, 1, 'Bono 14 declarado pagado se limita a su último período propio');

const case1985 = {
  ...privateLongCase,
  startDate: '1985-01-01',
  endDate: '2026-05-10',
  ordinarySalary: '300',
  vacationStatus: 'no',
  aguinaldoStatus: 'no',
  bono14Status: 'no',
  economicAdvantages: 'yes',
  overtimeStatus: 'no'
};
const long1985 = runCalculator(case1985);
for (const title of ['Indemnización', 'Vacaciones pendientes estimadas', 'Aguinaldo pendiente estimado', 'Bono 14 pendiente estimado', 'Ventajas económicas']) {
  assert.ok(long1985.reportData.items.some(item => item.name === title), `el caso 1985 presenta ${title}`);
}
for (const [title, expected] of [
  ['Indemnización', 183030.13],
  ['Vacaciones pendientes estimadas', 748.36],
  ['Aguinaldo pendiente estimado', 12346.03],
  ['Bono 14 pendiente estimado', 12415.07],
  ['Ventajas económicas', 90]
]) {
  const item = long1985.reportData.items.find(row => row.name === title);
  assert.equal(Number(item.value.toFixed(2)), expected, `${title} conserva el importe esperado en el caso de referencia`);
}
assert.equal(long1985.reportData.items.find(item => item.name === 'Vacaciones pendientes estimadas').periodDetails.length, 6, 'vacaciones conserva los seis períodos dentro de la ventana de cinco años');
assert.equal(long1985.reportData.items.find(item => item.name === 'Aguinaldo pendiente estimado').periodDetails.length, 42, 'Aguinaldo usa sus ciclos del 1 de diciembre al 30 de noviembre desde 1985');
assert.equal(long1985.reportData.items.find(item => item.name === 'Bono 14 pendiente estimado').periodDetails.length, 42, 'Bono 14 usa sus ciclos del 1 de julio al 30 de junio desde 1985');
const long1985VacationPeriods = long1985.reportData.items.find(item => item.name === 'Vacaciones pendientes estimadas').periodDetails;
assert.equal(dateString(long1985VacationPeriods[0].periodStart), '2021-05-10', 'la ventana vacacional inicia exactamente cinco años antes de la terminación');
assert.equal(dateString(long1985VacationPeriods.at(-1).periodEnd), case1985.endDate);
const long1985AguinaldoPeriods = long1985.reportData.items.find(item => item.name === 'Aguinaldo pendiente estimado').periodDetails;
const long1985BonoPeriods = long1985.reportData.items.find(item => item.name === 'Bono 14 pendiente estimado').periodDetails;
assert.equal(dateString(long1985AguinaldoPeriods[0].cycleStart), '1984-12-01');
assert.equal(dateString(long1985AguinaldoPeriods.at(-1).cycleStart), '2025-12-01');
assert.equal(dateString(long1985AguinaldoPeriods.at(-1).actualEnd), case1985.endDate);
assert.equal(dateString(long1985BonoPeriods[0].cycleStart), '1984-07-01');
assert.equal(dateString(long1985BonoPeriods.at(-1).cycleStart), '2025-07-01');
assert.equal(dateString(long1985BonoPeriods.at(-1).actualEnd), case1985.endDate);
assert.match(long1985.html, /supuesto operativo de cero días gozados/);
assert.match(long1985.html, /supuesto operativo de falta de pago/);
assert.equal((long1985.html.match(/<h4>Vacaciones pendientes estimadas<\/h4>/g) || []).length, 1);
assert.equal((long1985.html.match(/<h4>Aguinaldo pendiente estimado<\/h4>/g) || []).length, 1);
assert.equal((long1985.html.match(/<h4>Bono 14 pendiente estimado<\/h4>/g) || []).length, 1);
assert.doesNotMatch(long1985.html, /(?:Vacaciones|Aguinaldo|Bono 14) · 20\d{2}-\d{2}-\d{2}/);
assert.equal(long1985.reportData.items.find(item => item.name === 'Ventajas económicas').value, 90, 'Q90 se obtiene de Q300 × 30% con el campo de ventajas afirmativo');
assert.equal((long1985.html.match(/<h4>Ventajas económicas<\/h4>/g) || []).length, 1, 'ventajas económicas se presenta una sola vez en el informe');
const withoutAdvantages = runCalculator({ ...case1985, economicAdvantages: 'no' });
assert.deepEqual(
  Array.from(long1985.reportData.items).filter(item => item.name !== 'Ventajas económicas').map(item => item.value),
  Array.from(withoutAdvantages.reportData.items).map(item => item.value),
  'Q90 de ventajas económicas no altera los importes de otros rubros'
);
const long1985Amounts = [...long1985.html.matchAll(/<article class="result-item">[\s\S]*?<strong>Q\s*([\d,]+\.\d{2})<\/strong><\/article>/g)].map(match => Number(match[1].replace(/,/g, '')));
const long1985DisplayedTotal = Number(long1985.html.match(/<div class="guided-total">[\s\S]*?<strong>Q\s*([\d,]+\.\d{2})<\/strong>/)[1].replace(/,/g, ''));
assert.equal(long1985DisplayedTotal, Number(long1985Amounts.reduce((sum, amount) => sum + amount, 0).toFixed(2)), 'el total 1985 suma exactamente los rubros visibles');
assert.equal(long1985DisplayedTotal, 208629.59, 'el total orientativo del caso de referencia coincide con los importes esperados');
const salaryMissingReport = runCalculator({ ...privateLongCase, ordinarySalary: '' });
assert.match(salaryMissingReport.html, /Salario ordinario reportado: <strong>No informado<\/strong>/);
assert.doesNotMatch(salaryMissingReport.html, /Advertencias sobre tu estimación|review-notice|No se pueden estimar montos que dependan de ese dato/);
assert.doesNotMatch(salaryMissingReport.html, /<div class="guided-total">/, 'si falta el salario, no se fabrica una suma ni se interrumpe el informe');

for (const [aguinaldoStatus, bono14Status, expectedAguinaldo, expectedBono] of [
  ['yes', 'no', 1, 27], ['no', 'yes', 26, 1], ['no', 'no', 26, 27]
]) {
  const independent = runCalculator({ ...privateLongCase, aguinaldoStatus, bono14Status });
  const aguinaldo = independent.reportData.items.find(item => item.name === 'Aguinaldo pendiente estimado');
  const bono14 = independent.reportData.items.find(item => item.name === 'Bono 14 pendiente estimado');
  assert.equal(aguinaldo.periodDetails.length, expectedAguinaldo, `Aguinaldo ${aguinaldoStatus} aplica solo su regla de períodos`);
  assert.equal(bono14.periodDetails.length, expectedBono, `Bono 14 ${bono14Status} aplica solo su regla de períodos`);
}

const vacation10 = runCalculator({ ...privateLongCase, vacationStatus: 'yes', vacationTaken: '10' });
const vacation10Item = vacation10.reportData.items.find(item => item.name === 'Vacaciones pendientes estimadas');
assert.ok(vacation10Item.description.includes('10.00 gozados'), 'los diez días declarados se explican en el resultado consolidado');
assert.ok(vacation10Item.description.includes('últimos cinco años'));

process.stdout.write('PASS: V2.3.3 conserva consolidación, independencia de pagos y ventanas históricas; verifica Caso A, navegación, retroceso, Reiniciar y suma.\n');
process.stdout.write(`Caso A (1985-01-01 a 2026-05-10; salario de prueba Q300; ventajas Sí): ${Array.from(long1985.reportData.items).map(item => `${item.name} Q${item.value.toFixed(2)}`).join('; ')}. Períodos: vacaciones 6; Aguinaldo 42; Bono 14 42.\n`);
process.stdout.write('Casos B–F: componentes salariales No mantienen los cálculos habilitados; pagos anuales independientes; 10 días disfrutados descontados dentro de cinco años; controles sin opción de incertidumbre; total igual a suma visible.\n');
