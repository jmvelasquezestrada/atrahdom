(function(){
  const DAY=86400000, date=s=>s?new Date(`${s}T00:00:00`):null, days=(a,b)=>Math.max(0,Math.round((b-a)/DAY));
  const clampDate=(d,min,max)=>new Date(Math.min(Math.max(d,min),max));
  const periodStart=(end,month,day,lastPaid,start)=>{const current=new Date(end.getFullYear(),month,day);const base=end>=current?current:new Date(end.getFullYear()-1,month,day);return lastPaid?date(lastPaid):new Date(Math.max(base,start));};
  function calcularAntiguedad(start,end){const d=days(start,end), y=Math.floor(d/365), remainder=d-y*365, m=Math.floor(remainder/30);return {days:d,label:`${y} años, ${m} meses y ${remainder-m*30} días`};}
  function calcularIndemnizacion(base,worked,reason){return reason==='despido_injustificado'?base*14/12/365*worked:null;}
  function proportional(base,start,end){return base/365*days(start,end);}
  function calcularVacaciones(base,start,end,annual,taken){const available=Math.min(days(start,end),365*5)/365*annual;return Math.max(0,base/30*(available-taken));}
  function calcularHorasExtraordinarias(base,shift,hours){const shiftHours={diurna:8,nocturna:6,mixta:7}[shift];return (base/30/shiftHours)*1.5*hours;}
  function calculate(d){
    const start=date(d.startDate),end=date(d.endDate); const tenure=calcularAntiguedad(start,end); const minimum=obtenerSalarioMinimo(end.getFullYear(),d.activity,d.circumscription);
    const ordinary=+d.ordinarySalary, commissions=+d.commissions||0, extraordinary=+d.extraordinarySalary||0;
    const ordinaryCommissions=ordinary+commissions, average=ordinaryCommissions+extraordinary; const base=Math.max(ordinaryCommissions,minimum?.monthly||0);
    const aguinaldoStart=periodStart(end,11,1,d.aguinaldoLastPaid,start), bonoStart=periodStart(end,6,1,d.bono14LastPaid,start);
    const rows=(d.adjustments||[]).map(x=>{const min=obtenerSalarioMinimo(+x.year,d.activity,d.circumscription);if(!min)return {...x,missing:true};const unpaid=(+x.unpaidMonths||0)*min.monthly, difference=Math.max(0,min.monthly-(+x.paidSalary||0))*(+x.adjustmentMonths||0), bonusDifference=(x.bonusReceived==='no'?250*(+x.adjustmentMonths||0):0);return {...x,min,unpaid,difference,bonusDifference};});
    // La bonificación pendiente corresponde a Q250 por cada mes completo
    // laborado; no se aplica un tope artificial de meses.
    const bonusMonths=d.bonusMonths!==''&&d.bonusMonths!=null?Math.max(0,Math.floor(+d.bonusMonths)):Math.floor(tenure.days/30);
    const bonusPending=d.bonusStatus==='recibida'?0:bonusMonths*250;
    // El ajuste salarial vigente compara únicamente salario ordinario contra el
    // mínimo ordinario de 2026. La bonificación incentivo se calcula aparte.
    const currentMinimum=obtenerSalarioMinimo(2026,d.activity,d.circumscription);
    const lastPaid=d.lastSalaryPaid?date(d.lastSalaryPaid):null;
    const adjustmentStart=lastPaid&&lastPaid>start?lastPaid:start;
    const salaryAdjustmentDays=adjustmentStart&&end?days(adjustmentStart,end):0;
    const currentSalaryDifference=Math.max(0,(currentMinimum?.monthly||0)-ordinary)/30*salaryAdjustmentDays;
    return {tenure,minimum,base,average,ordinaryCommissions,currentMinimum,currentSalaryDifference,salaryAdjustmentDays, rows, values:{indemnizacion:calcularIndemnizacion(base,tenure.days,d.reason),vacaciones:calcularVacaciones(base,start,end,+d.vacationDays||15,+d.vacationTaken||0),aguinaldo:proportional(base,aguinaldoStart,end),bono14:proportional(average,bonoStart,end),salariosPendientes:rows.reduce((s,x)=>s+(x.unpaid||0),0),ventajas:d.economicAdvantages==='si'?ordinaryCommissions*.30:0,ajusteSalarial:currentSalaryDifference,ajusteBonificacion:rows.reduce((s,x)=>s+(x.bonusDifference||0),0),bonificacionPendiente:bonusPending,horasExtra:calcularHorasExtraordinarias(base,d.shift,+d.unpaidOvertime||0)}};
  }
  window.Prestaciones={calculate,days,calcularAntiguedad};
})();
