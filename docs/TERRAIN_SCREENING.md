# Evaluación del entorno a escala DEM

Este bloque implementa el análisis preliminar del terreno del punto 6. Complementa el horizonte de iluminación y comunicaciones con un estudio estático de pendientes y desniveles alrededor de cada candidato. No certifica la seguridad de un aterrizaje.

## Cobertura y selección de fuente

Se usa el DEM PGDA Site04 derivado a 20 m cuando la totalidad del círculo solicitado, más el margen de una celda para derivadas, queda dentro de su extensión. En caso contrario se usa el recorte regional LOLA de 80 m si cubre todo el entorno. Esto amplía la **evaluación estática** al recorte regional de 240 × 240 km, pero no amplía el horizonte temporal de luz/radio calculado previamente alrededor de Shackleton.

Cada archivo se verifica por tamaño y SHA-256 antes de usarlo. Un fallo de descarga o integridad del DEM seleccionado produce `unavailable`: no se cambia silenciosamente a otra resolución. Un entorno que no cabe completo produce `outside`. Un radio menor que dos pasos de la malla seleccionada produce `insufficient-resolution`. Valores no finitos dentro del entorno o de su stencil producen `unavailable`. No se rellenan huecos con ceros ni se extrapola en bordes.

Fuentes y procedencia de los binarios: `terrainMetadata.json`, `regionalMetadata.json` y `public/terrain/README.md`. El producto original de Site04 tiene 5 m/píxel; **esta aplicación calcula con su derivado de 20 m**, no con los 5 m originales. Los resultados no son los mapas oficiales de pendiente o incertidumbre publicados por PGDA, sino cálculos propios sobre los DEM instalados.

## Algoritmo y escala

Las coordenadas se proyectan en la estereográfica polar sur con R=1.737.400 m. La escala local k=1+ρ²/(4R²) convierte aproximadamente distancias proyectadas a terreno. El círculo se define usando la escala en el candidato; no es una elipse geodésica ni una huella de patas. El dominio máximo de radio es 2 km.

Para cada centro de celda dentro del círculo se calcula pendiente = atan(k·hypot(z_derecha−z_izquierda, z_arriba−z_abajo)/(2·paso)). Se emplean alturas respecto a la esfera de referencia, sin corregir el pequeño cambio de radio debido a la elevación. La base espacial es aproximadamente 40 m en Site04 y 160 m en la malla regional. Se informan media, percentil 95 por rango más cercano, máximo y porcentaje de muestras que supera el límite; el porcentaje no es fracción de superficie segura.

El desnivel es máximo menos mínimo de las alturas muestreadas. Un plano z=a·x+b·y+c se ajusta por mínimos cuadrados; se informa pendiente del plano, RMS de sus residuos y máximos positivo/negativo. Los residuos son irregularidades de alturas del DEM tras retirar una tendencia planar: no son alturas de rocas ni un criterio de estabilidad del vehículo. No incluyen una corrección completa de curvatura a un plano tangente; no deben usarse como geometría de contacto de un módulo.

El mapa agrupa las muestras en hasta 25 × 25 celdas de dibujo y conserva el máximo de pendiente en cada grupo. No se reducen muestras para calcular estadísticas. Sus ejes son X/Y polares, no norte/este local. El contorno dibujado aproxima el círculo.

## Parámetros y lectura

Por defecto: radio 500 m, pendiente máxima exploratoria 10°, desnivel total máximo 100 m. Son ejemplos editables, **no requisitos NASA**. El resultado no supera límites únicamente si la pendiente máxima y el desnivel total están bajo los límites configurados; no se incorpora al índice de viabilidad existente ni produce una etiqueta de «aterrizaje seguro».

Los ajustes se guardan y copian en escenarios; versiones anteriores reciben valores por defecto. Cambiarlos invalida el informe vigente. El comparador identifica resolución, fuente, radio y límites de cada fila. Cambiar solo las fechas no altera la topografía estática. La evaluación no depende de la disponibilidad temporal de orientación SPICE.

## Límites y siguiente trabajo

Las mallas de 20/80 m no permiten descartar obstáculos pequeños, cráteres submalla ni evaluar apoyo de patas. Faltan incertidumbres geodésicas, resistencia del suelo, dinámica del vehículo y requisitos de aterrizaje concretos. Para una evaluación de seguridad harían falta datos más finos, sus incertidumbres y especificaciones de misión. Referencias: [NASA PGDA, LOLA South Pole Sites](https://pgda.gsfc.nasa.gov/products/78), [NASA SPLICE](https://www.nasa.gov/safe-and-precise-landing-integrated-capabilities-evolution-splice/).

La siguiente etapa de la hoja de ruta es la validación integral y exportación del informe (punto 7). Permanecen pendientes los datos reales de relé y los refinamientos físicos del punto 5 ya identificados.
