# RECAL.md
# Reglamento de la Calculadora de Prestaciones Laborales de ATRAHDOM

**Versión del reglamento:** 0.1 — Borrador  
**Estado:** Pendiente de revisión y aprobación institucional  
**Proyecto:** Nuevo Sitioweb ATRAHDOM  
**Herramienta:** Calculadora de Prestaciones Laborales  
**Ubicación prevista:** `calculadora/RECAL.md` o ubicación acordada dentro del repositorio

---

## 1. Propósito

El presente reglamento establece los principios funcionales, técnicos y de desarrollo que deben regir la Calculadora de Prestaciones Laborales de ATRAHDOM.

Su finalidad es asegurar que la herramienta mantenga coherencia entre versiones, preserve las decisiones institucionales aprobadas y ofrezca resultados comprensibles, verificables y útiles para las personas trabajadoras.

RECAL.md constituye la fuente de referencia funcional del producto. No sustituye las órdenes de trabajo de cada versión, los documentos jurídicos de referencia ni las instrucciones generales del repositorio.

## 2. Jerarquía documental

La calculadora se desarrollará conforme a la siguiente jerarquía:

1. `AGENTS.md`: establece las reglas generales de comportamiento de Codex en el repositorio, autorizaciones, preservación de cambios y procedimientos de trabajo.
2. `RECAL.md`: establece las reglas permanentes de funcionamiento, alcance y experiencia de la calculadora.
3. `FORMULAS_Y_CRITERIOS.md`: documenta las fórmulas aprobadas, sus fundamentos y las decisiones jurídicas o matemáticas relacionadas.
4. `CASOS_DE_PRUEBA.md`: contiene los casos de prueba funcionales y sus resultados esperados.
5. Órdenes de trabajo de cada versión: autorizan cambios específicos y delimitados.

Una orden de trabajo puede modificar una regla de RECAL.md únicamente cuando lo indique de forma expresa. Los cambios aprobados deberán incorporarse posteriormente al reglamento para mantenerlo actualizado.

En caso de contradicción entre documentos, Codex no deberá resolverla mediante una interpretación unilateral. Deberá identificar la contradicción y solicitar una decisión, salvo que la orden de trabajo vigente resuelva expresamente el conflicto.

## 3. Alcance institucional y jurídico

### 3.1 Público objetivo

La calculadora está dirigida a trabajadoras y trabajadores del sector privado de Guatemala, cuyas relaciones laborales se encuentran sujetas al régimen laboral general.

La herramienta busca facilitar la comprensión de las prestaciones laborales que podrían corresponder a una persona al finalizar su relación de trabajo.

### 3.2 Régimen jurídico

El marco de referencia de la calculadora es el Código de Trabajo de Guatemala y las disposiciones laborales que expresamente se incorporen y validen como parte de sus criterios de cálculo.

Se excluyen del alcance:

- Ley de Servicio Civil.
- Código Municipal.
- Regímenes especiales de empleo público.
- Cálculos de prestaciones de funcionarios o trabajadores del sector público.

La herramienta no deberá ampliar su alcance a otros regímenes sin autorización institucional expresa.

### 3.3 Carácter orientativo

La calculadora es un instrumento de orientación y estimación. No constituye una resolución administrativa, dictamen jurídico, liquidación oficial ni determinación judicial.

El resultado no es legalmente vinculante y no sustituye la revisión de la Inspección General de Trabajo, MINTRAB, los tribunales competentes ni la asesoría laboral.

Las advertencias legales deben informar al usuario sobre las limitaciones concretas de cada estimación. No deberán utilizarse para evitar el cálculo de conceptos que sí pueden estimarse con los datos disponibles.

## 4. Principios funcionales obligatorios

### 4.1 Calcular todos los conceptos calculables

La calculadora deberá estimar todos los rubros para los que existan datos suficientes y una fórmula aprobada.

La antigüedad prolongada, la complejidad de un historial laboral o la existencia de otros conceptos pendientes no justifican omitir un cálculo que pueda realizarse.

### 4.2 No bloquear cálculos independientes

La ausencia de información necesaria para un rubro no deberá impedir el cálculo de otros rubros que no dependan de esa información.

Cada concepto deberá identificar sus propias dependencias.

### 4.3 Diferenciar cero de desconocido

Un valor numérico declarado como cero representa una respuesta concreta. Un dato numérico, una fecha o cualquier otro dato indispensable que la persona no conozca sigue siendo información desconocida; no deberá inventarse ni sustituirse silenciosamente por cero. Si falta un dato indispensable para un rubro, no se presentará ese rubro como resultado completo, pero esa falta no bloqueará los rubros independientes.

