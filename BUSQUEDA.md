# Búsqueda de ATRAHDOM

## Fuente y construcción

`content/search-index.json` es un artefacto generado, no un catálogo editado a mano.
Lo produce `scripts/generate_search_index.py` a partir de `content/site.json`,
`content/editorial-config.json`, `content/blog-posts.js`, los archivos de contenido
y las páginas públicas locales. Usa Python estándar y Node.js (solo para leer el
catálogo JavaScript existente dentro de un contexto aislado).

Escribe únicamente `content/search-index.json`. No genera ni reemplaza páginas.
Comprueba que las fichas públicas de CENDOC y Comunicados coincidan con sus
colecciones y falla ante fichas ausentes, sobrantes, fuentes ausentes o rutas duplicadas.
Descubre las páginas estáticas y las rutas limpias existentes; conserva las rutas
heredadas de contenidos que no tienen una página estática equivalente.
Los índices de colecciones no se incluyen como documentos ni se indexa el HTML
histórico de la portada como una publicación.

Los dos generadores de fichas llaman al generador de búsqueda al terminar.
Después de editar un artículo, sus metadatos, el catálogo o una página estática,
el último paso de construcción es:

```powershell
& 'C:\Users\amarr\AppData\Local\Python\pythoncore-3.15-64\python.exe' -B scripts/generate_search_index.py
& 'C:\Users\amarr\AppData\Local\Python\pythoncore-3.15-64\python.exe' -B scripts/generate_search_index.py --check
node scripts/test_search.cjs
```

Publicar juntos el índice, sus fuentes y `js/search.js`. Si cambia este último,
actualizar también su versión en las etiquetas script. El índice guarda hashes
SHA-256 de sus fuentes; `--check` vuelve a construir en memoria y detecta cambios,
incluidas nuevas páginas. Los recuentos de ejecución se derivan del catálogo,
no de constantes 75/37. Esas cantidades solo son expectativas de aceptación actuales.

## Criterios comunes

- `js/search.js` sirve a CENDOC, Comunicados y al diálogo general.
- Todos los términos son obligatorios (AND), pero pueden aparecer en campos distintos
  y en cualquier orden. Cada término admite coincidencia parcial dentro de una palabra.
- Se normalizan Unicode, tildes, mayúsculas, espacios y signos/separadores.
- Una consulta vacía mantiene el catálogo; en el diálogo general no muestra resultados.
- Se consultan título, cuerpo editorial, descripción/extracto, autoría, instituciones,
  fecha, categorías, etiquetas disponibles, identificador y ruta del registro.
- Puntuación: título exacto 10000; frase incluida en título 5000; cada término aporta
  100 si coincide en título, 40 en identidad/metadatos, 15 en descripción o 1 en cuerpo.
  Se toma la mayor de esas aportaciones por término. Desempate: fecha descendente,
  título en español y ruta. Sin consulta se ordena por fecha y después por título.
- Los tres accesos paginan de 12 en 12 y permiten recorrer todas las coincidencias.
- CENDOC conserva filtros de categoría, año y presencia de documento/video. Se aplican
  antes de ordenar los resultados. Cambiar una consulta o filtro vuelve a la página 1.
- Comunicados reutiliza los nodos de las tarjetas generadas; no tiene otro catálogo manual.

## Integridad y errores

El navegador solicita el índice y sus tres catálogos principales con `cache: no-store`
y verifica hashes y recuentos antes de habilitar el buscador. No presenta una lista
parcial como completa: muestra carga o error identificable y botón Reintentar.
Los códigos incluyen `SEARCH_SOURCE_HTTP`, `SEARCH_INDEX_STALE`,
`SEARCH_COLLECTION_INCOMPLETE`, `SEARCH_DUPLICATE_ROUTE` y `SEARCH_CARDS_STALE`.
Los errores se registran con el prefijo `[ATRAHDOM_SEARCH]` en consola.
En Comunicados se contrasta además el índice con las tarjetas del HTML recibido.
El diálogo vuelve a comprobar los datos cada vez que se abre.

La discrepancia histórica 74/75 fue transitoria: el mismo recorrido acabó mostrando
75 sin editar los datos. Durante la implementación se reprodujo una mezcla de HTML
nuevo con `app.js` anterior bajo su URL de versión antigua; se corrigió la referencia.
Eso demuestra el riesgo de recursos antiguos, pero no identifica de manera concluyente
qué respuesta concreta originó el primer recuento de 74. La nueva búsqueda no depende
para su cobertura del catálogo JavaScript ya cargado por la SPA.

## Contenido y límites

Se extrae el artículo `.prose`/`.blog-editorial` o el contenido de `main`, excluyendo
scripts, estilos, navegación, cabeceras, pies, barras laterales y nodos ocultos.
Las páginas nuevas que no estén en los catálogos se descubren desde los HTML públicos.
No se inventan autores, instituciones, etiquetas ni identificadores ausentes.
Las dos correcciones bibliográficas toman como fuente `editorial-config.json` y las
fichas públicas que ya contienen Elvira Madrid Romero y ATRAHDOM correctamente.

