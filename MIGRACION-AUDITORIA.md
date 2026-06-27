# Migración y auditoría del portal ATRAHDOM

Fecha de reinicio del inventario: 26 de junio de 2026

## Criterio de aceptación

Una URL solo puede marcarse como **verificada** cuando cumple todos estos puntos:

- Título exacto.
- URL original registrada.
- Tipo de contenido correcto: página, entrada, categoría, adjunto o archivo.
- Fecha original.
- Usuario de WordPress.
- Autoría incluida dentro del contenido, cuando exista.
- Cuerpo completo sin síntesis ni reescritura.
- Ortografía y puntuación originales conservadas.
- Encabezados, listas, columnas, separadores y enlaces conservados.
- Todas las imágenes descargadas al proyecto y enlazadas localmente.
- PDFs, documentos y presentaciones descargados o registrados como dependencia externa cuando la plataforma no permita descarga.
- Texto alternativo y pies de imagen conservados cuando existan.
- Renderizado comparado visualmente contra la página original.
- Sin placeholders dentro de contenido ya existente.

## Estructura local prevista

- `content-data.js`: datos estructurados de páginas y entradas.
- `assets/images/`: imágenes originales descargadas.
- `assets/documents/`: PDF, DOC, PPT y otros adjuntos.
- `assets/external/`: manifiestos para SlideShare, Scribd, YouTube y otros recursos externos.
- `inventory/urls.json`: inventario total de URLs.
- `inventory/media.json`: inventario total de medios y adjuntos.
- `inventory/verification.json`: matriz de verificación.

## Navegación principal inventariada

| Sección | URL original | Tipo | Estado |
|---|---|---|---|
| Inicio | https://atrahdom.org/ | Página de inicio | Pendiente de migración literal |
| Blog | https://atrahdom.org/category/blog/ | Categoría paginada | Inventario en curso |
| Contáctanos | https://atrahdom.org/contactanos/ | Página | Pendiente de comparación literal |
| Centro de Documentación Digital | https://atrahdom.org/category/centro-de-documentacion-digital/ | Categoría paginada | Inventario en curso |
| Ejes de Trabajo | https://atrahdom.org/ejes-de-trabajo/ | Página | Pendiente de comparación literal |
| Espacios de Participación | https://atrahdom.org/espacios-de-participacion/ | Página | Texto comparado; medios aún no locales |
| Organización | https://atrahdom.org/organizacion/ | Página | Pendiente de comparación literal |
| Publicaciones propias | https://atrahdom.org/category/publicaciones-propias/ | Categoría | Inventariada en primera capa |
| SITRADOM | https://atrahdom.org/sitradom/ | Página | Pendiente de comparación literal |
| SITRADOMSA | https://atrahdom.org/category/sitradomsa/ | Categoría | Dos entradas detectadas |
| Haz una Donación | https://atrahdom.org/2012/10/24/has-una-donacion/ | Entrada | Pendiente de comparación literal |

## Blog — URLs detectadas

### Página 1

- Libertad de Asociación — 30 julio 2021 — Sonicalm.
- El deber cívico nos llama #ParoNacional29J — 28 julio 2021 — Sonicalm.
- 10 años del C189 — 26 julio 2021 — Sonicalm.
- ¿Qué es el autocuidado? — 23 julio 2021 — Sonicalm.
- Nuevos apartados — 1 febrero 2021 — Sonicalm.
- Las necesidades de la población, vulnerada por la indiferencia…. — 7 julio 2020 — Sonicalm.
- Despliega tus alas — 12 diciembre 2019 — Sonicalm.
- Hemos tocado puertas, y no hemos logrado mas que setir la discriminación… Hacia nuestra condición… — 14 octubre 2019 — Sonicalm.
- Pacto Mundial para el Empleo. — 22 agosto 2019 — Sonicalm.
- Por malos tratos, trabajadora decide quitarse la vida. — 19 agosto 2019 — Sonicalm.

### Página 2

