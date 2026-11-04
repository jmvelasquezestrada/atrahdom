(function () {
  'use strict';

  function prepare(data) {
    return {
      startDate: data.startDate,
      endDate: data.endDate,
      ordinarySalary: data.salaryStatus === 'known' ? data.ordinarySalary : '0',
      commissions: data.commissionsStatus === 'si' ? data.commissions : '0',
      extraordinarySalary: data.extraordinaryStatus === 'si' ? data.extraordinarySalary : '0',
      activity: data.activity,
      circumscription: data.circumscription,
      sector: 'privado',
      reason: data.reason,
      shift: data.overtimeStatus === 'yes' ? data.overtimeShift : 'diurna',
      vacationTaken: data.vacationStatus === 'yes' ? data.vacationTaken : '0',
      vacationLastPaid: '',
      aguinaldoLastPaid: '',
      bono14LastPaid: '',
      lastSalaryPaid: '',
      unpaidOvertime: data.overtimeStatus === 'yes' ? data.overtimeHours : '0',
      economicAdvantages: data.economicAdvantages === 'yes' ? 'si' : data.economicAdvantages === 'no' ? 'no' : 'unknown',
      bonusStatus: 'unknown',
      bonusPendingDays: '0',
      adjustments: []
    };
  }

  function assess(data) {
    const salaryKnown = data.salaryStatus === 'known';
    const commissionsKnown = ['si', 'no'].includes(data.commissionsStatus);
    const extraordinaryKnown = ['si', 'no'].includes(data.extraordinaryStatus);
    const indemnityBaseKnown = salaryKnown && commissionsKnown;
    const baseKnown = indemnityBaseKnown;
    const vacationSalaryKnown = salaryKnown && commissionsKnown && extraordinaryKnown;
    const aguinaldoSalaryKnown = salaryKnown && commissionsKnown && extraordinaryKnown;
    const bono14SalaryKnown = salaryKnown && commissionsKnown && extraordinaryKnown;
    const overtimeShiftKnown = ['diurna', 'nocturna', 'mixta'].includes(data.overtimeShift);
    const overtimeHours = Number(data.overtimeHours);

    return {
      salaryKnown,
      commissionsKnown,
      extraordinaryKnown,
      baseKnown: indemnityBaseKnown,
      vacationSalaryKnown,
      aguinaldoSalaryKnown,
      bono14SalaryKnown,
      vacationReady: vacationSalaryKnown && ['yes', 'no'].includes(data.vacationStatus),
      aguinaldoReady: aguinaldoSalaryKnown && ['yes', 'no'].includes(data.aguinaldoStatus),
      bono14Ready: bono14SalaryKnown && ['yes', 'no'].includes(data.bono14Status),
      advantagesReady: baseKnown && data.economicAdvantages !== 'unknown',
      indemnityReady: indemnityBaseKnown && data.reason === 'despido_injustificado',
      overtimeAmountReady: baseKnown && data.overtimeStatus === 'yes' && overtimeShiftKnown && Number.isFinite(overtimeHours) && overtimeHours > 0,
      bonusPendingAmountReady: false,
      engineInput: prepare(data)
    };
  }

  window.CalculadoraV22Policy = { prepare, assess };
})();