Las preguntas binarias sobre recepción o disfrute de una prestación, pago o beneficio se rigen por la regla del apartado 6.2: solo ofrecen «Sí» y «No». Cuando la persona no pueda confirmar la respuesta, se le orientará a seleccionar «No». Para esa pregunta, «No» permite estimar el monto pendiente con los demás datos disponibles bajo el supuesto operativo descrito en dicho apartado; no representa un dato desconocido ni una determinación definitiva de deuda.

No se asumirá cero para otros datos ni se aplicarán supuestos distintos de los expresamente aprobados y documentados.

### 4.4 No inventar información

Codex no podrá crear fechas, salarios, períodos, cantidades, pagos o criterios legales que no hayan sido declarados por la persona usuaria o aprobados institucionalmente.

### 4.5 No omitir resultados mediante advertencias

Los mensajes de revisión, limitación o asesoría deberán acompañar el cálculo, no reemplazarlo.

Una advertencia no constituye un resultado matemático.

### 4.6 Explicabilidad

Cada rubro presentado deberá permitir identificar:

- El concepto calculado.
- El período considerado.
- La base salarial utilizada.
- Los datos relevantes de entrada.
- El importe estimado.
- Las limitaciones aplicables, cuando existan.

### 4.7 Protección de las reglas aprobadas

Codex no podrá modificar unilateralmente fórmulas, bases salariales, períodos de cálculo, parámetros legales o criterios institucionales.

Las correcciones técnicas que no alteren el resultado funcional aprobado podrán implementarse conforme a las órdenes de trabajo vigentes.

## 5. Reglas generales de cálculo

### 5.1 Salario ordinario

La calculadora deberá solicitar directamente el salario ordinario mensual declarado por la persona trabajadora.

No deberá solicitar confirmaciones redundantes sobre si recuerda el salario cuando ya existe un campo para introducirlo.

El salario declarado deberá conservarse como dato de entrada y no ser reemplazado silenciosamente por otro valor.

### 5.2 Componentes salariales

Las comisiones y otros pagos salariales se incorporarán conforme a las reglas aprobadas para cada concepto.

Su efecto deberá distinguirse entre:

- Promedio salarial.
- Base de indemnización.
- Base de vacaciones.
- Base de aguinaldo.
- Base de Bono 14.
- Otros rubros que expresamente dependan de ellos.

No todos los componentes salariales afectan necesariamente todos los conceptos. Cuando el flujo pregunte de forma binaria si existen comisiones u otros pagos salariales, «No» significará que la persona no declara ese componente para la estimación o que no puede confirmarlo y sigue la orientación de la herramienta. No se asignará un promedio salarial desconocido ni se cambiarán las bases aprobadas. La falta de confirmación sobre un componente no bloqueará los cálculos independientes; su efecto en cada rubro seguirá limitado a las dependencias establecidas por la fórmula aprobada.

### 5.3 Bonificación incentivo

La bonificación incentivo de referencia será de Q250 mensuales.

No deberá solicitarse como entrada cuando el monto sea un parámetro fijo del sistema.

La herramienta deberá mostrarla separada del salario ordinario y explicar su carácter legal.

Su inclusión o exclusión de cada base de cálculo deberá respetar la fórmula aprobada para el concepto correspondiente.

### 5.4 Salario mínimo

La calculadora utilizará las tablas salariales aprobadas para la circunscripción económica y actividad aplicables.

Las referencias geográficas aprobadas son:

- CE1 — Departamento de Guatemala.
- CE2 — Otro departamento.

Estas opciones no deberán modificarse unilateralmente.

La tabla histórica de salarios mínimos deberá distinguir el salario ordinario de la bonificación incentivo y del total mensual.

No se utilizará un salario mínimo de un año para recalcular retrospectivamente períodos de otro año, salvo que la fórmula aprobada lo establezca expresamente.

### 5.5 Indemnización

La indemnización deberá calcularse conforme a la fórmula aprobada y a los datos declarados por la persona.

La fecha de inicio y la fecha de terminación deberán conservarse como datos relevantes para determinar el tiempo de servicio.

No se aplicará un límite automático de años de servicio sin una decisión institucional expresa sustentada en la documentación jurídica correspondiente.

La herramienta deberá presentar una advertencia de carácter orientativo sobre posibles cuestiones relativas a períodos reclamables, prescripción o criterios judiciales, sin modificar automáticamente el importe calculado.

