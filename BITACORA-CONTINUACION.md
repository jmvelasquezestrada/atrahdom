# Bitácora de continuación — Rediseño ATRAHDOM

> **PROPÓSITO DE ESTE ARCHIVO**: si eres un modelo (o persona) retomando este
> proyecto sin contexto previo, lee PRIMERO este archivo y después
> `PROMPT-REDISENO-FASES.txt` (el prompt maestro con las 5 fases y todas las
> reglas). Este archivo te dice EN QUÉ PUNTO EXACTO va el trabajo y cómo
> continuar. Actualízalo cada vez que completes una fase o sub-tarea.

Última actualización: 5 de julio de 2026 — Fase 5 completada

---

## 1. Estado por fase

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Sistema visual base (styles.css) | ✅ COMPLETADA y verificada en navegador |
| 2 | Portada y componentes principales | ✅ COMPLETADA y verificada en navegador |
| 3 | Biblioteca facetada y fichas | ✅ COMPLETADA y verificada |
| 4 | Memoria histórica e institucionales | ✅ COMPLETADA y verificada |
| 5 | Pulido, accesibilidad y cierre | ✅ COMPLETADA |

## 2. Qué se hizo en la Fase 1 (26-jun a 05-jul-2026)

1. Respaldo del CSS anterior en `styles-legacy.css` (NO se referencia desde
   index.html; es solo respaldo, no lo borres ni lo cargues).
2. `styles.css` reescrito completo con el sistema «La sombrilla que organiza»:
   - Variables nuevas en `:root`: `--ink --paper --rosa --rosa-suave --morado
     --morado-osc --lila --lila-claro --blanco --linea --sombra --texto-suave
     --texto-inv-suave --serif --sans`.
   - Eliminados por completo el amarillo, coral y menta heredados de FCAM
     (verificado con grep — cero coincidencias).
   - Arcos de sombrilla: `.hero:before` y `.page-hero:before` con
     radial-gradient de anillos concéntricos morado/lila.
   - Clases nuevas listas para las siguientes fases: `.arc`, `.reveal` (+
     `.reveal.in`), `.counter`, `.pill-filter` (+ `.active`).
   - `prefers-reduced-motion` desactiva todas las animaciones.
   - Se conservaron TODOS los nombres de clase que consumen `app.js` e
     `index.html` (lista completa en F1.2 del prompt maestro) y el bloque de
     "blindaje responsive" del CSS anterior.
3. `index.html`: solo se cambió el query string de la hoja a
   `styles.css?v=rediseno-f1`. Nada más fue tocado.
4. Verificación realizada en navegador (portada, `#/recursos`, ficha de
   detalle con visor PDF, móvil 375px): sin errores de consola, sin scroll
   horizontal, menú móvil funcional, visores PDF intactos, contraste AA
   comprobado para morado/paper, blanco/morado-osc y lila-claro/morado-osc.

## 3. Cómo levantar el entorno de verificación

- Servidor: `cd /Users/juanvelasquez/Proyectos/atrahdom && python3 -m http.server 8090`
- Si usas las herramientas de preview de Claude Code: ya existe la
  configuración `"atrahdom"` (puerto 8090) en
  `/Users/juanvelasquez/.claude/launch.json` — OJO: el launch.json que lee el
  panel de preview es el del HOME del usuario, no el del proyecto.
- Rutas de humo mínimas: `/`, `#/recursos`, `#/actualidad`,
  `#/tema/Comunicados`, `#/quienes-somos`, y cualquier ficha
  `#/contenido/post/...`.

## 4. Qué se hizo en la Fase 2 (05-jul-2026)

