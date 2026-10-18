# Estructura Completa de `derguis-gummies/assets`

Esta carpeta contiene todos los activos limpios, fotogramas clave 16:9 con las etiquetas reales de **Viti Nutrition & Wellness**, recortes de gomitas, scripts de automatización para Antigravity CLI y el proyecto web completo en Astro + Firebase Hosting.

## Subcarpetas Categorizadas

1. **`01-source-bottles-clean/`**
   - `viti-biotina-clean.png` / `.webp`: Frasco original de **Viti Biotina + Multivitamínico** (etiqueta fucsia + osito azul mora, 120 g) sin barras de interfaz de móvil.
   - `viti-acv-clean.png` / `.webp`: Frasco original de **Viti Apple Cider Vinegar** (etiqueta roja + osito rojo manzana, 120 g) con los avatares flotantes eliminados y sombra de estudio restaurada.
   - `viti-triptofano-clean.png` / `.webp`: Frasco original de **Viti L-triptófano** (etiqueta morada + osito morado cherry, 120 g) limpio.

2. **`02-gummies-cutouts/`**
   - `gummy-biotina-blue-mora.png` / `.webp`: Recorte en alta resolución (3x Lanczos) del osito azul turquesa.
   - `gummy-acv-red-manzana.png` / `.webp`: Recorte en alta resolución del osito rojo rubí.
   - `gummy-triptofano-purple-cherry.png` / `.webp`: Recorte en alta resolución del osito morado.

3. **`03-keyframes-16x9/`**
   - `keyframe-01.webp` / `.jpg`: Hero 16:9 (`1920x1080`) con el bote real de **Viti Biotina + Multivitamínico**.
   - `keyframe-02.webp` / `.jpg`: Keyframe 16:9 (`1920x1080`) con el bote real de **Viti Apple Cider Vinegar**.
   - `keyframe-03.webp` / `.jpg`: Keyframe 16:9 (`1920x1080`) con el bote real de **Viti L-triptófano**.
   - `keyframe-04.webp` / `.jpg`: Keyframe 16:9 (`1920x1080`) macro con los 3 ositos reales (rojo, azul y morado).
   - `keyframe-05.webp` / `.jpg`: Keyframe 16:9 (`1920x1080`) con el Pack Trifecta de los 3 frascos reales de Viti.

4. **`04-scripts-and-skill/`**
   - Scripts de Node.js (`01-generate-keyframes.js`, `02-generate-clips.js`) y Bash (`03-encode-scroll.sh`) listos para usar con Antigravity CLI (`agy`).

5. **`05-marketing-strategy/`**
   - Guía de arquitectura de conversión DTC y Prompts de cámara para Google Veo.

6. **`06-astro-firebase-webapp/`**
   - Proyecto completo en **Astro + Tailwind CSS + Firebase Hosting** con los 5 keyframes auténticos ya pre-cargados en `public/media/keyframes/` y los recortes en `public/media/products/`.