- Que significa una Mediación Judicial — 15 agosto 2019 — Sonicalm.
- Manifestamos nuestra postura, ante la resolución del Presidente de la República, de congelar el Salario Mínimo para el 2019. — 14 agosto 2019 — Sonicalm.
- Incorrecto retener salarios de los trabajadores, retardo o utilizar otros mecanismos para impedir el derecho del trabajador. — 13 agosto 2019 — Sonicalm.
- Origen del Aguinaldo. — 7 agosto 2019 — Sonicalm.
- No se debe congelar el Salario Mínimo 2019. Necesitamos la Tutelaridad del Presidente. — 6 agosto 2019 — Sonicalm.

Estado: la página 2 contiene más entradas después de las listadas; debe seguirse la paginación hasta no encontrar “Older Posts”.

## Centro de Documentación Digital — primera página

- Caracterización de las trabajadoras de la maquila textil frente a las violencias de género, incluida la económica en Guatemala.
- Estado de situación del sector de cuidados en Guatemala, El Salvador y Honduras.
- 52 Semanas en el Continente Americano.
- Posicionamiento de las OSC en el FPAN 2025.
- Acuerdo Ministerial 45-2018, Ministerio de Trabajo y Previsión Social, Comisión Nacional Tripartita de Relaciones Laborales y Libertad Sindical.
- El Control de Convencionalidad, una herramienta estratégica.
- La Violencia Laboral En Guatemala En El Marco Del Convenio 190 De La OIT.
- Comunicado 30 de marzo, Día latinoamericano de las trabajadoras del hogar.
- Comunicado 30 de marzo; Red Centroamericana de Trabajadoras del Hogar y los Cuidados, Día Latinoamericano de las Trabajadoras del Hogar.
- Nuestros derechos como trabajadoras del hogar. Los Acuerdos Internacionales que los respaldan, qué está sucediendo hoy en día con ellos y como podemos exigirlos.

La categoría tiene paginación. Debe continuar hasta no encontrar “Older Posts”.

## Publicaciones propias

- El Control de Convencionalidad, una herramienta estratégica. — 19 agosto 2024 — Sonicalm.
- Aporte para abordar las causas que afectan a la Laguna Chichoj, San Cristóbal Verapaz A.V. Guatemala. — 15 junio 2023 — Sonicalm.
- Trabajo doméstico en el contexto de la pandemia del COVID-19 — 6 julio 2022 — Sonicalm.
- Desigualdades y afectaciones generadas por el Covid-19 en la vida de las mujeres trabajadoras, en sectores laborales vulnerables en Guatemala, 2020-2021. — 2 diciembre 2021 — Sonicalm.
- Monitoreando la situación de trata laboral con fines de explotación sexual en Guatemala en trabajadoras domésticas y tortilleras. — 21 mayo 2021 — Sonicalm.
- La necesidad de trabajar… es un arma de dos filos… Para las trabajadoras a domicilio, el campo y del hogar… En Guatemala. — 25 enero 2016 — Sonicalm.
- Los Rostros Ocultos en la Maquila — 11 noviembre 2012 — Sonicalm.
- Las mujeres en el Mercado Laboral Guatemalteco — 12 febrero 2011 — Maritza Velasquez.
- Diagnóstico — 12 febrero 2011 — Maritza Velasquez.
- Presentaciones 2009 – 2010 — 12 febrero 2011 — Maritza Velasquez.

Adjuntos explícitos detectados:

- EC189.
- ESTUDIO METAANALISIS LAGUNA CHICHOJ SC AV (1).pdf, alojado en SlideShare.
- Situación de las trabajadoras del hogar 2010.
- Presentación Paritaria.
- Presentación Paritaria 2.
- Presentación Investigación.

## SITRADOMSA

- SITRADOMSA. — 28 mayo 2012 — Maritza Velasquez — incluye dos fotografías: Foto0044 y Foto0045.
- NUEVO SINDICATO DE TRABAJADORAS DOMESTICAS, SIMILARES Y A CUENTA PROPIA -SITRADOMSA- — 11 abril 2011 — Maritza Velasquez.

