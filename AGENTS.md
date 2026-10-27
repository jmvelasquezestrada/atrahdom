# Reglas generales de trabajo en ATRAHDOM

Estas instrucciones se aplican a todo el repositorio. Su base es el Reglamento operativo de ATRAHDOM — Versión 1.0, aprobado por el usuario para la creación de este archivo.

## A. Alcance y autorización

- Ejecuta exclusivamente el trabajo solicitado y autorizado.
- No introduzcas mejoras colaterales, rediseños, refactorizaciones ni configuraciones no solicitadas.
- Presenta las recomendaciones adicionales por separado y solicita autorización antes de implementarlas.
- Los hallazgos pendientes de una auditoría no autorizan su corrección.

## B. Protección del estado de Git

- Antes de trabajar, confirma la raíz del repositorio y la rama activa; inspecciona el estado de Git y los cambios existentes.
- Conserva los cambios preexistentes, incluidos los ajenos a la tarea. No los limpies, reviertas, sobrescribas ni elimines sin autorización.
- Detente si no puedes determinar con seguridad qué cambios deben conservarse.
- Al finalizar, compara el estado de Git con el inicial y comprueba que los cambios nuevos correspondan únicamente al alcance autorizado.

## C. Fidelidad editorial e institucional

- Preserva el contenido, títulos, fechas, autorías, imágenes, menús, iconos, categorías, enlaces, rutas y estructura institucional que no formen parte de la tarea autorizada.
- Conserva los materiales históricos. No reescribas, resumas ni sustituyas materiales mediante IA sin autorización expresa.
- No inventes datos ni atribuyas automáticamente la autoría a ATRAHDOM. Utiliza únicamente información comprobable.

## D. Separación entre edición y publicación

- La autorización para modificar archivos localmente no autoriza automáticamente `commit`, `push`, fusiones, despliegues ni cambios en servicios externos.
- Exige autorización explícita para cada acción de publicación o configuración externa, incluidos los pasos anteriores.
- Antes de cada commit, push o publicación autorizados, comprueba que el contenido que se va a confirmar, enviar o publicar corresponde al alcance autorizado y a la validación realizada. Revisa el conjunto preparado para commit, los commits que se enviarán o la revisión y los artefactos que se publicarán, según corresponda. Los cambios preexistentes no quedan autorizados por estar presentes. Si el contenido cambió después de validarlo o incluye cambios adicionales, determina y completa las comprobaciones pertinentes antes de continuar, conforme a E y J; aplica F si hay cambios fuera del alcance o condiciones esenciales no verificadas.
- Inmediatamente antes de cada operación autorizada, verifica la rama, el remoto, el destino y el entorno aplicables, así como los efectos automáticos relevantes que pueda activar. No deduzcas el destino únicamente de la rama local ni de una comprobación anterior. Estas verificaciones no sustituyen la autorización explícita para la operación y sus efectos.
- Distingue el commit local creado, el push aceptado por el remoto, las comprobaciones de CI o compilación completadas y el despliegue completado y verificado, cuando correspondan. No declares una publicación exitosa sin evidencia suficiente del resultado y de su correspondencia con la revisión concreta y los artefactos publicados, si los hay. Ante fallos críticos o condiciones esenciales pendientes de verificar, aplica F.
- Ejecuta generadores en modo de escritura solo cuando estén autorizados y sean necesarios para la tarea. Comprueba previamente qué archivos producen.

## E. Pruebas y auditorías

- Durante las auditorías, ejecuta únicamente comprobaciones seguras de solo lectura.
- Solicita autorización antes de ejecutar pruebas que escriban, creen, eliminen o modifiquen archivos, incluso temporales, salvo que esa ejecución ya esté expresamente autorizada.
- Antes de ejecutar una comprobación, determina sus efectos; no presupongas que es de solo lectura por su nombre.
- Informa qué pruebas ejecutaste, cuáles pasaron, cuáles fallaron y cuáles no pudiste ejecutar, con sus motivos.
- Distingue las pruebas simuladas, las comprobaciones locales y las realizadas en producción. No declares verificado aquello que no hayas comprobado.

## F. Detención ante fallos críticos

Detente y presenta un diagnóstico cuando detectes:

- Cambios ajenos al alcance autorizado.
- Conflictos entre instrucciones vigentes.
- Riesgos para el contenido o los cambios preexistentes.
- Divergencias no explicadas entre fuentes y archivos generados.
- Fallos críticos de validación.
- Condiciones importantes que no puedas verificar de manera confiable.

Describe la evidencia, el impacto y lo que queda sin comprobar; espera instrucciones. No continúes con una publicación que presente un fallo crítico ni amplíes el alcance para corregirlo por iniciativa propia.

