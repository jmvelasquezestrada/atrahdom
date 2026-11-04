const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, Date, Intl };
vm.createContext(sandbox);

const salarySource = fs.readFileSync(path.join(root, 'data/salarios-minimos.js'), 'utf8');
vm.runInContext(salarySource, sandbox, { filename: 'data/salarios-minimos.js' });
sandbox.obtenerSalarioMinimo = sandbox.window.obtenerSalarioMinimo;
const calculatorSource = fs.readFileSync(path.join(root, 'js/prestaciones.js'), 'utf8');
vm.runInContext(calculatorSource, sandbox, { filename: 'js/prestaciones.js' });

const result = sandbox.window.Prestaciones.calculate({
  startDate: '2024-12-09',
  endDate: '2026-07-31',
  vacationLastPaid: '2025-12-09',
  vacationTaken: '0',
  ordinarySalary: '5900',
  extraordinarySalary: '0',
  commissions: '0',
  activity: 'noAgricola',
  circumscription: 'ce1',
  reason: 'renuncia',
  shift: 'diurna',
  adjustments: [],
  economicAdvantages: 'no',
  bonusStatus: 'recibida',
  bonusPendingDays: '0',
  unpaidOvertime: '0',
});

assert.equal(result.vacation.periodDays, 233, 'el período de referencia debe ser 233 días');
assert.ok(Math.abs(result.vacation.generated - 9.57534) < 0.00001, 'los días proporcionales deben ser 9.57534');
assert.equal(result.values.vacaciones, 1883.15, 'el resultado de referencia debe ser Q1,883.15');

process.stdout.write('PASS: regresión de vacaciones V.2 (233 días; 9.57534 días; Q1,883.15)\n');
