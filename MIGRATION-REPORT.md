# Reporte de migración ATRAHDOM

Fecha: 26 de junio de 2026

## Estado actual

Se inició la Fase 1 de inventario exhaustivo del portal original `https://atrahdom.org/`.

La herramienta principal creada es `crawl_atrahdom.py`. El script:

- recorre enlaces internos desde semillas principales;
- filtra comentarios, enlaces de compartir y trackbacks;
- clasifica URLs por tipo;
- registra imágenes, documentos, embeds y enlaces externos;
- inicializa la matriz de verificación;
- escribe checkpoints en `inventory/` durante el recorrido;
- no depende de `requests` ni `BeautifulSoup`.

## Manifiestos generados

- `inventory/urls.json`
- `inventory/media.json`
- `inventory/external-resources.json`
- `inventory/verification.json`
- `inventory/broken-links.json`
- `inventory/redirects.json`

## Totales de la pasada actual

- URLs inventariadas: 299
- Entradas: 187
- Categorías/archivos: 60
- Páginas de adjuntos: 23
- Archivos de autor: 20
- Páginas institucionales: 5
- Archivos de formato: 3
- Inicio: 1
- Medios: 1330
- Imágenes: 1213
- Documentos: 107
- Otros medios/embeds: 10
- Recursos externos: 4124
- Enlaces rotos: 0
- Redirecciones: 0

## Avance posterior al inventario

Se añadieron dos herramientas nuevas:

- `migrate_content.py`
  - lee `inventory/urls.json` y `inventory/media.json`;
  - elimina ruido técnico como píxeles de seguimiento;
  - deduplica variantes de imagen con parámetros `?w=`, `?h=`, `resize`, `fit` y similares;
  - descarga imágenes, documentos, audio, video y otros adjuntos a `assets/`;
  - conserva hash SHA-256, tamaño, tipo MIME, URL final y ruta local;
  - descarga el HTML fuente de páginas, entradas y adjuntos;
  - extrae literalmente el contenedor WordPress de contenido;
  - elimina únicamente bloques globales de compartir, navegación, comentarios y relacionados;
  - reescribe imágenes, documentos y enlaces internos hacia rutas locales;
  - genera `content/items.json`, `content/site.json`, `content/site-data.js` y archivos HTML individuales.

- `verify_migration.py`
  - compara texto y estructura del contenido extraído contra el archivo local renderizado;
  - compara encabezados, párrafos, listas, enlaces, imágenes, tablas, figuras, iframes y adjuntos;
  - actualiza `inventory/verification.json`;
  - no marca contenidos como verificados automáticamente: los deja en revisión visual cuando pasan las comprobaciones estructurales.

## Pendientes inmediatos

1. Regenerar los JSON con la última corrección de taxonomías de `crawl_atrahdom.py`.
2. Ejecutar `migrate_content.py` con acceso de red para descargar medios y extraer cuerpos literales.
3. Ejecutar `verify_migration.py`.
4. Adaptar `app.js` para consumir `content/site-data.js` en lugar de `content-data.js`.
5. Realizar revisión visual URL por URL antes de marcar registros como `verified`.
6. Separar recursos externos editoriales del ruido global de WordPress.com, widgets sociales y plantilla.

## Advertencias

Los JSON actuales son una línea base de inventario, no una migración completa ni verificada.

La última ejecución con red fue rechazada por límite del entorno antes de regenerar los manifiestos con la corrección final de taxonomías. El script ya contiene la corrección, pero los JSON deben recrearse cuando vuelva a estar disponible la ejecución con red.
