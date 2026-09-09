(function(){
  const DAY=86400000, date=s=>s?new Date(`${s}T00:00:00`):null, days=(a,b)=>Math.max(0,Math.round((b-a)/DAY));
  const clampDate=(d,min,max)=>new Date(Math.min(Math.max(d,min),max));
  function vacationPeriodStart(start,end,lastPaid){
    if(lastPaid){const paid=date(lastPaid);return new Date(paid.getTime()+DAY);}
    // Si no se conoce el último pago, se toma el aniversario laboral más
    // reciente y el período pendiente comienza al día siguiente.
    let anniversary=new Date(end.getFullYear(),start.getMonth(),start.getDate());
    if(anniversary>end) anniversary=new Date(end.getFullYear()-1,start.getMonth(),start.getDate());
    return anniversary>start?new Date(anniversary.getTime()+DAY):start;
  }
  const periodStart=(end,month,day,lastPaid,start)=>{const current=new Date(end.getFullYear(),month,day);const base=end>=current?current:new Date(end.getFullYear()-1,month,day);return lastPaid?date(lastPaid):new Date(Math.max(base,start));};
  const bono14Start=(end,lastPaid,start)=>{if(lastPaid)return date(lastPaid);const current=new Date(end.getFullYear(),5,30);const base=end>=current?current:new Date(end.getFullYear()-1,5,30);return new Date(Math.max(base,start));};
  function calcularAntiguedad(start,end){const d=days(start,end), y=Math.floor(d/365), remainder=d-y*365, m=Math.floor(remainder/30);return {days:d,label:`${y} años, ${m} meses y ${remainder-m*30} días`};}
  function calcularIndemnizacion(base,worked,reason){return reason==='despido_injustificado'?base*14/12/365*worked:null;}
  function proportional(base,start,end){return base/365*days(start,end);}
  function calcularVacaciones(base,periodStartDate,end,annual,taken){const periodDays=days(periodStartDate,end);const generated=annual*periodDays/365;const pending=Math.max(0,generated-taken);const amount=Number((base/30*pending).toFixed(2));return {periodStart:periodStartDate,periodDays,generated,pending,amount};}
  function calcularHorasExtraordinarias(base,shift,hours){const shiftHours={diurna:8,nocturna:6,mixta:7}[shift];return (base/30/shiftHours)*1.5*hours;}
  function calculate(d){
    const start=date(d.startDate),end=date(d.endDate); const tenure=calcularAntiguedad(start,end); const minimum=obtenerSalarioMinimo(end.getFullYear(),d.activity,d.circumscription);
    const ordinary=+d.ordinarySalary, commissions=+d.commissions||0, extraordinary=+d.extraordinarySalary||0;
    const ordinaryCommissions=ordinary+commissions, average=ordinaryCommissions+extraordinary; const base=Math.max(ordinaryCommissions,minimum?.monthly||0);
    const aguinaldoStart=periodStart(end,11,1,d.aguinaldoLastPaid,start), bonoStart=bono14Start(end,d.bono14LastPaid,start), vacationStart=vacationPeriodStart(start,end,d.vacationLastPaid);
    // Sin una fecha de último período pagado no existe un período parcial
    // identificado; para ese caso de referencia los días gozados son 0.
    const vacationTaken=Math.max(0,+d.vacationTaken||0);
    // Art. 134: salario promedio ÷ 30 × 15 ÷ 365 × días laborados.
    const vacation=calcularVacaciones(average,vacationStart,end,15,vacationTaken);
    vacation.taken=vacationTaken;
    const rows=(d.adjustments||[]).map(x=>{const min=obtenerSalarioMinimo(+x.year,d.activity,d.circumscription);if(!min)return {...x,missing:true};const pendingDays=+x.pendingDays||((+x.unpaidMonths||0)*30),adjustmentDays=+x.adjustmentDays||((+x.adjustmentMonths||0)*30),unpaid=base/30*pendingDays,difference=Math.max(0,min.monthly-(+x.paidSalary||0))/30*adjustmentDays,bonusDifference=(x.bonusReceived==='no'?250/30*adjustmentDays:0);return {...x,min,pendingDays,adjustmentDays,unpaid,difference,bonusDifference};});
    // La bonificación pendiente corresponde a Q250 por cada mes completo
    // laborado; no se aplica un tope artificial de meses.
    const bonusPendingDays=Math.max(0,+d.bonusPendingDays||0);
    const bonusPending=d.bonusStatus==='recibida'?0:250/30*bonusPendingDays;
    // El ajuste salarial vigente compara únicamente salario ordinario contra el
    // mínimo ordinario de 2026. La bonificación incentivo se calcula aparte.
    const currentMinimum=obtenerSalarioMinimo(2026,d.activity,d.circumscription);
    const lastPaid=d.lastSalaryPaid?date(d.lastSalaryPaid):null;
    const adjustmentStart=lastPaid&&lastPaid>start?lastPaid:start;
    const salaryAdjustmentDays=adjustmentStart&&end?days(adjustmentStart,end):0;
    const currentSalaryDifference=Math.max(0,(currentMinimum?.monthly||0)-ordinary)/30*salaryAdjustmentDays;
    const aguinaldoDays=Math.max(0,days(aguinaldoStart,end)-1), bono14Days=Math.max(0,days(bonoStart,end)+1);
    return {tenure,minimum,base,average,ordinaryCommissions,currentMinimum,currentSalaryDifference,salaryAdjustmentDays,bonusPendingDays,vacation,aguinaldoStart,aguinaldoDays,bonoStart,bono14Days, rows, values:{indemnizacion:calcularIndemnizacion(base,tenure.days,d.reason),vacaciones:vacation.amount,aguinaldo:average/365*aguinaldoDays,bono14:average/365*bono14Days,salariosPendientes:rows.reduce((s,x)=>s+(x.unpaid||0),0),ventajas:d.economicAdvantages==='si'?ordinaryCommissions*.30:0,ajusteSalarial:currentSalaryDifference,ajusteBonificacion:rows.reduce((s,x)=>s+(x.bonusDifference||0),0),bonificacionPendiente:bonusPending,horasExtra:calcularHorasExtraordinarias(base,d.shift,+d.unpaidOvertime||0)}};
  }
  window.Prestaciones={calculate,days,calcularAntiguedad};
})();