### 5.6 Vacaciones

El cálculo de vacaciones deberá considerar:

- Tiempo de servicio.
- Período vacacional aplicable.
- Días de vacaciones generados.
- Días disfrutados declarados.
- Días pendientes estimados.
- Remuneración aplicable.
- Limitaciones legales que hayan sido validadas.

La interfaz deberá explicar de forma sencilla cómo se consideran las vacaciones disfrutadas y pendientes.

No deberá acumular automáticamente períodos que excedan la limitación legal aplicable.

La fórmula y el tratamiento de períodos históricos deberán documentarse en `FORMULAS_Y_CRITERIOS.md`.

### 5.7 Aguinaldo

El cálculo de aguinaldo deberá respetar su período legal específico y distinguirlo del período de Bono 14.

La herramienta deberá presentar el período considerado y el monto estimado.

Las reglas de pagos anteriores, períodos pendientes y supuestos aplicables deberán estar expresamente documentadas.

### 5.8 Bono 14

El cálculo de Bono 14 deberá respetar su período legal específico, independiente del aguinaldo.

La herramienta deberá presentar el período considerado y el monto estimado.

Las reglas de pagos anteriores, períodos pendientes y supuestos aplicables deberán estar expresamente documentadas.

### 5.9 Horas extraordinarias

La calculadora deberá solicitar los datos indispensables para estimar las horas extraordinarias pendientes.

Si la persona declara que no tiene horas extraordinarias pendientes, el concepto podrá representarse como cero.

Si declara que sí tiene, deberá solicitar la cantidad y los demás datos requeridos por la fórmula aprobada.

La ausencia de información sobre horas extraordinarias no deberá bloquear los demás rubros.

### 5.10 Ventajas económicas

La interfaz deberá simplificar la consulta sobre ventajas económicas conforme al criterio institucional aprobado.

La fórmula, base salarial y aplicación del porcentaje correspondiente deberán estar documentadas y validadas antes de ser modificadas.

Codex no podrá interpretar unilateralmente el artículo 90 del Código de Trabajo para alterar la fórmula vigente.

### 5.11 Salarios pendientes y reajustes

Los salarios pendientes, reajustes salariales y diferencias de bonificación deberán conservar sus dependencias específicas.

No se eliminarán campos que alimenten cálculos existentes sin identificar primero los conceptos afectados y aprobar una alternativa funcional.

Las diferencias que no puedan incorporarse al total deberán presentarse por separado y explicarse claramente.

## 6. Experiencia de usuario

La calculadora deberá priorizar una experiencia sencilla, accesible y comprensible para las personas trabajadoras.

### 6.1 Lenguaje

El lenguaje deberá ser cotidiano, claro y respetuoso.

No se mostrarán al público referencias internas como:

- V.1, V.2, V.2.1 o V.2.3.
- Nombres internos de funciones.
- Variables de programación.
- Terminología técnica innecesaria.
- Mensajes internos de depuración.

### 6.2 Preguntas

Cada pregunta deberá tener una finalidad identificable.

No se solicitarán datos que no sean utilizados por el motor o que no sean necesarios para explicar una limitación.

Las preguntas condicionales aparecerán únicamente cuando la respuesta anterior las haga pertinentes. Las preguntas binarias del flujo ofrecerán únicamente «Sí» y «No»; no mostrarán opciones como «No lo sé», «No lo recuerdo», «No estoy segura/o» o «Desconozco el dato». Si la persona no puede confirmar una respuesta binaria, la orientación será seleccionar «No».

En una pregunta sobre si recibió o disfrutó una prestación, pago o beneficio, «Sí» significa que declara haberlo recibido o disfrutado. «No» significa que declara no haberlo recibido o disfrutado, o que no puede confirmarlo y selecciona la respuesta binaria recomendada. En este último supuesto, la herramienta podrá estimar el monto pendiente con los datos disponibles. Esta es una suposición operativa para producir una estimación orientativa: no constituye prueba de deuda, reconocimiento del empleador ni determinación legal definitiva. La regla se aplica independientemente a aguinaldo, Bono 14, vacaciones, bonificación incentivo pendiente cuando corresponda y cualquier otro pago o prestación consultado de esa forma. La respuesta sobre un rubro no determina el estado de pago o disfrute de los demás.

### 6.3 Explicaciones

Las explicaciones contextuales deberán responder:

- ¿Por qué se solicita este dato?
- ¿Para qué se utiliza?
- ¿Qué derecho o concepto laboral ayuda a estimar?