## G. Informe final obligatorio

Entrega un informe que indique:

1. Archivos modificados y cambios realizados.
2. Elementos conservados intactos.
3. Pruebas ejecutadas y resultados reales.
4. Problemas pendientes y limitaciones.
5. Aspectos no verificados.
6. Autorizaciones pendientes para acciones posteriores.

## H. Jerarquía de instrucciones

- Aplica este `AGENTS.md` como reglas generales del repositorio, dentro de las instrucciones de mayor prioridad y de la autorización vigente del usuario.
- Consulta los manuales especializados para los procedimientos técnicos específicos cuando existan. Las pruebas automatizadas verifican requisitos comprobables; no conceden autorización para modificar ni publicar.
- Las decisiones vigentes y aprobadas prevalecen sobre prompts históricos desactualizados. No reabras decisiones aprobadas sin un conflicto real, evidencia concreta o una razón técnica relevante.
- Consulta `BUSQUEDA.md` para la documentación existente de búsqueda y `MIGRACION-AUDITORIA.md` para los criterios de conservación y verificación de la migración. Distingue procedimientos aplicables de resultados, pendientes y estados históricos.
- Trata los prompts de migración y rediseño, las bitácoras y los reportes históricos como contexto de sus respectivas intervenciones; no los conviertas automáticamente en instrucciones vigentes ni en autorización para repetir tareas.
- Ante una contradicción sustancial entre instrucciones vigentes, detente y solicita aclaración.

## I. Publicaciones y procedimientos especializados

Aplica estos criterios mínimos a las publicaciones de `/blog/`, `/cendoc/` y `/comunicados/`, dentro del alcance autorizado. No conviertas oportunidades de mejora ni hallazgos pendientes en permiso para intervenir.

### Fuentes y archivos generados

- Antes de crear o actualizar una publicación o índice, identifica la fuente editorial autorizada y distingue los archivos fuente de los derivados o generados.
- Prefiere los generadores existentes y sus comprobaciones seguras de solo lectura cuando correspondan. Su ejecución en modo de escritura requiere la autorización indicada en el apartado D.
- No edites manualmente archivos generados para ocultar divergencias con sus fuentes. Investiga y reporta las diferencias entre fuentes, páginas estáticas, fichas e índices mediante comprobaciones autorizadas; ante una divergencia crítica, aplica el apartado F y espera instrucciones sin corregirla por iniciativa propia.

### Publicaciones nuevas y fichas editoriales

- Comprueba, según corresponda, la página o documento publicado, la ficha identificadora y el índice de sección; valida el slug, la ruta, la URL canónica, la ausencia de duplicados no justificados y el orden cronológico cuando aplique.
- Cada nueva publicación incorporada en `/cendoc/`, `/comunicados/` o `/blog/` debe incluir la actualización del área «Actualidad» de la homepage como parte del mismo procedimiento editorial.
- Actualidad debe mostrar exactamente las tres publicaciones más recientes del conjunto de los tres apartados, no una por apartado, ordenadas de más reciente a más antigua de izquierda a derecha según sus fechas editoriales documentadas. Conserva las fechas aprobadas, incluidas las futuras; no las excluyas automáticamente por ser posteriores a la fecha de trabajo.
- Cada tarjeta de Actualidad debe conservar el mismo diseño, estructura visual, campos y convenciones de las tarjetas generadas en el índice de su apartado de origen. Reutiliza los mecanismos existentes cuando sea posible; no sustituyas las variantes de sección por una tarjeta genérica que pierda esas características.
- Enlaza cada tarjeta a la ruta pública correspondiente y utiliza los datos editoriales existentes, sin inventar títulos, fechas, imágenes, autorías ni otros datos ausentes, conforme a C.
- La actualización de Actualidad y su validación son requisitos para dar por terminada la tarea editorial. Comprueba cantidad, orden, diseño, datos y enlaces; distingue la verificación local de la disponibilidad pública, que solo puede declararse con evidencia de la versión desplegada, conforme a D y E.
- Si no puedes determinar el orden con seguridad, incluida una ambigüedad de fechas o empates que afecte la selección, una tarjeta no puede generarse correctamente o aparece un fallo crítico, aplica F y presenta el diagnóstico.
- Esta obligación no amplía automáticamente el alcance autorizado: si cumplirla requiere modificar archivos u operar fuera de la autorización de la tarea, informa y solicita la ampliación necesaria antes de intervenir; no declares terminada la tarea editorial mientras ese requisito siga pendiente.
- Verifica el bloque lateral con el título exacto de su sección: Blog, «Sobre esta publicación»; CENDOC, «Sobre este documento»; Comunicados, «Sobre este comunicado».
- Comprueba fecha documentada, autoría identificada, tipo de material, instituciones documentadas, cita sugerida en APA, 7.ª edición, y enlace de retorno a la sección correspondiente, según los campos aplicables y el diseño existente.
- Basa los datos bibliográficos exclusivamente en información verificable. Omite el campo o su valor cuando falten datos, conforme al diseño. No inventes fechas, autores, instituciones, editoriales ni otros elementos; no atribuyas automáticamente autoría a ATRAHDOM ni completes citas APA con datos ficticios.