No se extrae texto de PDF ni se hace OCR. Tampoco se descargan ni se indexan los
contenidos de iframes externos, Scribd o YouTube. Se busca en el texto HTML y los
metadatos locales; que una palabra exista solo dentro de un documento no garantiza
que se encuentre. Una caída de la fuente externa no impide buscar su ficha local.

## Aceptación ejecutada en localhost

- Los 75 títulos de CENDOC y 37 de Comunicados, en sus colecciones y en el general.
- SITRADOMSA, descripción exclusiva del acta, autora e institución de Convencionalidad,
  año, fragmentos, tildes, mayúsculas, puntuación, guiones y términos no contiguos.
- Donar y Quiénes somos: encontrados y abiertos desde el general.
- Filtros de categoría, año y documento/video; apertura de Convencionalidad desde CENDOC.
- Los 37 comunicados recorridos en sus cuatro páginas y FPAN abierto desde su búsqueda.
- General: 69 resultados para trabajo, recorridos sin duplicados en seis páginas.
- Sin contaminación del pie en las entradas del blog; término inexistente sin coincidencias.
- Consola de los accesos revisados sin errores de búsqueda.
- Pruebas Node de HTTP fallido, índice incompleto, hash obsoleto y recuperación:
  simulación en memoria, sin alterar el servidor ni sus archivos.

La producción no se probó ni se publicó en esta intervención. Los fallos de red se
simularon en pruebas Node; no se detuvo el servidor para provocarlos en el navegador.

## Archivos de esta intervención

Las modificaciones en HTML sustituyen exclusivamente los controladores de búsqueda y sus referencias de scripts; no regeneran el contenido de las páginas.

- `BUSQUEDA.md`
- `app.js`
- `blog/10-anos-del-c189/index.html`
- `blog/coalicion-de-genero-y-comercio/index.html`
- `blog/conoce-tus-derechos-aguinaldo-bono-14-prestaciones/index.html`
- `blog/derechos-laborales-son-derechos-sin-fronteras/index.html`
- `blog/desde-el-2016-se-abrio-la-puerta-del-infierno-en-guatemala/index.html`
- `blog/despliega-tus-alas/index.html`
- `blog/dia-internacional-de-la-eliminacion-de-la-violencia-contra-la-mujer/index.html`
- `blog/el-deber-civico-nos-llama/index.html`
- `blog/hemos-tocado-puertas-y-no-hemos-logrado-mas-que-setir-la-discriminacion-hacia-nuestra-condicion/index.html`
- `blog/historia-del-dia-de-la-revolucion-del-20-de-octubre-en-guatemala/index.html`
- `blog/incorrecto-retener-salarios-de-los-trabajadores-retardo-o-utilizar-otros-mecanismos-para-impedir-el-derecho-del-trabajador/index.html`
- `blog/index.html`
- `blog/juana-raymundo-una-lider-silenciada-por-defender-su-territorio-nuestro-territorio/index.html`
- `blog/la-comida-que-alimenta-al-mundo-un-analisis-en-la-era-digital/index.html`
- `blog/la-migracion-una-necesidad-de-sobrevivencia/index.html`
- `blog/la-privatizacion-de-la-lactancia-materna/index.html`
- `blog/la-realizacion-del-v-encuentro-latinoamericano-de-trabajadoras-domesticas-en-guatemala/index.html`
- `blog/las-energias-limpias/index.html`
- `blog/las-necesidades-de-la-poblacion-vulnerada-por-la-indiferencia/index.html`
- `blog/libertad-de-asociacion/index.html`
- `blog/manifestamos-nuestra-postura-ante-la-resolucion-del-presidente-de-la-republica-de-congelar-el-salario-minimo-para-el-2019/index.html`
- `blog/mas-del-77-de-la-poblacion-sin-empleos-dignos-un-aproximado-del-25-de-la-poblacion-sin-empleo/index.html`
- `blog/no-se-debe-congelar-el-salario-minimo-2019-necesitamos-la-tutelaridad-del-presidente/index.html`
- `blog/nueva-imagen-de-nuestra-pagina-web/index.html`
- `blog/nuevos-apartados/index.html`
- `blog/organizacion-trabajadoras-guatemala/index.html`
- `blog/origen-del-aguinaldo/index.html`
- `blog/pacto-mundial-para-el-empleo/index.html`
- `blog/por-malos-tratos-trabajadora-decide-quitarse-la-vida/index.html`
- `blog/que-es-el-autocuidado/index.html`
- `blog/que-es-el-conasso/index.html`
- `blog/que-significa-una-mediacion-judicial/index.html`
- `blog/revolucion-de-1944-derechos-de-las-trabajadoras/index.html`
- `blog/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/index.html`
- `blog/sitradomsa-2011/index.html`
- `blog/trabajo-del-hogar-remunerado-y-no-remunerado/index.html`
- `cendoc/index.html`
- `comunicados/index.html`
- `contacto/index.html`
- `content/editorial-data.js`
- `content/search-index.json`
- `content/site-data.js`
- `content/site.json`
- `donar/index.html`
- `index.html`
- `js/search.js`
- `quienes-somos/index.html`
- `scripts/generate_cendoc_pages.py`
- `scripts/generate_comunicados_pages.py`
- `scripts/generate_search_index.py`
- `scripts/test_search.cjs`