Las explicaciones no deberán ser genéricas ni limitarse a repetir la pregunta.

### 6.4 Informe final

El informe deberá presentar, como mínimo, los conceptos principales calculados:

- Indemnización, cuando corresponda.
- Vacaciones.
- Aguinaldo.
- Bono 14.
- Otros rubros calculados con datos suficientes.

El informe deberá distinguir claramente:

- Datos declarados.
- Bases salariales de referencia.
- Importes calculados.
- Conceptos no calculados por falta de datos indispensables.
- Advertencias y limitaciones.
- Total orientativo, cuando sea matemáticamente coherente.

No se presentará una suma parcial como si fuera el total de prestaciones estimadas.

Cuando un rubro se estime a partir de una respuesta «No» a una pregunta sobre recepción o disfrute, el informe explicará brevemente que el monto se calculó bajo el supuesto de que la prestación, pago o beneficio no fue recibido o disfrutado, según la respuesta indicada. La explicación dejará claro que se trata de una estimación orientativa y no de una determinación definitiva de deuda. Acompañará el cálculo y no se utilizará para omitirlo.

## 7. Desarrollo y control de versiones

### 7.1 Continuidad funcional

Cada nueva versión deberá conservar las decisiones aprobadas en versiones anteriores, salvo que la orden de trabajo autorice expresamente su modificación.

### 7.2 Alcance

Codex no deberá ampliar el alcance de una orden de trabajo.

No se incorporarán nuevos regímenes jurídicos, prestaciones, rutas de consulta ni funcionalidades sin autorización expresa.

### 7.3 Separación de tareas

Las tareas de diagnóstico, implementación, auditoría, publicación y despliegue deberán mantenerse separadas conforme a `AGENTS.md`.

Una orden de implementación no autoriza automáticamente auditorías generales, modificaciones ajenas a la calculadora, commits, pushes ni despliegues.

### 7.4 Documentación

Las fórmulas y decisiones aprobadas deberán mantenerse documentadas.

Los documentos históricos podrán conservarse como referencia, pero no deberán considerarse automáticamente como reglas vigentes si han sido reemplazados por decisiones posteriores.

### 7.5 Conflictos y vacíos

Cuando Codex encuentre una contradicción entre:

- El reglamento.
- Una fórmula documentada.
- Una prueba aprobada.
- El comportamiento actual del motor.
- Una orden de trabajo vigente.

Deberá identificarla de manera concreta y solicitar resolución institucional, sin cambiar silenciosamente la regla.

## 8. Pruebas y criterios de aceptación

Una versión no se considerará funcionalmente terminada únicamente porque la interfaz carga o la navegación funciona.

La validación deberá incluir:

1. Pruebas numéricas de cada rubro principal.
2. Pruebas de períodos laborales cortos y prolongados.
3. Pruebas de pagos completos y pendientes, incluidas las respuestas binarias «No» cuando la persona no pueda confirmar si recibió o disfrutó el concepto.
4. Pruebas de datos condicionales.
5. Pruebas de independencia entre rubros.
6. Pruebas de coherencia del total.
7. Pruebas de regresión de los casos previamente aprobados.
8. Verificación de la presentación del informe.
9. Verificación de que las preguntas no utilizadas por el motor hayan sido eliminadas.

Los resultados esperados deberán provenir de fórmulas y criterios documentados, no de una inferencia nueva de Codex.

Las pruebas de regresión no deberán modificarse únicamente para hacer pasar una implementación.

## 9. Documentos normativos y técnicos

Los siguientes documentos formarán parte del control de la calculadora:

- `RECAL.md`: reglamento funcional.
- `FORMULAS_Y_CRITERIOS.md`: fórmulas y criterios de cálculo.
- `CASOS_DE_PRUEBA.md`: casos de prueba y resultados esperados.
- Órdenes de trabajo de cada versión.
- Documentos jurídicos primarios y fuentes oficiales que sustenten los criterios aprobados.

La incorporación de una fórmula a `FORMULAS_Y_CRITERIOS.md` requerirá identificar su fundamento documental y su estado de validación.

## 10. Estado del reglamento

Este documento constituye un borrador inicial.

Los apartados relativos a fórmulas, bases salariales, períodos históricos, limitaciones y criterios de cálculo deberán completarse y validarse a partir de los documentos de trabajo originales utilizados por ATRAHDOM.

Hasta su aprobación institucional, RECAL.md no autoriza por sí mismo cambios al motor de cálculo ni sustituye las órdenes de trabajo vigentes.