### Pluma invitada en el Blog

- Aplica esta regla a las publicaciones de `/blog/` únicamente cuando el usuario identifique expresamente el artículo como una colaboración de pluma invitada; no infieras esa condición por la autoría ni por el estilo del texto.
- El campo «Tipo» debe comenzar con la expresión exacta `Pluma invitada, `, seguida de la clasificación temática que Codex asigne según el contenido del artículo. Por ejemplo: `Pluma invitada, Derechos laborales`. Conserva ese orden y formato.
- La clasificación temática debe ser pertinente, concreta y coherente con el artículo; no debe sustituir ni eliminar la identificación de «Pluma invitada». Si el contenido no permite determinar una clasificación adecuada con suficiente seguridad, detente y consulta al usuario antes de publicar.

### Presentación tipográfica de artículos del Blog

- En el cuerpo de los artículos del Blog, alinea los párrafos con justificación y los encabezados H2 y H3 a la izquierda, sin justificación.
- Conserva la jerarquía, el estilo visual y las convenciones existentes del sitio. Limita cualquier ajuste de estilo al cuerpo del artículo correspondiente; no introduzcas estilos globales que afecten otras secciones.

### Presentación visual de imágenes del Blog

- Trata todas las imágenes que aparezcan dentro del cuerpo de una publicación de `/blog/` como imágenes principales, cualquiera que sea su contenido. Colócalas al inicio del cuerpo, antes del primer encabezado o párrafo, en su orden original; céntralas horizontalmente en la columna de contenido y dentro de su contenedor. No dejes imágenes editoriales dentro del flujo de texto.
- Reutiliza la clase `.blog-editorial-feature` para presentar cada imagen principal del artículo en un contenedor de proporción `16 / 9`, ancho adaptable al espacio disponible, centrado y con esquinas de `12px`. Las miniaturas editoriales del índice de `/blog/` también deben conservar proporción `16 / 9`, ajuste completo y colores originales.
- Conserva la proporción del archivo original con `object-fit: contain` y centrado horizontal y vertical. Los espacios sobrantes deben usar el rosa pálido del fondo de la página mediante `var(--paper)`. No estires ni deformes imágenes.
- No recortes imágenes automáticamente ni cambies sus colores, filtros o mezcla de color.
- Las imágenes históricas, incluidos carteles, infografías, documentos y galerías, también se muestran completas y conservan su proporción y colores originales dentro del mismo contenedor; no alteres los archivos de imagen.
- Reutiliza los mecanismos y estilos existentes cuando corresponda. Limita los ajustes al Blog y verifica proporción, ausencia de deformación, integridad visual y adaptación a escritorio y móvil.
- Esta regla no autoriza por sí sola modificar publicaciones existentes, archivos de imagen ni estilos globales. Toda implementación debe respetar el alcance autorizado de la tarea.

### SEO y metadatos

- Cuando formen parte de la tarea autorizada, verifica título, descripción, URL canónica con base preferida `https://www.atrahdom.org`, directivas de indexación, datos estructurados pertinentes y metadatos Open Graph y Twitter/X.
- Preserva contenido editorial, imágenes, menús, iconos sociales y rutas fuera del alcance autorizado. Una oportunidad de mejora SEO no autoriza implementarla.

### Analítica GA4

- Conserva la integración global de GA4 sin duplicar etiquetas ni desactivar la medición de páginas públicas para resolver tráfico local.
- Al intervenir con autorización en la exclusión del tráfico de desarrollo, contempla `localhost` en cualquier puerto, `127.0.0.1`, `::1` y `[::1]`; mantén la medición pública, incluida la navegación de la aplicación cuando corresponda.
- No cambies el identificador de medición, la configuración de GA4 ni el código de analítica sin autorización específica. Una tarea documental no autoriza esos cambios.

### Búsqueda interna y verificación del flujo