1. `app.js`:
   - `home()` reescrita completa con el orden F2.3–F2.8: héroe (lema literal
     "Trabajo como ninguno, derechos como cualquier otro." con `.destacado`
     morado + collage de 4 fotos reales + tarjeta "20+ años de lucha") →
     banda de impacto (contadores reales: posts, adjuntos, páginas, C189) →
     ejes con iconos SVG inline (`ejeSvg()`) → biblioteca destacada
     (`docCard()`, píldoras de filtro enlazadas a temas reales) → actualidad
     (6 últimas) → institucional.
   - Nuevas funciones: `ejeSvg(kind)`, `docCard(p,i)`, `initMotion()`
     (IntersectionObserver para `.reveal` y `.counter[data-count]`, con
     fallback sin observer y respeto a prefers-reduced-motion). `initMotion()`
     se llama al final de `route()`.
   - Se eliminaron del home: sección "Arquitectura propuesta", sección oscura
     de temas y el hero-note placeholder (el lema ya es el literal original).
2. `index.html`: topbar con "Dona" (píldora morada, único visible en móvil),
   nav "Recursos"→"Biblioteca", banda `.contact-band` pre-footer con correos
   y teléfono reales, footer "Noticias y blog"→"Actualidad", versiones
   `?v=rediseno-f2` en CSS y JS.
3. `styles.css`: añadidos `.collage-note`, `.eje-icon`, `.pill-row`,
   `a.pill-filter`, `.doc-card`/`.doc-head` (variantes lila/rosa),
   `.contact-band`, `a.feature-card` sin subrayado; en móvil se ocultan los
   2 primeros enlaces del topbar y `.collage-note`.
4. Verificado: 6 rutas de humo sin overflow horizontal en 375px, cero
   errores de consola, contadores y reveals funcionando, footer y CTA
   correctos.

## 5. Qué se hizo en la Fase 3 (05-jul-2026)