## Medios detectados que requieren descarga local

Entre otros:

- Imágenes de Inicio y Organización.
- Galería completa de Espacios de Participación.
- Imagen de El deber cívico nos llama.
- Imagen “Pure-Mariposa-Ramon-Monegal-Butterflies-WikiMedia”.
- Imagen 72073299_1097416113785006_3334792185492013056_n.
- Imagen 53636699_967685353424750_2306994537190391808_o.
- Imagen 52801035_960397260820226_7003025063247085568_n.
- Imagen 51899580_952776114915674_6714320862008311808_n.
- Imagen 48994260_926721314187821_1629341649563811840_o.jpg.
- Imagen 48377302_921158251410794_1297865428097302528_n.png.
- Imagen 48382914_920190644840888_8069150458532331520_n.
- Imagen 48266295_919029108290375_4717683294441832448_o.
- Foto0044.
- Foto0045.

## Recursos externos detectados

- SlideShare.
- Scribd.
- YouTube.
- OIT/ILO.
- Facebook.
- Twitter/X.
- Instagram.
- WordPress.com.

Los contenidos alojados en plataformas externas deben registrarse con:

- URL original.
- título exacto;
- plataforma;
- autor o cuenta;
- miniatura local cuando sea legal y técnicamente posible;
- archivo descargado cuando la plataforma lo permita;
- alternativa enlazada cuando no exista descarga pública.

## Estado real del mockup

El mockup actual no debe considerarse migrado al 100 %. `content-data.js` todavía contiene entradas incompletas o descriptivas. La nueva auditoría sustituirá progresivamente esos registros por transcripciones literales y referencias locales a medios.

## Avance de inventario automatizado

Fecha de ejecución: 26 de junio de 2026

Se creó un crawler autocontenido en `crawl_atrahdom.py`, sin dependencias externas de Python, para generar los manifiestos solicitados en `inventory/`.

Archivos generados:

- `inventory/urls.json`
- `inventory/media.json`
- `inventory/external-resources.json`
- `inventory/verification.json`
- `inventory/broken-links.json`
- `inventory/redirects.json`

Resultado de la primera pasada completa desde las semillas principales:

- URLs HTML inventariadas: 299
- Entradas detectadas: 187
- Categorías/archivos de categoría detectados: 60
- Páginas de adjuntos detectadas: 23
- Archivos de autor detectados: 20
- Páginas institucionales detectadas: 5
- Archivos de formato detectados: 3
- Página de inicio: 1
- Medios detectados: 1330
- Imágenes detectadas: 1213
- Documentos detectados: 107
- Otros medios/embeds detectados: 10
- Recursos externos detectados: 4124
- Enlaces rotos HTTP en la pasada filtrada: 0
- Redirecciones registradas en la pasada filtrada: 0

Usuarios de WordPress detectados en la pasada corregida de autorías:

- Sonicalm
- Maritza Velasquez
- brenda3cabrera

Observaciones importantes:

- El crawler ya filtra URLs de comentarios `replytocom`, enlaces `share` y rutas `trackback/`, que no deben migrarse como contenidos independientes.
- El script fue corregido para capturar autorías dentro de estructuras WordPress como `span.author.vcard`.
- Después de detectar contaminación de taxonomías por enlaces globales, el script fue corregido para aceptar categorías solo desde enlaces con `rel="category tag"`.
- La regeneración de los JSON con esa última corrección de taxonomías quedó pendiente porque el entorno rechazó nuevas ejecuciones con red por límite de uso.
- Por lo anterior, los JSON actuales deben considerarse línea base de inventario, no inventario verificado final de taxonomías.
- Los recursos externos están inflados por widgets globales de WordPress.com, redes sociales y elementos de plantilla. Deben separarse en una pasada posterior entre dependencias del cuerpo editorial y dependencias globales descartables.
- Ningún registro debe marcarse como `verified` todavía; `inventory/verification.json` queda inicializado para revisión posterior.