- Verifica la integración editorial y de búsqueda que corresponda a cada sección:
  - **Blog:** entrada editorial en `content/blog-posts.js`, página estática y registro en la búsqueda general.
  - **CENDOC:** página estática, ficha editorial correspondiente en `content/site.json`, configuración editorial aplicable e índice de búsqueda.
  - **Comunicados:** ficha o fuente de la publicación, índice de sección cuando corresponda y registro en la búsqueda general y en la búsqueda de colección aplicable.
- Dentro de la tarea autorizada, actualiza y valida los índices internos pertinentes mediante sus fuentes y generadores autorizados. Comprueba rutas correctas, ausencia de duplicados y que las publicaciones nuevas aparezcan en los índices y búsquedas generales y de colección correspondientes.
- No consideres que descubrir una página estática como página genérica equivale a registrarla correctamente como publicación editorial.
- Distingue búsqueda interna e indexación externa: el índice interno no sustituye el sitemap, las URL canónicas, las directivas de robots ni la comprobación de indexación en Google o Bing.
- Las pruebas de publicaciones nuevas deben verificar el flujo completo aplicable, con las autorizaciones del apartado E. Una prueba sobre registros existentes no demuestra por sí sola que futuras publicaciones se integrarán automáticamente.

### Procedimientos especializados futuros

Consulta los manuales especializados futuros cuando existan; esta sección no los sustituye ni afirma que ya estén creados. Mientras tanto, aplica estas reglas generales y las decisiones aprobadas, junto con la documentación técnica vigente pertinente. No ejecutes instrucciones de generación o publicación de esa documentación sin la autorización requerida en este archivo.

## J. Protocolo general de trabajo y auditoría

Aplica estas seis etapas junto con las reglas A–I, sin ampliar la autorización de la tarea.

1. **Inspección inicial.** Lee las instrucciones vigentes y registra raíz del repositorio, rama, HEAD, cambios preparados, cambios no preparados y archivos sin seguimiento. Identifica los cambios preexistentes y examina el contenido de los archivos afectados para poder distinguirlos del trabajo nuevo. Si el estado difiere del esperado, determina si afecta la seguridad de la tarea. No toda incertidumbre exige detenerse: ante incertidumbre, aplica B y F cuando comprometa la seguridad de la tarea, la claridad del alcance autorizado o la capacidad de preservar los cambios preexistentes.

2. **Delimitación del alcance.** Identifica el resultado solicitado, los archivos o conjuntos afectados, las operaciones autorizadas, los criterios de aceptación y las comprobaciones esenciales. Distingue una auditoría de solo lectura de una tarea con modificaciones. No conviertas hallazgos o recomendaciones en autorización para intervenir.

3. **Ejecución autorizada.** En auditorías, realiza únicamente inspecciones seguras de solo lectura. En tareas con modificaciones, ejecuta solo las operaciones autorizadas y preserva los cambios preexistentes conforme a B y C. Aplica los controles especializados de I cuando correspondan. Ante cambios nuevos ajenos al alcance, conflictos relevantes o fallos críticos, aplica F; no repares problemas fuera del alcance.

4. **Pruebas pertinentes.** Selecciona comprobaciones proporcionales a la tarea y evalúa sus efectos antes de ejecutarlas. Aplica E y, para generadores, D: no ejecutes pruebas con escritura sin autorización expresa aplicable. Si una prueba escribe inesperadamente, detén nuevas acciones, registra los efectos y aplica F; no borres ni restaures automáticamente los archivos afectados. No consideres validado el trabajo si una comprobación esencial falla, no puede ejecutarse o su resultado no puede verificarse.

5. **Auditoría final.** Compara el estado final con la línea base inicial. Revisa el contenido de las diferencias preparadas y no preparadas, incluidos archivos nuevos, eliminados y sin seguimiento. Distingue los cambios de la tarea de los preexistentes y verifica la conservación de estos últimos comparando con la línea base y revisando el contenido pertinente cuando sea posible. Un `git status` idéntico no demuestra, por sí solo, que el contenido se conservó íntegramente. Si no puedes comprobar una condición esencial de conservación, aplica F. En auditorías, confirma que no introdujiste cambios; en tareas con modificaciones, comprueba que cada cambio corresponda al alcance autorizado. Usa hashes cuando sea necesario demostrar integridad literal, sin imponerlos indiscriminadamente.

6. **Informe y cierre.** Entrega el informe exigido por G y los resultados reales conforme a E. Distingue los cambios realizados, las recomendaciones, las limitaciones y las autorizaciones pendientes. Declara expresamente cualquier condición esencial no verificada. Mantén separadas la conclusión del trabajo local y las acciones de commit, push o publicación, sujetas a D.