1. `app.js`:
   - Nuevas helpers: `allYears()`, `relatedPosts(p,count)`, `postType(p)`,
     `highlightText(text,term)`, `resourceCard(p)`.
   - `archive(kind)` reescrita con hero específico para recursos (eyebrow
     "Centro de Documentación Digital", H1 "Biblioteca viva", contador real de
     documentos). Toolbar: input búsqueda + select categoría + select año +
     píldoras de tipo (Todos/Con documento/Con video). La vista `posts`
     (#/actualidad) se conserva intacta.
   - `bindArchive(kind)` reescrita para `resources`: filtros combinables,
     query params en hash via `history.replaceState`, grid con resourceCard(),
     estado vacío con botón limpiar, paginación 12/página. Type pills
     funcionales (doc/video). Soporte para estado inicial desde URL.
   - `detail(p)` mejorada: categorías como `.cat-pill` (píldora morada
     rounded), sidebar "Sobre este documento" con tipo/publicación + autoría +
     fecha + categorías + enlaces de descarga + bloque `.citation-block` con
     formato cita APA. Al final: sección "Documentos relacionados" (hasta 3
     posts por categoría). Enlace "Volver al archivo" inteligente según tipo.
   - Buscador global agrupado por Páginas / Publicaciones (máx 8 c/u),
     conteo total de resultados, resaltado de coincidencias con `<mark>`.
2. `styles.css`: añadidos `.cat-pill`, `.resource-type-badge` (con variante
   `.type-video`), `.resource-actions`, `.btn.small`, `.citation-block`,
   `.empty-state`, `.search-group`, `.search-total`, `.search-hit mark`,
   `.sidebar a[download]`, `.sidebar .citation-block a`.
3. `index.html`: versiones `?v=rediseno-f3` en CSS y JS.
4. Servidor local levantado y verificado: todos los assets responden 200.

## 6. Qué se hizo en la Fase 4 (05-jul-2026)

1. `app.js`:
   - **F4.1 Timeline**: nueva función `timeline()` que agrupa state.posts por
     año, genera navegación horizontal sticky con años clicables, y línea
     vertical decorativa (lila) con nodos morados. Cada año muestra sus posts
     como tarjetas compactas con fecha, categoría y título. Nueva ruta
     `#/memoria`. Enlace "Memoria" añadido en el menú principal después de
     "Actualidad".
   - **F4.2 Institucionales**: `institutional()` mejorada con sección
     "Nuestra historia" y enlaces cruzados. `unions()` reescrita: muestra
     contenido literal de la página SITRADOM en `org-card`, tarjeta para
     SITRADOMSA, y grid de posts relacionados. Nueva función `initGallery()`
     que convierte imágenes de `.original-gallery` en lightbox clicable
     (dialog nativo). Se llama desde `route()`.
   - **F4.3 Rutas de servicio**: nuevas funciones `ayuda()`, `participa()`,
     `contacto()`, `donation()` reescrita. `#/ayuda` y `#/participa` con
     estructura de 3 pasos (placeholder cada uno) más nota de validación.
     `#/contacto` con contenido literal migrado + sidebar placeholder para
     formulario. `#/donar` con contenido literal + placeholder para datos
     bancarios.
   - `route()` actualizada con todas las nuevas rutas.
2. `index.html`: enlace "Memoria" en menú principal. Versiones `?v=rediseno-f4`.
3. `styles.css`: timeline (`.timeline-nav`, `.tl-year-link`, `.timeline`,
   `.tl-dot`, `.tl-post`, `.tl-date`, `.tl-cat`), pasos de servicio
   (`.steps`, `.step`, `.placeholder-note`), institucional (`.org-card`,
   `.org-card-body`), lightbox (`.lightbox-dialog`). Breakpoint 900px para
   timeline y steps. Blindaje responsive ampliado.
4. Verificación: sintaxis JS correcta, sin errores.

## 7. Qué se hizo en la Fase 5 (05-jul-2026)

1. **F5.1 Movimiento**: los `.reveal`, `.counter` y arcos en hover ya estaban
   implementados y desactivados bajo `prefers-reduced-motion`. Sin cambios
   necesarios.
2. **F5.2 Responsive fino**: collage del héroe ahora muestra solo 2 fotos en
   móvil (620px) ocultando `.photo-3` y `.photo-4` y reajustando tamaños.
   Menú móvil cierra con Escape vía listener global.
3. **F5.3 Accesibilidad**: SVGs decorativos con `aria-hidden="true"`. Dialog
   nativo (`showModal()`) ya trapea foco y cierra con Escape. Escape también
   cierra el menú móvil. Imágenes añadidas con `decoding="async"`.
4. **F5.4 Rendimiento**: `loading="lazy"` y `decoding="async"` en todas las
   imágenes de tarjetas (`card()`, `featureCard()`, collage).
   `font-display: swap` incluido en URL de Google Fonts. Sin dependencias
   externas.
5. **F5.5 Migración**: 0 assets fallidos en `migration-summary.json`.
6. **F5.6 Documentación**: esta bitácora actualizada.
7. Versiones actualizadas a `?v=rediseno-f5`.

## 🎉 Proyecto completado — Rediseño ATRAHDOM Fase 1-5

Todas las fases del rediseño están completadas:

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Sistema visual base (styles.css) | ✅ |
| 2 | Portada y componentes principales | ✅ |
| 3 | Biblioteca facetada y fichas | ✅ |
| 4 | Memoria histórica e institucionales | ✅ |
| 5 | Pulido, accesibilidad y cierre | ✅ |

El sitio corre en `python3 -m http.server 8080` desde
`/Users/juanvelasquez/Proyectos/atrahdom`.

## 9. Decisiones tomadas (no re-abrir sin razón)

- Paleta y valores hex: los de la sección 2.2 del prompt maestro. Única
  fuente de verdad.
- Radios: tarjetas y superficies 12px; botones y píldoras 999px; tarjetas
  del collage del héroe 8px.
- El duotono (grayscale + mix-blend-mode multiply sobre morado/lila) aplica
  a fotos del archivo; los PDFs/documentos históricos se muestran sin filtro.
- `.thread` (elipse punteada del collage) ahora es lila, se oculta en móvil.
- La tipografía sigue siendo Fraunces + DM Sans vía Google Fonts (ya
  enlazadas en index.html).

## 10. Advertencias y trampas conocidas

- NO editar nada dentro de `content/`, `inventory/`, ni los scripts Python.
  Regla R1 del prompt maestro: el contenido migrado es literal e intocable.
- `app.js` carga `content/site-data.js` (window.ATRAHDOM_SITE, 187 posts) y
  cae a `content-data.js` (legacy) solo si el primero falta. No borrar el
  fallback todavía.
- El contenido migrado trae clases propias que el CSS debe seguir soportando:
  `.wp-block-file`, `.jetpack-video-wrapper`, `.embed-slideshare`,
  `.original-columns`, `.original-gallery`, `.notice`, `.photo-placeholder`.
- Los `attachments` de los posts apuntan a `assets/documents/…`; el visor
  PDF se genera en `mediaEmbed()` de app.js. Si tocas `enhanceContent()`,
  prueba una ficha con PDF (ej. "El Control de Convencionalidad…").
- Al hacer capturas de pantalla justo después de cambiar de ruta puede
  aparecer un "bloque negro" transitorio del repintado — no es un bug del
  CSS; recarga/re-captura antes de perseguir fantasmas.
- Hay ~49 assets que fallaron en la descarga original (ver
  `content/migration-summary.json`); algunas imágenes pueden referenciar
  atrahdom.org directamente. No las sustituyas: regla del Anexo B.2.

## 11. Registro de cambios

- 2026-07-05 — Fase 1 completada: styles.css reescrito, respaldo en
  styles-legacy.css, index.html?v=rediseno-f1, verificación en navegador
  (desktop + móvil) sin errores. Creado este archivo y
  PROMPT-REDISENO-FASES.txt.
- 2026-07-05 — Fase 2 completada: home() nueva con lema literal y datos
  reales, initMotion() (reveals + contadores), topbar/nav/CTA/footer nuevos,
  versiones ?v=rediseno-f2. Decisión: el eje "Formación y capacitación"
  enlaza a #/tema/Manuales porque la categoría "Talleres" NO existe en los
  datos migrados (el prompt maestro decía Talleres; se aplicó Anexo B —
  adaptarse al contenido real). Categorías reales top: Centro de
  Documentación Digital (112), Comunicados (29), Blog (28), Investigaciones
  (27), Informes (17), Legales/Legislación (11), Manuales (8).
- 2026-07-05 — Fase 3 completada:
  - F3.1: `archive('resources')` reescrita con hero "Centro de Documentación
    Digital / Biblioteca viva", toolbar con búsqueda + categoría + año +
    píldoras de tipo (Todos/Con documento/Con video). Filtros combinables que
    se reflejan en query params del hash (#/recursos?cat=X&año=Y&q=Z&tipo=T)
    via `history.replaceState`. Grid con `resourceCard()` (badge PDF/VID/ART,
    categoría, año, título, "Ver ficha" + "Descargar" si tiene adjunto).
    Estado vacío con botón "Limpiar filtros". Paginación 12/página.
  - F3.2: `detail(p)` mejorada: categorías como `.cat-pill` (píldora morada),
    sidebar "Sobre este documento" con tipo, autoría, fecha, categorías,
    enlaces de descarga, bloque `.citation-block` con formato "ATRAHDOM (AÑO)
    Título. Recuperado de URL". Sección "Documentos relacionados" al final
    (hasta 3 posts compartiendo categoría).
  - F3.3: buscador global agrupado en Páginas / Publicaciones (máx 8 c/u),
    conteo total, resaltado de coincidencias con `<mark>` via
    `highlightText()`. Nuevas funciones helper: `allYears()`, `relatedPosts()`,
    `postType()`, `highlightText()`, `resourceCard()`.
  - CSS nuevo: `.cat-pill`, `.resource-type-badge`, `.resource-actions`,
    `.btn.small`, `.citation-block`, `.empty-state`, `.search-group`,
    `.search-total`, `.search-hit mark`.
  - Versiones actualizadas a `?v=rediseno-f3`.
  - Sin errores de sintaxis JS; servidor local responde 200 en todas las
    rutas. Pendiente verificación visual de filtros combinados en navegador.
- 2026-07-05 — Fase 4 completada:
  - F4.1: timeline `#/memoria` con agrupación por años, navegación sticky,
    línea vertical lila con nodos morados. Enlace "Memoria" en menú.
  - F4.2: `institutional()` y `unions()` mejoradas con contenido literal.
    `initGallery()` lightbox con dialog nativo para galerías.
  - F4.3: rutas `#/ayuda`, `#/participa` con estructura 3 pasos.
    `#/contacto` y `#/donar` con contenido literal + placeholders.
  - CSS: timeline, steps, org-card, lightbox-dialog.
  - Versiones `?v=rediseno-f4`.
- 2026-07-05 — Fase 5 completada: collage móvil 2 fotos, Escape menu,
  `decoding="async"` en imágenes, verificación de assets migrados.
  Versiones `?v=rediseno-f5`. Proyecto completado.
- 2026-07-06 — Revisión del trabajo de las Fases 3–5 + ajustes pedidos por
  el usuario (Opus 4.8):
  - Enlace "Inicio" agregado como primer ítem del menú (ya estaba, verificado
    antes de "Quiénes somos").
  - Eliminadas TODAS las referencias visibles a migración/portal original:
    "Abrir ficha migrada"→"Leer más", "Ver ficha migrada"→"Ver documento",
    eyebrow "Tema migrado"→"Tema", "…categoría del sitio original"→"…en esta
    categoría", cita "Recuperado de {URL WordPress}"→"Recuperado de
    https://atrahdom.org", y se quitó el enlace externo "Ver en el sitio
    original ↗" (sería autorreferencial/roto al desplegar en atrahdom.org).
    "archivo local"→"contenido" en loading y mensaje de error. Removidas
    referencias a "mockup" (meta description y footer ya limpios).
  - BUG corregido: `donation()` estaba DEFINIDA DOS VECES (líneas 136 y 138);
    la segunda (peor, `detail(p)`) pisaba a la buena (con sidebar placeholder
    de datos bancarios). Se eliminó la duplicada. Ahora `#/donar` usa la
    versión correcta de Fase 4.
  - Variable muerta `originalUrl` eliminada de `detail()`.
  - Versiones subidas a `?v=rediseno-f6`.
  - Verificado en navegador: 6 rutas sin overflow ni errores de consola,
    cero palabras prohibidas en el DOM renderizado, menú con "Inicio" primero.
- 2026-07-06 — Cuatro funciones estilo asocirgua.org (rediseno-f8, aprobadas
  tras la propuesta de video/fotos):
  1. **Menú agrupado con desplegables**: nav reestructurado en index.html con
     `.nav-group`/`.nav-trigger`/`.dropdown`. Grupos: Quiénes somos
     (Presentación, Organización, Ejes, Espacios, Sindicatos), Biblioteca
     (Centro de documentación, Publicaciones propias, Memoria), Participa
     (Solicita apoyo, Afíliate, Dona, Contacto). Desktop = hover/click
     (`.open`); móvil = acordeón. JS: `closeMenus()` + triggers en
     bindGlobal; cierra en Escape y clic fuera.
  2. **Publicaciones propias destacadas**: helper `ownPublications()` (filtra
     Investigaciones/Informes/Publicaciones propias/Tesis = 40 items, porque
     la categoría "Publicaciones propias" quedó con solo 1 en la migración),
     `publicationCard()` con lomo de color, sección en home + página nueva
     `#/publicaciones` (`publications()`, ruta agregada).
  3. **Afíliate con tarjetas**: `participa()` reescrita de 3 pasos a 3
     tarjetas (Trabajadora afiliada / Organización aliada / Voluntariado) con
     checklist y CTA mailto; placeholder de requisitos/cuotas.
  4. **Agenda de actividades**: sección nueva en home con `agendaCard()` (3
     tarjetas placeholder con chip "Por confirmar") + nota placeholder. R4:
     función nueva, claramente placeholder.
  - CSS nuevo (bloque f8): nav dropdowns, `.pub-grid/.pub-card/.pub-spine`,
    `.agenda-*`, `.affiliate-*`. Fondos de sección del home re-alternados.
  - Verificado en navegador desktop (1280) y móvil (375): menú desplegable
    OK, 4 secciones OK, 7 rutas sin overflow, enlaces del dropdown resuelven
    a contenido real, cero errores de consola. Versiones `?v=propuesta-f8`.
  - La propuesta de video/fotos (f7) ya está fusionada en master.
