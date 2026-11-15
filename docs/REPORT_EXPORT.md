# Informe de misión v1

En «Analizar y comparar», el bloque «Revisar y exportar informe» permite descargar:

- JSON completo, esquema `lunar-mission-report-v1`: copia independiente de entradas, series, ventanas, referencias esféricas y con relieve, resultados de radio/energía/datos/terreno, fuentes y hashes de los productos instalados.
- CSV de resumen por lugar: modelo temporal y estados explícitos, unidades en las cabeceras, fechas UTC, decimales con punto. Vacío significa no disponible. UTF-8 con BOM, comillas escapadas y protección frente a fórmulas en campos de texto. Los parámetros y detalles están en el JSON compañero.

Se exporta el informe capturado, no ajustes posteriores del formulario. Los hashes identifican los archivos instalados; no certifican exactitud física. Los metadatos enumeran los productos disponibles; el estado de cada lugar identifica cuáles se pudieron aplicar. No se exportan otros escenarios guardados ni información de la cuenta. La aplicación no importa estos informes como escenarios.

Antes de exportar se comprueban entradas, valores finitos, extremos y orden de las series, continuidad de ventanas, conservación energética y capacidad de batería (esfera y relieve por separado), coherencia del modelo de radio/datos, jerarquía de disponibilidad de radio y conservación/capacidad de almacenamiento. Tolerancia de conservación: 1e-7 relativa a energía o datos entrantes, con mínimo absoluto de 1e-7. Un error bloquea ambos formatos. Falta de cobertura o de resultados complementarios produce advertencias y valores ausentes, nunca ceros inventados.

Estos controles son invariantes numéricos, no validación física independiente ni cumplimiento de requisitos de misión. Los límites configurados pueden incumplirse aunque los controles pasen. Las regresiones Horizons existentes contrastan ocho fechas y coordenadas; no validan sombras, RF o aterrizaje. La revisión importada de Horizons se descarga por separado desde Recursos oficiales; no se asocia automáticamente a este informe.

Pendientes científicos: relés con órbitas/servicios reales, eclipses y disco solar parcial, obstáculos menores que el DEM, incertidumbre topográfica, propiedades del suelo, dinámica de aterrizaje, temperatura y degradación, agenda de estaciones y validación independiente integral. El informe conserva estas limitaciones. No es una certificación NASA.
