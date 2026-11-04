(function(){
  const form=document.querySelector('#calculator-form');
  const steps=[...document.querySelectorAll('.wizard-step')];
  const progress=document.querySelector('#wizard-progress');
  const actions=document.querySelector('#wizard-actions');
  const errors=document.querySelector('#form-errors');
  const results=document.querySelector('#results');
  const summary=document.querySelector('#summary-content');
  const adjustments=document.querySelector('#adjustments');
  const flow=['work','salary','termination','payments','summary','result'];
  const titles={work:'Tu trabajo',salary:'Tu salario',termination:'Terminación',payments:'Pagos y vacaciones',summary:'Revisión'};
  const money=n=>new Intl.NumberFormat('es-GT',{style:'currency',currency:'GTQ',minimumFractionDigits:2}).format(n).replace('GTQ','Q');
  const escape=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const defaultHelp={
    work:['Tu trabajo','La actividad, el sector y el lugar donde trabajabas.','Ayudan a identificar qué datos de referencia pueden corresponder a la relación laboral.','Podés consultar un recibo o contrato; si no reconocés la actividad, solicitá orientación.'],
    salary:['Tu salario','El salario ordinario mensual y otros pagos regulares.','Algunos pagos pueden formar parte del salario que se toma en cuenta.','Si no conocés un monto, indicalo; no se reemplazará por cero.'],
    termination:['Terminación','El motivo y la fecha en que terminó el trabajo.','La opción permite mostrar los conceptos que contempla esta estimación.','Elegí la opción más cercana; la herramienta no decide legalmente tu caso.'],
    payments:['Pagos y vacaciones','Fechas, períodos y pagos que recibiste o que podrían estar pendientes.','Permiten identificar los conceptos que se pueden estimar con la información disponible.','Podés indicar que no recordás un dato; cuando afecte el cálculo, se marcará para revisión.'],
    summary:['Revisá antes de continuar','La información que ingresaste, agrupada por tema.','Confirmarla ayuda a evitar errores en el informe.','Usá “Editar” junto al tema que querés corregir.'],
    result:['Tu informe orientativo','Los conceptos estimados y la información pendiente.','Los montos se muestran por separado; el total aparece solo si los conceptos pueden sumarse de forma coherente.','Los rubros no calculables se explican sin asignarles un monto.']
  };
  const fieldHelp={
    sector:['Sector de tu empleador','Si tu empleador pertenece al sector privado, público u otro.','La tabla salarial disponible en esta herramienta corresponde al sector privado.','Podés revisar un contrato o recibo; si no lo sabés, elegí “Otro o no estoy segura”.'],
    activity:['Actividad laboral','La actividad principal que realizabas en el trabajo.','Los datos de salario mínimo se organizan por actividad.','Pensá en las tareas que hacías; si no encaja ninguna opción, pedí orientación.'],
    circumscription:['Lugar de trabajo','El departamento o circunscripción donde trabajabas.','Algunos períodos tienen referencias distintas para el departamento de Guatemala y el resto del país.','Usá el lugar habitual de trabajo; si cambió, indicá el lugar relacionado con el período que revisás.'],
    startDate:['Inicio del trabajo','La fecha en que comenzaste a trabajar para este empleador.','Se usa para identificar el tiempo laborado y los períodos.','Podés buscarla en un contrato, recibo o mensaje de contratación.'],
    salaryKnown:['Salario ordinario','Si recordás cuánto te pagaban al mes antes de descuentos.','El monto permite estimar prestaciones basadas en salario.','Revisá un recibo de pago; si no lo tenés, elegí “No lo sé”.'],
    ordinarySalary:['Salario ordinario mensual','El pago mensual antes de descuentos, sin sumar comisiones ni bonificación incentivo.','Sirve como base salarial para la estimación.','Buscá el salario bruto mensual en tu recibo o contrato.'],
    commissionsStatus:['Comisiones','Si recibías comisiones además de tu salario ordinario.','Las comisiones conocidas pueden afectar el promedio salarial.','Revisá recibos; si las recibías pero no sabés el monto, elegí “No sé el monto”.'],
    commissions:['Promedio mensual de comisiones','Un promedio mensual de las comisiones recibidas.','Se agrega a los otros componentes salariales que contempla el cálculo.','Podés estimarlo con tus recibos; no incluyás la bonificación incentivo.'],
    extraordinaryStatus:['Otros pagos por el trabajo','Pagos regulares adicionales al salario ordinario, por ejemplo pagos variables por tus tareas.','Algunos pagos pueden afectar el promedio salarial.','Revisá recibos o apuntes; si no conocés el monto, indicá que no lo sabés.'],
    extraordinarySalary:['Promedio de otros pagos','El promedio mensual de los pagos adicionales que recibías por tu trabajo.','Ayuda a completar el promedio salarial.','Usá recibos de varios meses si los tenés disponibles.'],
    reason:['Motivo de terminación','La opción que mejor describe cómo terminó la relación laboral.','La estimación contempla reglas distintas según la opción indicada.','Si ninguna describe bien lo ocurrido, elegí la más cercana y solicitá orientación.'],
    endDate:['Último día de trabajo','La fecha en que dejaste de trabajar para el empleador.','Permite determinar hasta qué día se revisan los períodos.','Podés consultar una carta de terminación, mensaje o registro de asistencia.'],
    vacationDateStatus:['Último período de vacaciones','Si recordás cuándo te pagaron o gozaste el último período.','La fecha ayuda a ubicar el período que se revisará.','Si no la recordás, elegí esa opción; se explicará la referencia usada.'],
    vacationLastPaid:['Fecha de vacaciones','La fecha del último período de vacaciones pagado o gozado.','Ayuda a identificar desde cuándo revisar el período pendiente.','Revisá recibos, solicitudes o calendarios de vacaciones.'],
    vacationTakenStatus:['Días de vacaciones gozados','Si conocés cuántos días gozaste en el período que quedó pendiente.','Los días gozados afectan cuántos podrían quedar pendientes.','Podés revisar solicitudes o calendarios; si no sabés, indicalo.'],
    vacationTaken:['Días gozados','La cantidad de días de vacaciones que ya gozaste en ese período.','Se resta de los días generados que considera la estimación.','Consultá tus registros de vacaciones si los tenés.'],
    aguinaldoStatus:['Aguinaldo','Si el período anterior se pagó completo, no se recibió, fue parcial o no lo recordás.','Permite saber si el período puede estimarse con la información disponible.','Revisá recibos; un pago parcial o desconocido se marcará para revisión.'],
    aguinaldoPeriodStart:['Período pendiente de Aguinaldo','El inicio del período que quedó pendiente de pago.','La herramienta necesita ubicar ese período; no usa la fecha del depósito como si fuera su inicio.','Buscá el período en el recibo o consulta; si no podés identificarlo, pedí orientación.'],
    bono14Status:['Bono 14','Si el período anterior se pagó completo, no se recibió, fue parcial o no lo recordás.','Permite identificar si el período puede estimarse con la información disponible.','Revisá recibos; un pago parcial o desconocido se marcará para revisión.'],
    bono14PeriodStart:['Período pendiente de Bono 14','El inicio del período que quedó pendiente de pago.','Este período es distinto al de Aguinaldo.','Buscá el período en el recibo o consulta; si no podés identificarlo, pedí orientación.'],
    overtimeStatus:['Horas extra','Si hay horas extraordinarias que no te pagaron.','Solo se piden cantidad y jornada cuando indicás que podrían estar pendientes.','Podés revisar turnos o apuntes; si no sabés la cantidad, indicalo.'],
    unpaidOvertime:['Horas extra pendientes','La cantidad de horas que no te pagaron.','La cantidad y la jornada se usan para estimar este concepto.','Revisá tus registros de horario o pagos.'],
    shift:['Tipo de jornada','Si las horas se trabajaron en jornada diurna, nocturna o mixta.','La duración de la jornada influye en la estimación de horas extra.','Si tu horario variaba o no lo sabés, solicitá orientación.'],
    bonusStatus:['Bonificación incentivo','Si la recibiste, no la recibiste o no podés confirmarlo.','El estado permite identificar si hay días pendientes que podrían estimarse.','Revisá recibos; si no aparece desglosada, elegí “No sé”.'],
    bonusPendingDays:['Días pendientes de bonificación','Los días por los que considerás que no recibiste la bonificación.','Se usa junto con el monto establecido para este concepto.','Podés revisar las fechas de pago; si no conocés los días, solicitá orientación.'],
    economicAdvantages:['Ventajas económicas','Si recibías vivienda, alimentos u otra ventaja como parte del salario.','La respuesta puede cambiar el concepto que contempla la estimación.','Revisá el acuerdo de trabajo; si no sabés si cuenta como ventaja, indicá duda.'],
    salaryPendingStatus:['Salarios pendientes','Si te deben salario o creés que recibiste menos del salario mínimo aplicable.','Permite abrir el detalle de los años que querés revisar.','Compará recibos con tus fechas de trabajo; si no estás segura, indicá que no sabés.'],
    lastSalaryPaid:['Última fecha pagada','La fecha hasta la que recibiste salario.','Ayuda a identificar el período del posible ajuste salarial.','Revisá tu último recibo; si no lo encontrás, el ajuste requerirá revisión.'],
    lastSalaryDateStatus:['Última fecha pagada','Si recordás hasta qué fecha te pagaron salario.','Ayuda a identificar el período de un posible ajuste salarial.','Si no recordás la fecha, ese rubro requerirá revisión.'],
    adjustmentYear:['Año','El año relacionado con el pago pendiente.','La referencia salarial puede variar por año.','Consultá el recibo o el período que estás revisando.'],
    pendingDays:['Días de salario pendientes','Los días trabajados que considerás que no te pagaron.','La cantidad de días se usa para estimar el salario pendiente.','Podés contar desde el último pago recibido hasta el último día trabajado.'],
    adjustmentDays:['Días para revisar diferencia salarial','Los días del año en que considerás que te pagaron por debajo del mínimo.','Sirven para preparar la referencia de la posible diferencia.','Revisá el período de pago relacionado.'],
    paidSalary:['Salario mensual pagado','El salario mensual que recibías durante ese año.','Se compara con la referencia salarial disponible para ese período.','Buscá un recibo de ese año; si no lo tenés, no completes un monto supuesto.'],
    bonusReceived:['Bonificación incentivo en ese año','Si recibiste la bonificación incentivo durante ese período.','La respuesta permite identificar si ese concepto necesita revisión.','Revisá recibos de pago de ese año.']
  };
  let currentStep='work';
  function values(){return Object.fromEntries(new FormData(form).entries());}
  function updateConditional(){
    document.querySelectorAll('[data-show-when]').forEach(el=>{
      const [name,value]=el.dataset.showWhen.split(':');
      el.hidden=form.elements.namedItem(name)?.value!==value;
    });
  }
  function updateHelp(step=currentStep,name=''){
    const item=fieldHelp[name]||defaultHelp[step]||defaultHelp.work;
    document.querySelector('#help-title').textContent=item[0];
    document.querySelector('#help-what').textContent=item[1];
    document.querySelector('#help-why').textContent=item[2];
    document.querySelector('#help-unknown').textContent=item[3];
  }
  function showStep(step){
    currentStep=step;
    steps.forEach(el=>{el.hidden=el.dataset.step!==step;});
    const index=flow.indexOf(step);
    const hasNav=step!=='result';
    actions.hidden=!hasNav;
    document.querySelector('#wizard-back').disabled=index<=0;
    document.querySelector('#wizard-review').disabled=step==='summary';
    document.querySelector('#wizard-next').textContent=step==='summary'?'Ver resultado':'Continuar';
    progress.hidden=!hasNav;
    if(!progress.hidden){
      const position=index+1;
      progress.innerHTML='Paso '+position+' de 5 · '+escape(titles[step])+'<progress aria-label="Progreso del cálculo" max="5" value="'+position+'"></progress>';
    }
    updateHelp(step);
    errors.textContent='';
    updateConditional();
    document.querySelector('#calculadora').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function addAdjustment(){
    const row=document.createElement('fieldset');
    row.className='adjustment';
    row.innerHTML='<legend>Un año que querés revisar</legend><button type="button" class="remove" aria-label="Quitar registro de año">Quitar</button><div class="wizard-fields"><label>Año<input required type="number" name="adjustmentYear" min="2016" max="2026" inputmode="numeric"></label><label>Días de salario sin pagar<input required type="number" name="pendingDays" min="0" step="1" inputmode="numeric"></label><label>Días con posible diferencia salarial<input required type="number" name="adjustmentDays" min="0" step="1" inputmode="numeric"></label><label>Salario mensual pagado ese año (Q)<input required type="number" name="paidSalary" min="0" step=".01" inputmode="decimal"></label><label>¿Recibiste la bonificación incentivo?<select required name="bonusReceived"><option value="">Elegí una opción</option><option value="si">Sí</option><option value="no">No</option><option value="desconocida">No sé</option></select></label></div>';
    adjustments.appendChild(row);
    updateConditional();
  }
  function validateStep(step){
    const d=values();
    errors.dataset.focus='';
    const required=(name,label)=>{
      const value=String(d[name]||'').trim();
      if(!value){errors.textContent='Indicá '+label+' para continuar.';errors.dataset.focus=name;form.elements.namedItem(name)?.focus();return false;}
      return true;
    };
    if(step==='work'){
      for(const [name,label] of [['sector','el sector'],['activity','la actividad'],['circumscription','el departamento o circunscripción'],['startDate','la fecha de inicio']])if(!required(name,label))return false;
    }
    if(step==='salary'){
      if(!required('salaryKnown','si conocés tu salario ordinario'))return false;
      if(d.salaryKnown==='known'&&!required('ordinarySalary','el salario ordinario mensual'))return false;
      if(d.ordinarySalary&&Number(d.ordinarySalary)<0){errors.textContent='El salario no puede ser negativo.';return false;}
      if(!required('commissionsStatus','si recibías comisiones'))return false;
      if(!required('extraordinaryStatus','si recibías otros pagos'))return false;
      if(d.commissionsStatus==='si'&&!required('commissions','el promedio de comisiones'))return false;
      if(d.extraordinaryStatus==='si'&&!required('extraordinarySalary','el promedio de otros pagos'))return false;
      if((d.commissionsStatus==='si'&&Number(d.commissions)<0)||(d.extraordinaryStatus==='si'&&Number(d.extraordinarySalary)<0)){errors.textContent='Los montos no pueden ser negativos.';return false;}
    }
    if(step==='termination'){
      if(!required('reason','el motivo de terminación'))return false;
      if(!required('endDate','el último día trabajado'))return false;
      if(d.endDate<d.startDate){errors.textContent='La terminación no puede ser anterior al inicio del trabajo.';return false;}
    }
    if(step==='payments'){
      for(const [name,label] of [['vacationDateStatus','si recordás la fecha de vacaciones'],['vacationTakenStatus','si conocés los días de vacaciones gozados'],['aguinaldoStatus','el estado del Aguinaldo'],['bono14Status','el estado del Bono 14'],['overtimeStatus','si hay horas extra pendientes'],['bonusStatus','el estado de la bonificación incentivo'],['economicAdvantages','si recibías ventajas económicas'],['salaryPendingStatus','si hay salarios pendientes o diferencias'],['lastSalaryDateStatus','si recordás la última fecha pagada']])if(!required(name,label))return false;
      if(d.vacationDateStatus==='known'&&!required('vacationLastPaid','la fecha del último período de vacaciones'))return false;
      if(d.vacationTakenStatus==='known'&&!required('vacationTaken','los días de vacaciones gozados'))return false;
      if(d.aguinaldoStatus==='complete'&&!required('aguinaldoPeriodStart','el inicio del período pendiente de Aguinaldo'))return false;
      if(d.bono14Status==='complete'&&!required('bono14PeriodStart','el inicio del período pendiente de Bono 14'))return false;
      if(d.overtimeStatus==='yes'&&!required('unpaidOvertime','las horas extra pendientes'))return false;
      if(d.overtimeStatus==='yes'&&!required('shift','la jornada en que se trabajaron'))return false;
      if(d.bonusStatus==='no_recibida'&&!required('bonusPendingDays','los días pendientes de bonificación'))return false;
      if(d.lastSalaryDateStatus==='known'&&!required('lastSalaryPaid','la fecha del último salario pagado'))return false;
      if(d.salaryPendingStatus==='yes'&&!adjustments.querySelector('.adjustment')){errors.textContent='Agregá un año que quieras revisar o cambiá la respuesta.';return false;}
      for(const [field,dateLabel] of [['vacationLastPaid','vacaciones'],['aguinaldoPeriodStart','Aguinaldo'],['bono14PeriodStart','Bono 14']])if(d[field]&&d[field]>d.endDate){errors.textContent='La fecha de '+dateLabel+' no puede ser posterior al último día de trabajo.';return false;}
      if(d.lastSalaryPaid&&d.lastSalaryPaid>d.endDate){errors.textContent='La fecha del último salario pagado no puede ser posterior al último día trabajado.';return false;}
      for(const row of d.salaryPendingStatus==='yes'?adjustments.querySelectorAll('.adjustment'):[]){
        for(const input of row.querySelectorAll('input,select'))if(!input.value){errors.textContent='Completá los datos del año o quitá ese registro.';input.focus();return false;}
      }
    }
    return true;
  }
  function validateFlow(){
    for(const step of flow.filter(name=>!['summary','result'].includes(name))){
      if(!validateStep(step)){const message=errors.textContent,focusName=errors.dataset.focus;showStep(step);errors.textContent=message;if(focusName)requestAnimationFrame(()=>form.elements.namedItem(focusName)?.focus());return false;}
    }
    return true;
  }
  const formatStatus={complete:'El período anterior se pagó completo',none:'No lo recibí',partial:'Lo recibí parcialmente',unknown:'No lo recuerdo'};
  function summaryRows(){
    const d=values();
    const records=[
      ['Tu trabajo',[['Actividad',({agricola:'Agrícola',noAgricola:'No agrícola',maquila:'Exportación y maquila'})[d.activity]],['Lugar',d.circumscription==='ce1'?'Departamento de Guatemala':'Resto del país'],['Sector',({privado:'Privado',publico:'Público',otro:'Otro o no estoy segura'})[d.sector]],['Inicio',d.startDate]],'work'],
      ['Tu salario',[['Salario ordinario',d.salaryKnown==='unknown'?'No lo sé':money(Number(d.ordinarySalary))],['Comisiones',d.commissionsStatus==='si'?money(Number(d.commissions)):d.commissionsStatus==='no'?'No recibía':'Monto desconocido'],['Otros pagos',d.extraordinaryStatus==='si'?money(Number(d.extraordinarySalary)):d.extraordinaryStatus==='no'?'No recibía':'Monto desconocido']],'salary'],
      ['Terminación',[['Motivo',d.reason],['Último día trabajado',d.endDate]],'termination'],
      ['Pagos y vacaciones',[['Vacaciones',d.vacationDateStatus==='known'?d.vacationLastPaid:'No recuerdo la fecha'],['Días gozados',d.vacationTakenStatus==='unknown'?'No lo sé':d.vacationTakenStatus==='none'?'Ninguno':d.vacationTaken+' días'],['Aguinaldo',formatStatus[d.aguinaldoStatus]],['Bono 14',formatStatus[d.bono14Status]],['Horas extra',d.overtimeStatus==='yes'?d.unpaidOvertime+' horas':d.overtimeStatus==='no'?'No':'No lo sé'],['Bonificación incentivo',d.bonusStatus==='recibida'?'Recibida':d.bonusStatus==='no_recibida'?d.bonusPendingDays+' días pendientes':'No lo sé'],['Otros pagos',d.salaryPendingStatus==='yes'?'Hay datos por revisar':d.salaryPendingStatus==='no'?'No':'No lo sé'],['Última fecha salarial',d.lastSalaryDateStatus==='known'?d.lastSalaryPaid:'No la recuerdo']],'payments']
    ];
    summary.innerHTML=records.map(([title,rows,step])=>'<section class="summary-group"><div class="summary-group-head"><h3>'+escape(title)+'</h3><button type="button" data-edit-step="'+step+'">Editar</button></div>'+rows.map(([label,value])=>'<div class="summary-item"><span>'+escape(label)+'</span><strong>'+escape(value||'Sin dato')+'</strong></div>').join('')+'</section>').join('');
  }
  function minimumPanel(year,d){
    if(d.sector!=='privado')return '<section><h3>Salario mínimo de referencia</h3><p>La tabla disponible no permite determinar el parámetro para este sector. Este dato requiere revisión.</p></section>';
    const min=window.obtenerSalarioMinimo(year,d.activity,d.circumscription);
    if(!min)return '<section><h3>Salario mínimo de referencia</h3><p>No hay datos cargados para '+escape(year)+'. No se usó otro año como sustituto.</p></section>';
    const activity=({agricola:'Agrícola',noAgricola:'No agrícola',maquila:'Exportación y maquila'})[d.activity];
    const region=year<=2022?'Nacional':d.circumscription==='ce1'?'Departamento de Guatemala':'Resto del país';
    return '<section><h3>Salario mínimo de referencia — '+escape(year)+'</h3><p>'+escape(activity)+' · '+escape(region)+'</p><p>Salario ordinario: <strong>'+money(min.monthly)+'</strong></p><p>Bonificación incentivo: <strong>'+money(min.bonus)+'</strong></p><p>Referencia total: <strong>'+money(min.total)+'</strong></p><p class="field-note">La comparación es orientativa; revisá las condiciones concretas de tu trabajo.</p></section>';
  }
  function history(r){
    if(!r.rows.length)return '';
    return '<section><h3>Detalle de años ingresados</h3><div class="scroll"><table><thead><tr><th>Año</th><th>Días salario pendiente</th><th>Salario mínimo</th><th>Diferencia salarial</th><th>Diferencia de bonificación</th></tr></thead><tbody>'+r.rows.map(x=>{
      if(x.missing)return '<tr><td>'+escape(x.year)+'</td><td colspan="4">Este año requiere revisión porque no hay una referencia disponible.</td></tr>';
      return '<tr><td>'+escape(x.year)+'</td><td>'+escape(x.pendingDays||0)+'</td><td>'+money(x.min.monthly)+'</td><td>'+(Number(x.adjustmentDays)>0?'Requiere revisión':'—')+'</td><td>'+(Number(x.bonusDifference)>0?money(x.bonusDifference):'—')+'</td></tr>';
    }).join('')+'</tbody></table><p class="field-note">Las diferencias salariales anuales se muestran para revisión y no se incluyen en el total.</p></div></section>';
  }
  function resultNeedsReview(d){
    const review=[];
    if(d.salaryKnown==='unknown')review.push('No se conoce el salario ordinario.');
    if(d.commissionsStatus==='desconocido')review.push('No se conoce el monto de las comisiones.');
    if(d.extraordinaryStatus==='desconocido')review.push('No se conoce el monto de otros pagos salariales.');
    if(d.vacationTakenStatus==='unknown')review.push('No se conoce cuántos días de vacaciones se gozaron.');
    for(const [status,name] of [['aguinaldoStatus','Aguinaldo'],['bono14Status','Bono 14']])if(['partial','unknown'].includes(d[status]))review.push(name+' requiere revisión por pago parcial o desconocido.');
    if(d.overtimeStatus==='unknown')review.push('No se conoce la cantidad de horas extra pendientes.');
    if(d.bonusStatus==='desconocida')review.push('No se conoce el estado de la bonificación incentivo.');
    if(d.economicAdvantages==='unknown')review.push('No se sabe si correspondían ventajas económicas.');
    if(d.salaryPendingStatus==='unknown')review.push('No se sabe si hay salarios pendientes o diferencias.');
    if(d.lastSalaryDateStatus==='unknown')review.push('No se recuerda la última fecha pagada; el posible ajuste salarial necesita revisión.');
    if(d.salaryPendingStatus==='yes'&&[...adjustments.querySelectorAll('[name=bonusReceived]')].some(x=>x.value==='desconocida'))review.push('No se conoce si se recibió bonificación incentivo en uno de los años ingresados.');
    return review;
  }
  function renderTerminationReport(){
    const d=values();
    const needsReview=resultNeedsReview(d);
    if(needsReview.length){
      results.innerHTML=minimumPanel(Number(d.endDate.slice(0,4)),d)+'<section class="review-notice"><h3>Información que requiere revisión</h3><ul>'+needsReview.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul><p>No se calcularon prestaciones ni se asignaron montos a estos datos. Para evitar presentar una estimación que dependa de supuestos, tampoco se muestra un total.</p></section><section><p>Este resultado es orientativo y no sustituye una revisión de tu situación laboral.</p><a class="right-reference" href="/cendoc/codigo-de-trabajo-republica-de-guatemala/">Consultar el Código de Trabajo</a></section><div class="contact"><h3>¿Necesitás orientación?</h3><a class="contact-btn" href="/solicita-apoyo/">Solicitar orientación</a></div>';
      return;
    }
    const dInput={
      startDate:d.startDate,endDate:d.endDate,ordinarySalary:d.ordinarySalary,
      extraordinarySalary:d.extraordinaryStatus==='si'?d.extraordinarySalary:'0',
      commissions:d.commissionsStatus==='si'?d.commissions:'0',activity:d.activity,
      circumscription:d.circumscription,sector:d.sector,reason:d.reason,
      shift:d.overtimeStatus==='yes'?d.shift:'diurna',
      vacationLastPaid:d.vacationDateStatus==='known'?d.vacationLastPaid:'',
      vacationTaken:d.vacationTakenStatus==='known'?d.vacationTaken:'0',
      aguinaldoLastPaid:d.aguinaldoStatus==='complete'?d.aguinaldoPeriodStart:'',
      bono14LastPaid:d.bono14Status==='complete'?d.bono14PeriodStart:'',
      lastSalaryPaid:d.lastSalaryPaid,unpaidOvertime:d.overtimeStatus==='yes'?d.unpaidOvertime:'0',
      economicAdvantages:d.economicAdvantages,bonusStatus:d.bonusStatus,
      bonusPendingDays:d.bonusStatus==='no_recibida'?d.bonusPendingDays:'0',
      adjustments:d.salaryPendingStatus==='yes'?[...adjustments.querySelectorAll('.adjustment')].map(row=>({
        year:row.querySelector('[name=adjustmentYear]').value,
        pendingDays:row.querySelector('[name=pendingDays]').value,
        adjustmentDays:row.querySelector('[name=adjustmentDays]').value,
        paidSalary:row.querySelector('[name=paidSalary]').value,
        bonusReceived:row.querySelector('[name=bonusReceived]').value
      })):[]
    };
    const r=window.Prestaciones.calculate(dInput),v=r.values;
    const items=[];
    const add=(name,value,description)=>items.push({name,value,description});
    if(v.indemnizacion!==null)add('Indemnización',v.indemnizacion,'Estimación según el motivo indicado y el tiempo laborado.');
    else add('Indemnización',null,'La herramienta no estima este concepto para la opción que elegiste. Esto no determina tus derechos legales.');
    add('Vacaciones',v.vacaciones,'Período considerado: '+r.vacation.periodDays+' días.');
    add('Aguinaldo',v.aguinaldo,'Período considerado: '+r.aguinaldoDays+' días.');
    add('Bono 14',v.bono14,'Período considerado: '+r.bono14Days+' días.');
    if(d.salaryPendingStatus==='yes')add('Salarios pendientes',v.salariosPendientes,'Según los días y años ingresados.');
    if(d.economicAdvantages==='si')add('Ventajas económicas',v.ventajas,'Estimación según la información indicada.');
    if(d.lastSalaryPaid&&Number(d.endDate.slice(0,4))===2026)add('Posible ajuste salarial',v.ajusteSalarial,'Referencia automática disponible para 2026.');
    if(d.salaryPendingStatus==='yes'&&dInput.adjustments.some(x=>Number(x.adjustmentDays)>0))needsReview.push('Las diferencias salariales anuales requieren revisión y no se suman al total.');
    if(dInput.adjustments.some(x=>x.bonusReceived==='desconocida'))needsReview.push('No se conoce si se recibió bonificación incentivo en uno de los años ingresados.');
    if(r.rows.some(x=>x.missing))needsReview.push('Falta una referencia salarial para uno de los años ingresados.');
    if(!d.lastSalaryPaid)needsReview.push('No se conoce la última fecha de pago; el ajuste salarial requiere revisión.');
    if(d.vacationDateStatus==='unknown')needsReview.push('No se conoce la última fecha de vacaciones; ese rubro usa una referencia de aniversario y requiere revisión.');
    if(d.bonusStatus==='no_recibida')add('Bonificación incentivo pendiente',v.bonificacionPendiente,'Según los días pendientes indicados.');
    if(d.overtimeStatus==='yes')add('Horas extra pendientes',v.horasExtra,'Según las horas y la jornada indicadas.');
    if(d.sector!=='privado')needsReview.push('La referencia disponible está limitada al sector privado.');
    if(d.endDate.slice(0,4)!=='2026')needsReview.push('El ajuste salarial automático disponible usa la referencia de 2026.');
    if(d.aguinaldoStatus==='none'||d.bono14Status==='none')needsReview.push('Cuando indicás que no recibiste una prestación, se usa el período anual de referencia disponible; no se reconstruyen períodos de años anteriores.');
    let html=minimumPanel(Number(d.endDate.slice(0,4)),d);
    html+='<section><h3>Tu relación de trabajo</h3><p>'+escape(d.startDate)+' a '+escape(d.endDate)+' · '+escape(({agricola:'Agrícola',noAgricola:'No agrícola',maquila:'Exportación y maquila'})[d.activity])+'</p><p>Tiempo laborado: '+escape(r.tenure.label)+' ('+r.tenure.days+' días).</p></section>';
    html+='<section><h3>Prestaciones estimadas</h3>'+items.map(item=>'<article><h3>'+escape(item.name)+'</h3><strong>'+(item.value===null?'No estimado':money(item.value))+'</strong><p>'+escape(item.description)+'</p></article>').join('')+'</section>';
    if(needsReview.length)html+='<section class="review-notice"><h3>Aspectos que requieren revisión</h3><ul>'+needsReview.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul><p>No se muestra un total mientras existan aspectos pendientes.</p></section>';
    else html+='<div class="guided-total"><span>Total estimado de los conceptos mostrados</span><strong>'+money(items.reduce((sum,item)=>sum+(item.value===null?0:item.value),0))+'</strong></div>';
    html+=history(r);
    html+='<details><summary>Cómo se estimó cada prestación</summary><p>Los períodos y montos se basan en las fechas y datos ingresados y en la normativa de referencia incorporada a esta herramienta.</p><a class="right-reference" href="/cendoc/codigo-de-trabajo-republica-de-guatemala/">Consultar el Código de Trabajo</a></details>';
    html+='<section class="contact"><h3>¿Necesitás orientación sobre tu situación laboral?</h3><p>Podés solicitar acompañamiento para revisar tu caso.</p><a class="contact-btn" href="/solicita-apoyo/">Solicitar orientación</a></section>';
    results.innerHTML=html;
  }
  document.querySelector('#wizard-next').addEventListener('click',()=>{
    if(!validateStep(currentStep))return;
    if(currentStep==='summary'){if(validateFlow()){renderTerminationReport();showStep('result');}return;}
    const next=flow[flow.indexOf(currentStep)+1];
    if(next==='summary')summaryRows();
    showStep(next);
  });
  document.querySelector('#wizard-back').addEventListener('click',()=>{const index=flow.indexOf(currentStep);if(index>0)showStep(flow[index-1]);});
  document.querySelector('#wizard-review').addEventListener('click',()=>{if(validateFlow()){summaryRows();showStep('summary');}});
  document.querySelector('#add-adjustment').addEventListener('click',addAdjustment);
  adjustments.addEventListener('click',event=>{const button=event.target.closest('.remove');if(button)button.closest('.adjustment').remove();});
  form.addEventListener('change',()=>{updateConditional();});
  form.addEventListener('focusin',event=>{if(event.target.name)updateHelp(currentStep,event.target.name);});
  form.addEventListener('click',event=>{const button=event.target.closest('[data-edit-step]');if(button)showStep(button.dataset.editStep);});
  document.querySelector('#print-report').addEventListener('click',()=>window.print());
  form.addEventListener('submit',event=>event.preventDefault());
  updateConditional();
  showStep('work');
})();
