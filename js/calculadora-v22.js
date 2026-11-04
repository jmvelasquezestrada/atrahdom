(function () {
  'use strict';

  const form = document.querySelector('#calculator-form');
  const steps = [...form.querySelectorAll('.wizard-step')];
  const flow = ['work', 'salary', 'termination', 'benefits', 'payments', 'summary', 'result'];
  const progress = document.querySelector('#wizard-progress');
  const actions = document.querySelector('#wizard-actions');
  const errors = document.querySelector('#form-errors');
  const summary = document.querySelector('#summary-content');
  const results = document.querySelector('#results');
  const helpTitle = document.querySelector('#help-title');
  const helpWhat = document.querySelector('#help-what');
  const helpWhy = document.querySelector('#help-why');
  const helpUnknown = document.querySelector('#help-unknown');
  const prepareReportButton = document.querySelector('#wizard-prepare-report');
  const nextButton = document.querySelector('#wizard-next');
  let currentStep = 'work';

  const money = value => new Intl.NumberFormat('es-GT', {
    style: 'currency', currency: 'GTQ', minimumFractionDigits: 2
  }).format(value).replace('GTQ', 'Q');
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const checked = name => form.querySelector(`[name="${name}"]:checked`)?.value || '';
  const values = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    data.salaryStatus = String(data.ordinarySalary || '').trim() ? 'known' : 'unknown';
    return data;
  };
  const choiceText = { yes: 'Sí', no: 'No', unknown: 'No lo recuerdo' };
  const labels = {
    work: 'Tu trabajo', salary: 'Tu salario', termination: 'Cómo terminó',
    benefits: 'Vacaciones y pagos anuales', payments: 'Otros pagos y derechos',
    summary: 'Revisión de tus respuestas'
  };

  const help = {
    work: ['Tu trabajo', 'La actividad, el departamento y la fecha en que empezaste a trabajar allí.', 'La actividad y el departamento permiten ubicar la referencia salarial; la fecha de inicio determina el tiempo de servicio y los períodos de cálculo.', 'La calculadora está diseñada para relaciones del sector privado regidas por el Código de Trabajo.'],
    salary: ['Tu salario mensual', 'El monto habitual que recibías por tu trabajo, antes de descuentos.', 'Comisiones y otros pagos pueden cambiar algunas prestaciones.', 'No se reemplazará un monto desconocido por uno inventado. Los rubros afectados quedarán para revisión.'],
    termination: ['Fin de la relación laboral', 'El motivo y el último día que trabajaste.', 'La fecha permite ubicar el tiempo de servicio y los períodos que se revisan.', 'La opción elegida orienta la estimación, pero no resuelve legalmente tu caso.'],
    benefits: ['Vacaciones y pagos anuales', 'Vacaciones, Aguinaldo y Bono 14.', 'Cada concepto tiene una referencia propia; Aguinaldo y Bono 14 no comparten el mismo período.', 'El rubro que dependa de un dato desconocido se marcará para revisión, sin asignarle Q0.'],
    payments: ['Otros pagos y derechos', 'Ventajas económicas y horas extra.', 'Algunos datos solo permiten señalar un asunto para revisar.', 'No calcularemos un monto si faltan los datos que usa el motor.'],
    summary: ['Revisá tus respuestas', 'La información que ingresaste, agrupada por tema.', 'Podés corregirla antes de generar el informe.', 'Los datos que no conocés se mostrarán como pendientes de revisión.'],
    result: ['Tu informe orientativo', 'Los montos que pudieron calcularse y los asuntos pendientes.', 'La suma incluye solo rubros con monto estimado.', 'La información pendiente puede cambiar el resultado.']
  };
  const fieldHelp = {
    ordinarySalary: ['Salario ordinario mensual', 'Tu salario habitual antes de descuentos, sin comisiones ni bonificación incentivo.', 'Es una referencia para estimar las prestaciones.', 'Si no recordás el monto, marcá la casilla; las prestaciones que dependan de él no se calcularán.'],
    commissionsStatus: ['Comisiones', 'Pagos que recibías además del salario ordinario por ventas, metas u otras tareas.', 'Cuando respondés Sí, el motor incorpora el promedio indicado en la base y el promedio salarial.', 'Si no podés confirmar que recibías comisiones, seleccioná No; la estimación usará los componentes salariales que declaraste.'],
    extraordinaryStatus: ['Otros pagos salariales', 'Pagos adicionales que recibías por tu trabajo.', 'Cuando respondés Sí, el promedio indicado puede formar parte de vacaciones, Aguinaldo y Bono 14.', 'Si no podés confirmar que recibías otros pagos, seleccioná No; la estimación usará los componentes salariales que declaraste.'],
    vacationStatus: ['Vacaciones', 'Si gozaste días de vacaciones durante los últimos cinco años.', 'Los días gozados se restan del saldo estimado dentro de ese período.', 'Si no podés confirmar que gozaste vacaciones, seleccioná No; el cálculo asumirá cero días gozados.'],
    aguinaldoStatus: ['Aguinaldo', 'Si recibiste el Aguinaldo correspondiente al período anual más reciente.', 'La referencia va del 1 de diciembre al 30 de noviembre.', 'Si no podés confirmar el pago, seleccioná No; se estimará bajo el supuesto operativo de falta de pago.'],
    bono14Status: ['Bono 14', 'Si recibiste el Bono 14 correspondiente al período anual más reciente.', 'Su referencia va del 1 de julio al 30 de junio.', 'Si no podés confirmar el pago, seleccioná No; se estimará bajo el supuesto operativo de falta de pago.'],
    economicAdvantages: ['Ventajas económicas', 'Beneficios vinculados con el trabajo, como vivienda o alimentos.', 'La respuesta puede cambiar este concepto en la estimación.', 'Si no podés confirmar que las recibías, seleccioná No.'],
    overtimeStatus: ['Horas extra', 'Si trabajaste horas extraordinarias que no te pagaron.', 'Para calcular un monto se necesitan las horas, la jornada y el salario base.', 'Si no podés confirmar que quedaron horas pendientes, seleccioná No.'],
    overtimeHours: ['Horas extraordinarias no pagadas', 'La cantidad de horas que quedaron pendientes de pago.', 'El motor actual multiplica la tarifa ordinaria por hora y media por las horas ingresadas.', 'No se estimará el monto si falta la jornada o la base salarial.'],
    overtimeShift: ['Tipo de jornada', 'La jornada habitual que determina las horas de referencia por día.', 'El motor actual usa 8 horas para diurna, 6 para nocturna y 7 para mixta.', 'Si no conocés la jornada, el concepto quedará para revisión.']
  };

  function updateHelp(step = currentStep, name = '') {
    const item = fieldHelp[name] || help[step] || help.work;
    helpTitle.textContent = item[0];
    helpWhat.textContent = item[1];
    helpWhy.textContent = item[2];
    helpUnknown.textContent = item[3];
  }

  function updateConditional() {
    form.querySelectorAll('[data-show-when]').forEach(element => {
      const [name, value] = element.dataset.showWhen.split(':');
      const answer = form.elements.namedItem(name);
      const selected = answer?.type === 'radio' ? checked(name) : answer?.value;
      element.hidden = selected !== value;
    });
  }

  function updateSalaryControl() {
    const input = form.elements.namedItem('ordinarySalary');
    input.disabled = false;
    input.required = false;
  }

  function showStep(step) {
    currentStep = step;
    steps.forEach(element => { element.hidden = element.dataset.step !== step; });
    const index = flow.indexOf(step);
    const capturing = step !== 'result';
    actions.hidden = !capturing;
    progress.hidden = !capturing;
    if (capturing) {
      const position = index + 1;
      progress.innerHTML = `<span>Paso ${position} de 6 · ${escape(labels[step])}</span><progress aria-label="Progreso del cálculo" max="6" value="${position}"></progress>`;
      document.querySelector('#wizard-back').disabled = index === 0;
      document.querySelector('#wizard-review').hidden = step !== 'payments';
      prepareReportButton.hidden = step !== 'summary';
      nextButton.textContent = step === 'summary' ? 'Reiniciar' : 'Continuar';
      nextButton.className = step === 'summary' ? 'secondary-action' : 'primary';
      prepareReportButton.className = step === 'summary' ? 'primary' : 'secondary-action';
    }
    errors.textContent = '';
    updateConditional();
    updateHelp(step);
    document.querySelector('#calculadora').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(step) {
    const data = values();
    const required = (name, label) => {
      if (!String(data[name] || '').trim()) {
        errors.textContent = `Indicá ${label} para continuar.`;
        form.querySelector(`[name="${name}"]`)?.focus();
        return false;
      }
      return true;
    };
    if (step === 'work') {
      for (const [name, label] of [['activity', 'la actividad'], ['circumscription', 'el departamento'], ['startDate', 'la fecha de inicio']]) {
        if (!required(name, label)) return false;
      }
    }
    if (step === 'salary') {
      if (data.salaryStatus !== 'unknown' && !required('ordinarySalary', 'el salario ordinario mensual')) return false;
      if (data.salaryStatus === 'known' && Number(data.ordinarySalary) < 0) {
        errors.textContent = 'El salario no puede ser negativo.'; return false;
      }
      for (const [name, label] of [['commissionsStatus', 'si recibías comisiones'], ['extraordinaryStatus', 'si recibías otros pagos']]) {
        if (!required(name, label)) return false;
      }
      if (data.commissionsStatus === 'si' && !required('commissions', 'el promedio mensual de comisiones')) return false;
      if (data.extraordinaryStatus === 'si' && !required('extraordinarySalary', 'el promedio mensual de otros pagos')) return false;
      if (Number(data.commissions) < 0 || Number(data.extraordinarySalary) < 0) {
        errors.textContent = 'Los montos no pueden ser negativos.'; return false;
      }
    }
    if (step === 'termination') {
      for (const [name, label] of [['reason', 'el motivo de terminación'], ['endDate', 'el último día de trabajo']]) {
        if (!required(name, label)) return false;
      }
      if (data.endDate < data.startDate) { errors.textContent = 'La terminación no puede ser anterior al inicio del trabajo.'; return false; }
    }
    if (step === 'benefits') {
      for (const [name, label] of [['vacationStatus', 'la respuesta sobre vacaciones'], ['aguinaldoStatus', 'la respuesta sobre Aguinaldo'], ['bono14Status', 'la respuesta sobre Bono 14']]) {
        if (!checked(name)) { errors.textContent = `Indicá ${label} para continuar.`; form.querySelector(`[name="${name}"]`)?.focus(); return false; }
      }
      if (checked('vacationStatus') === 'yes' && !required('vacationTaken', 'los días de vacaciones gozados')) return false;
      if (Number(data.vacationTaken) < 0) { errors.textContent = 'Los días no pueden ser negativos.'; return false; }
    }
    if (step === 'payments') {
      for (const name of ['economicAdvantages', 'overtimeStatus']) {
        if (!checked(name)) { errors.textContent = 'Respondé las preguntas sobre otros pagos para continuar.'; form.querySelector(`[name="${name}"]`)?.focus(); return false; }
      }
      if (checked('overtimeStatus') === 'yes') {
        if (!required('overtimeHours', 'la cantidad de horas extraordinarias')) return false;
        if (Number(data.overtimeHours) <= 0) { errors.textContent = 'Ingresá una cantidad de horas mayor que cero.'; form.elements.namedItem('overtimeHours').focus(); return false; }
        if (!required('overtimeShift', 'el tipo de jornada')) return false;
      }
    }
    return true;
  }

  function answerLabel(value) { return choiceText[value] || value || 'Sin dato'; }

  function summaryRows() {
    const d = values();
    const records = [
      ['Tu trabajo', [['Actividad', ({ agricola: 'Agrícola', noAgricola: 'No agrícola', maquila: 'Exportación y maquila' })[d.activity]], ['Lugar', d.circumscription === 'ce1' ? 'CE1 – Departamento de Guatemala' : 'CE2 – Otro departamento'], ['Inicio', d.startDate]], 'work'],
      ['Tu salario', [['Salario ordinario mensual', d.salaryStatus === 'unknown' ? 'Monto no ingresado' : money(Number(d.ordinarySalary))], ['Comisiones', d.commissionsStatus === 'si' ? money(Number(d.commissions)) : answerLabel(d.commissionsStatus)], ['Otros pagos salariales', d.extraordinaryStatus === 'si' ? money(Number(d.extraordinarySalary)) : answerLabel(d.extraordinaryStatus)]], 'salary'],
      ['Terminación', [['Motivo', ({ despido_injustificado: 'Despido sin causa explicada', despido_justificado: 'Despido con causa indicada', renuncia: 'Renuncia', mutuo_acuerdo: 'Acuerdo mutuo' })[d.reason]], ['Último día', d.endDate]], 'termination'],
      ['Vacaciones y pagos anuales', [['Vacaciones', answerLabel(d.vacationStatus)], ['Días gozados', d.vacationStatus === 'yes' ? `${d.vacationTaken} días` : d.vacationStatus === 'no' ? 'Ninguno' : 'No lo recuerdo'], ['Aguinaldo', answerLabel(d.aguinaldoStatus)], ['Bono 14', answerLabel(d.bono14Status)]], 'benefits'],
      ['Otros pagos y derechos', [['Ventajas económicas', answerLabel(d.economicAdvantages)], ['Horas extra no pagadas', d.overtimeStatus === 'yes' ? `${d.overtimeHours} horas · ${{ diurna: 'diurna', nocturna: 'nocturna', mixta: 'mixta' }[d.overtimeShift] || 'jornada sin dato'}` : answerLabel(d.overtimeStatus)]], 'payments']
    ];
    summary.innerHTML = records.map(([title, rows, step]) => `<section class="summary-group"><div class="summary-group-head"><h3>${escape(title)}</h3><button type="button" data-edit-step="${step}">Editar</button></div>${rows.map(([label, value]) => `<div class="summary-item"><span>${escape(label)}</span><strong>${escape(value || 'Sin dato')}</strong></div>`).join('')}</section>`).join('');
  }

  function dateText(date) {
    const d = new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function missingSalaryComponents(data) {
    const missing = [];
    if (data.salaryStatus !== 'known') missing.push('el salario ordinario');
    if (!['si', 'no'].includes(data.commissionsStatus)) missing.push('si recibía comisiones');
    if (!['si', 'no'].includes(data.extraordinaryStatus)) missing.push('si recibía otros pagos salariales');
    return missing.join(', ');
  }

  function dateValue(value) { return new Date(`${value}T00:00:00`); }
  function addDay(date, amount = 1) { const result = new Date(date); result.setDate(result.getDate() + amount); return result; }

  function annualPeriods(startValue, endValue, kind) {
    const employmentStart = dateValue(startValue);
    const termination = dateValue(endValue);
    const month = kind === 'aguinaldo' ? 11 : 6;
    const cycleYear = employmentStart.getMonth() >= month ? employmentStart.getFullYear() : employmentStart.getFullYear() - 1;
    const periods = [];
    for (let year = cycleYear; ; year += 1) {
      const cycleStart = new Date(year, month, 1);
      if (cycleStart > termination) break;
      const cycleEnd = kind === 'aguinaldo' ? new Date(year + 1, 11, 0) : new Date(year + 1, 6, 0);
      const actualStart = employmentStart > cycleStart ? employmentStart : cycleStart;
      const actualEnd = termination < cycleEnd ? termination : cycleEnd;
      if (actualStart <= actualEnd) periods.push({ cycleStart, cycleEnd, actualStart, actualEnd });
    }
    return periods;
  }

  function annualItems(data, engineInput, kind, status) {
    if (status === 'unknown') return [];
    let periods = annualPeriods(data.startDate, data.endDate, kind);
    if (status === 'yes') periods = periods.slice(-1);
    const key = kind === 'aguinaldo' ? 'aguinaldo' : 'bono14';
    const label = kind === 'aguinaldo' ? 'Aguinaldo' : 'Bono 14';
    return periods.map(period => {
      const servedDays = window.Prestaciones.days(period.actualStart, period.actualEnd) + 1;
      const periodInput = {
        ...engineInput,
        endDate: dateText(period.actualEnd),
        [kind === 'aguinaldo' ? 'aguinaldoLastPaid' : 'bono14LastPaid']: dateText(period.actualStart)
      };
      const result = window.Prestaciones.calculate(periodInput);
      const days = kind === 'aguinaldo' ? result.aguinaldoDays : result.bono14Days;
      const cycleLabel = kind === 'aguinaldo' ? '1 de diciembre a 30 de noviembre' : '1 de julio a 30 de junio';
      const amount = result.values[key];
      const assumption = status === 'no' ? 'Período incluido conforme al supuesto orientativo de falta de pago desde el inicio de la relación.' : 'Se estimó únicamente el último período anual disponible.';
      return {
        name: `${label} · ${dateText(period.cycleStart)}–${dateText(period.cycleEnd)}`,
        value: amount,
        cycleStart: period.cycleStart,
        cycleEnd: period.cycleEnd,
        actualStart: period.actualStart,
        actualEnd: period.actualEnd,
        description: `Ciclo ${cycleLabel}; tramo computado ${dateText(period.actualStart)} a ${dateText(period.actualEnd)}; base salarial mensual: ${money(result.average)}; ${days} días considerados; monto: ${money(amount)}. ${assumption}`
      };
    });
  }

  function vacationPeriods(startValue, endValue) {
    const start = dateValue(startValue);
    const end = dateValue(endValue);
    const cutoff = new Date(end.getFullYear() - 5, end.getMonth(), end.getDate());
    const periods = [];
    let anchor = addDay(start, -1);
    let nextAnniversary = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    while (nextAnniversary <= end) {
      if (nextAnniversary >= cutoff) {
        const allowedStart = anchor < addDay(cutoff, -1) ? addDay(cutoff, -1) : anchor;
        periods.push({ anchor: allowedStart, periodEnd: nextAnniversary, partial: allowedStart.getTime() !== anchor.getTime() });
      }
      anchor = nextAnniversary;
      nextAnniversary = new Date(nextAnniversary.getFullYear() + 1, start.getMonth(), start.getDate());
    }
    if (end >= cutoff && addDay(anchor) <= end) periods.push({ anchor, periodEnd: end, partial: true });
    return periods;
  }

  function vacationItems(data, engineInput, status, daysTaken) {
    if (status === 'unknown') return { items: [], unassigned: 0, periods: [] };
    const periods = vacationPeriods(data.startDate, data.endDate);
    let remaining = status === 'yes' ? Math.max(0, Number(daysTaken) || 0) : 0;
    const allocations = new Map();
    for (const period of [...periods].reverse()) {
      const start = addDay(period.anchor);
      const accrualDays = window.Prestaciones.days(start, period.periodEnd);
      const accrued = Math.max(0, accrualDays * 15 / 365);
      const assigned = Math.min(accrued, remaining);
      allocations.set(period, assigned);
      remaining -= assigned;
    }
    const items = periods.map(period => {
      const input = {
        ...engineInput,
        endDate: dateText(period.periodEnd),
        vacationLastPaid: dateText(period.anchor),
        vacationTaken: String(allocations.get(period) || 0)
      };
      const result = window.Prestaciones.calculate(input);
      const vacation = result.vacation;
      return {
        name: `Vacaciones · ${dateText(addDay(period.anchor))}–${dateText(period.periodEnd)}`,
        value: result.values.vacaciones,
        periodStart: addDay(period.anchor),
        periodEnd: period.periodEnd,
        generatedDays: vacation.generated,
        takenDays: vacation.taken,
        pendingDays: vacation.pending,
        description: `El rubro considera únicamente períodos dentro de los últimos cinco años. Días acumulados: ${vacation.generated.toFixed(2)}; disfrutados asignados: ${vacation.taken.toFixed(2)}; pendientes: ${vacation.pending.toFixed(2)}. Base salarial mensual usada por el motor: ${money(result.average)}. ${period.partial ? 'Período parcial dentro del plazo de referencia.' : 'Período anual concluido.'}`
      };
    });
    return { items, unassigned: remaining, periods };
  }

  function consolidatePeriods(name, periodItems, description) {
    const applicable = periodItems.filter(item => typeof item.value === 'number' && Number.isFinite(item.value));
    if (!applicable.length) return null;
    const exactSubtotal = applicable.reduce((total, item) => total + item.value, 0);
    return {
      name,
      value: Number(exactSubtotal.toFixed(2)),
      description,
      // Keep the original engine results available for assertions and traceability.
      periodDetails: applicable
    };
  }

  function referencePanel(data, result) {
    const year = Number(data.endDate.slice(0, 4));
    const location = data.circumscription === 'ce1' ? 'CE1 – Departamento de Guatemala' : 'CE2 – Otro departamento';
    const region = year <= 2022 ? `Nacional (selección: ${location})` : location;
    const activity = ({ agricola: 'Agrícola', noAgricola: 'No agrícola', maquila: 'Exportación y maquila' })[data.activity];
    let minimum = '';
    const item = window.obtenerSalarioMinimo(year, data.activity, data.circumscription);
    if (item && year === 2026) {
      minimum = `<p>Salario mínimo ordinario de referencia: <strong>${money(item.monthly)}</strong></p><p>Bonificación incentivo: <strong>${money(item.bonus)}</strong></p><p>Total mensual de referencia: <strong>${money(item.total)}</strong></p>`;
    } else if (item) {
      minimum = `<p>La tabla integrada contiene la referencia mensual <strong>${money(item.total)}</strong>.</p><p class="field-note">La composición entre salario ordinario y bonificación incentivo de este año está pendiente de verificación; no se presenta como una comparación confirmada.</p>`;
    } else {
      minimum = '<p>No hay una referencia cargada para este período. No se sustituyó por otro año.</p>';
    }
    const salaryKnown = data.salaryStatus === 'known';
    const totalReference = salaryKnown ? money(Number(data.ordinarySalary) + 250) : 'No disponible';
    return `<section class="report-section"><h3>Referencia salarial mensual</h3><p>${escape(activity)} · ${escape(region)}</p><p>Salario ordinario reportado: <strong>${salaryKnown ? money(Number(data.ordinarySalary)) : 'No informado'}</strong></p><p>Bonificación incentivo de referencia: <strong>Q250.00</strong></p><p>Suma mensual de referencia: <strong>${totalReference}</strong></p><p class="field-note">La suma sirve para mostrar los componentes; no confirma cuánto recibiste ni determina el salario legal.</p>${minimum}</section>`;
  }

  function report() {
    const d = values();
    const year = Number(d.endDate.slice(0, 4));
    const warnings = [];
    const items = [];
    let result = null;
    const policy = window.CalculadoraV22Policy.assess(d);
    const salaryUnknown = !policy.salaryKnown;
    const commissionsUnknown = !policy.commissionsKnown;
    const extraordinaryUnknown = !policy.extraordinaryKnown;

    if (salaryUnknown) {
      warnings.push({ title: 'Salario ordinario', text: 'No se pueden estimar montos que dependan de ese dato. No se sustituyó por Q0.' });
    }
    if (commissionsUnknown) {
      warnings.push({ title: 'Comisiones', text: 'Algunos rubros dependen también de las comisiones, cuyo monto no se conoce.' });
    }
    if (extraordinaryUnknown) warnings.push({ title: 'Otros pagos salariales', text: 'No se confirmó si se recibían otros pagos salariales.' });

    if (!salaryUnknown) {
      result = window.Prestaciones.calculate(policy.engineInput);

      if (policy.indemnityReady) {
        items.push({ name: 'Indemnización', value: result.values.indemnizacion, description: `Estimación calculada con las fechas y el salario declarados; base salarial utilizada por el motor: ${money(result.base)}. Esta es una estimación orientativa calculada con base en las fechas y el salario declarados. La determinación de los períodos que podrían ser reclamables y de la indemnización que finalmente corresponda puede depender de las circunstancias del caso y de criterios judiciales. Esta herramienta no determina la prescripción ni sustituye una revisión legal.` });
      } else if (d.reason === 'despido_injustificado' && commissionsUnknown) {
        warnings.push({ title: 'Indemnización', text: 'Falta confirmar las comisiones que podrían formar parte de su base salarial; el monto no se estima.' });
      } else if (d.reason !== 'despido_injustificado') {
        warnings.push({ title: 'Indemnización', text: 'El motor actual no estima este concepto para el motivo indicado. Esto no determina tus derechos legales.' });
      }

      if (!policy.vacationSalaryKnown) {
        warnings.push({ title: 'Vacaciones: base salarial', text: `No se estima porque falta confirmar ${missingSalaryComponents(d)}; ese dato integra la base del rubro.` });
      } else if (d.vacationStatus === 'unknown') {
        warnings.push({ title: 'Vacaciones', text: 'No se conocen los días disfrutados, por lo que no se asigna un saldo ni un monto supuesto.' });
      } else {
        const vacation = vacationItems(d, policy.engineInput, d.vacationStatus, d.vacationTaken);
        if (vacation.items.length) {
          const first = vacation.items[0];
          const last = vacation.items[vacation.items.length - 1];
          const generatedDays = vacation.items.reduce((total, period) => total + period.generatedDays, 0);
          const takenDays = vacation.items.reduce((total, period) => total + period.takenDays, 0);
          const pendingDays = vacation.items.reduce((total, period) => total + period.pendingDays, 0);
          const noDaysAssumption = d.vacationStatus === 'no' ? 'La respuesta No se aplicó como supuesto operativo de cero días gozados; no determina una deuda definitiva.' : '';
          const periodDescription = `${vacation.items.length} períodos comprendidos entre ${dateText(first.periodStart)} y ${dateText(last.periodEnd)}, dentro del límite de los últimos cinco años. Se estiman ${generatedDays.toFixed(2)} días generados, ${takenDays.toFixed(2)} gozados y ${pendingDays.toFixed(2)} pendientes. Los días gozados se asignaron primero al período más reciente. ${noDaysAssumption} El historial de vacaciones puede cambiar esta estimación.`;
          const vacationSubtotal = consolidatePeriods('Vacaciones pendientes estimadas', vacation.items, periodDescription);
          if (vacationSubtotal) items.push(vacationSubtotal);
        }
        if (vacation.unassigned > 0) warnings.push({ title: 'Vacaciones disfrutadas', text: `${vacation.unassigned.toFixed(2)} días declarados no pudieron asignarse a los períodos incluidos; no se descontaron del cálculo.` });
        if (d.vacationStatus === 'yes') warnings.push({ title: 'Asignación de días disfrutados', text: `Como no se identificó el período de los ${d.vacationTaken} días declarados, se asignaron primero al período elegible más reciente y luego a los anteriores si fue necesario.` });
      }

      for (const [kind, name, status] of [['aguinaldo', 'Aguinaldo', d.aguinaldoStatus], ['bono14', 'Bono 14', d.bono14Status]]) {
        const salaryKnownForBenefit = kind === 'aguinaldo' ? policy.aguinaldoSalaryKnown : policy.bono14SalaryKnown;
        if (!salaryKnownForBenefit) warnings.push({ title: `${name}: base salarial`, text: `No se estima porque falta confirmar ${missingSalaryComponents(d)}; ese dato integra la base del rubro.` });
        else if (status === 'unknown') warnings.push({ title: `${name}: pago no confirmado`, text: 'No se estimó ningún período porque no se confirmó si la prestación fue recibida.' });
        else {
          const historical = annualItems(d, policy.engineInput, kind, status);
          if (historical.length) {
            const first = historical[0];
            const last = historical[historical.length - 1];
            const cycleLabel = kind === 'aguinaldo' ? '1 de diciembre a 30 de noviembre' : '1 de julio a 30 de junio';
            const periodRange = historical.length === 1
              ? `Se consideró el ciclo más reciente del ${cycleLabel}, con tramo computado del ${dateText(first.actualStart)} al ${dateText(first.actualEnd)}.`
              : `Se suman ${historical.length} ciclos del ${cycleLabel}, con tramos computados desde ${dateText(first.actualStart)} hasta ${dateText(last.actualEnd)}.`;
            const paymentAssumption = status === 'no' ? `La respuesta No se aplicó como supuesto operativo de falta de pago; no determina una deuda definitiva.` : 'La respuesta Sí confirma el período anual anterior; se estima el tramo del ciclo vigente hasta la terminación.';
            const subtotal = consolidatePeriods(`${name} pendiente estimado`, historical, `${periodRange} ${paymentAssumption} El cálculo utiliza la base salarial disponible para cada período; los cambios salariales históricos pueden modificar el resultado.`);
            if (subtotal) items.push(subtotal);
          }
          if (status === 'no') warnings.push({ title: `${name} histórico`, text: `La respuesta “No” se aplicó como supuesto orientativo de falta de pago desde el inicio (${d.startDate}) hasta la terminación. No es un hecho comprobado; los comprobantes pueden cambiar el total.` });
        }
      }

      if (d.economicAdvantages === 'yes') {
        if (commissionsUnknown) warnings.push({ title: 'Ventajas económicas', text: 'El monto depende también de las comisiones, que no se conocen.' });
        else items.push({ name: 'Ventajas económicas', value: result.values.ventajas, description: 'Estimación con el comportamiento actual del motor. La interpretación de la base jurídica sigue pendiente de revisión.' });
      } else if (d.economicAdvantages === 'unknown') {
        warnings.push({ title: 'Ventajas económicas', text: 'No se confirmó si se recibían; no se asigna monto ni se incluye en el total.' });
      }

    }

    if (d.overtimeStatus === 'yes') {
      if (policy.overtimeAmountReady && result) {
        const shiftHours = { diurna: 8, nocturna: 6, mixta: 7 }[d.overtimeShift];
        items.push({ name: 'Horas extraordinarias', value: result.values.horasExtra, description: `${d.overtimeHours} horas; jornada ${d.overtimeShift} (${shiftHours} horas de referencia diaria); base salarial del motor: ${money(result.base)}. Se conserva la fórmula vigente de horas extra.` });
      } else {
        const missing = !policy.salaryKnown ? 'Falta el salario ordinario para establecer la base.' : !policy.commissionsKnown ? 'Falta confirmar las comisiones que pueden integrar la base.' : 'Faltan datos requeridos por el motor para establecer la base, la cantidad de horas o la jornada.';
        warnings.push({ title: 'Horas extraordinarias', text: `${missing} No se asigna monto ni se incluye en el total.` });
      }
    } else if (d.overtimeStatus === 'unknown') {
      warnings.push({ title: 'Horas extraordinarias', text: 'No se confirmó si quedaron pendientes; no se asigna monto ni se incluye en el total.' });
    }

    const sum = items.reduce((total, item) => total + Math.round((item.value + Number.EPSILON) * 100), 0) / 100;
    let html = referencePanel(d, result);
    html += `<section class="report-section"><h3>Tu relación de trabajo</h3><p>Sector privado · ${escape(({ agricola: 'Agrícola', noAgricola: 'No agrícola', maquila: 'Exportación y maquila' })[d.activity])} · ${escape(d.circumscription === 'ce1' ? 'CE1 – Departamento de Guatemala' : 'CE2 – Otro departamento')}</p><p>${escape(d.startDate)} a ${escape(d.endDate)} · ${escape(({ despido_injustificado: 'Despido sin causa explicada', despido_justificado: 'Despido con causa indicada', renuncia: 'Renuncia', mutuo_acuerdo: 'Acuerdo mutuo' })[d.reason])}</p></section>`;
    html += '<section class="report-section results-section"><h3>Prestaciones estimadas</h3>';
    if (items.length) html += items.map(item => `<article class="result-item"><div><h4>${escape(item.name)}</h4><p>${escape(item.description)}</p></div><strong>${money(item.value)}</strong></article>`).join('');
    else html += '<p>No hay montos de prestaciones que puedan mostrarse con los datos confirmados.</p>';
    html += '</section>';
    if (items.length) html += `<div class="guided-total"><span>Suma orientativa de los rubros calculados</span><strong>${money(sum)}</strong></div>`;
    html += '<section class="report-legal"><p>Este informe es una estimación orientativa elaborada con la información proporcionada. No es una liquidación oficial ni una determinación legal vinculante. Los montos pueden variar según la documentación, las condiciones de trabajo y la revisión del caso.</p><a class="right-reference" href="/cendoc/codigo-de-trabajo-republica-de-guatemala/">Consultar el Código de Trabajo</a></section>';
    html += '<section class="report-recommendation"><p>Si consideras que quedaron salarios pendientes o que recibiste menos del salario mínimo que correspondía, te recomendamos buscar asesoría laboral con ATRAHDOM para revisar tu caso.</p></section>';
    html += '<section class="contact"><h3>¿Necesitás orientación laboral?</h3><a class="contact-btn" href="/solicita-apoyo/">Solicitar orientación</a></section>';
    results.innerHTML = html;
    return { items, sum };
  }

  document.querySelector('#wizard-next').addEventListener('click', () => {
    if (currentStep === 'summary') {
      form.reset();
      summary.innerHTML = '';
      results.innerHTML = '';
      updateConditional();
      updateSalaryControl();
      showStep('work');
      return;
    }
    if (!validateStep(currentStep)) return;
    const next = flow[flow.indexOf(currentStep) + 1];
    if (next === 'summary') summaryRows();
    showStep(next);
  });
  prepareReportButton.addEventListener('click', () => {
    if (currentStep !== 'summary') return;
    const reportData = report();
    showStep('result');
    return reportData;
  });
  document.querySelector('#wizard-back').addEventListener('click', () => {
    const index = flow.indexOf(currentStep);
    if (index > 0) showStep(flow[index - 1]);
  });
  document.querySelector('#wizard-review').addEventListener('click', () => {
    if (currentStep === 'payments' && validateStep('payments')) { summaryRows(); showStep('summary'); }
  });
  form.addEventListener('change', event => {
    updateConditional();
    updateSalaryControl();
    if (event.target.name) updateHelp(currentStep, event.target.name);
  });
  form.addEventListener('focusin', event => {
    if (event.target.name) updateHelp(currentStep, event.target.name);
  });
  form.addEventListener('click', event => {
    const button = event.target.closest('[data-edit-step]');
    if (button) showStep(button.dataset.editStep);
  });
  document.querySelector('#print-report').addEventListener('click', () => window.print());
  form.addEventListener('submit', event => event.preventDefault());
  updateConditional();
  updateSalaryControl();
  showStep('work');
})();
