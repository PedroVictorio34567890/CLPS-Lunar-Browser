# Modelo geométrico spherical-v1

## Alcance

Estimación exploratoria de iluminación y visibilidad del centro terrestre sobre una esfera. Los resultados dependen de las coordenadas y del periodo, no de la orientación de la cámara. No son valores simulados ni aleatorios. No es todavía un análisis con relieve de emplazamientos polares.

Entrada: latitud planetocéntrica norte y longitud este, en grados; inicio y fin UTC. Dominio de producto acotado a 2000-01-01 ≤ inicio < fin ≤ 2100-01-01, con 90 días como máximo. No se afirma validación exhaustiva de todo ese rango.

## Efemérides y orientación

Dependencia fijada: [Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy). `MakeTime` recibe UTC y calcula la escala dinámica interna TT. `GeoMoon` devuelve Tierra→Luna; `HelioVector(Earth)` devuelve Sol→Tierra. Ambos vectores usan el ecuador medio J2000 (EQJ), en unidades astronómicas. En consecuencia:

- Luna→Tierra = −GeoMoon.
- Luna→Sol = −HelioVector(Earth) − GeoMoon.

Se usan vectores geométricos simultáneos, sin tiempo de luz ni aberración. Conversión AU→km: 149597870,7.

`RotationAxis(Moon)` proporciona ascensión recta α del polo (horas, convertidas a grados), declinación δ y ángulo de meridiano W. Se usa la orientación analítica IAU de la biblioteca; no una rotación síncrona inventada ni un eje constante. Las fórmulas lunares de la implementación remiten a WGCCRE 2009; la documentación general de la función remite a WGCCRE 2015.

Base del marco lunar de cálculo (X: meridiano 0°, Y: 90° E, Z: polo norte):

```
n = (−sin α, cos α, 0)
q = (−sin δ cos α, −sin δ sin α, cos δ)
X = n cos W + q sin W
Y = −n sin W + q cos W
Z = (cos δ cos α, cos δ sin α, sin δ)
v_lunar = (v·X, v·Y, v·Z)
```

Este marco científico no es el marco gráfico de Three.js, que utiliza +Y al norte. No se intercambian los vectores entre ambos sin transformación. El mapa visual LROC no aporta elevaciones ni participa en los cálculos.

## Horizonte y muestreo

Radio lunar R = 1737,4 km. Para latitud φ y longitud λ:

```
normal = (cos φ cos λ, cos φ sin λ, sin φ)
observador = R × normal
dirección = posición_del_cuerpo − observador
elevación = asin(normal · dirección / |dirección|)
```

Se resta la posición del observador para incorporar la paralaje respecto al centro lunar; es relevante para la Tierra cerca del horizonte. Altura del observador: 0 m; horizonte geométrico: 0°; sin refracción lunar.

Se evalúa una muestra cada 5 minutos y se incluye siempre el final exacto, incluso para intervalos menores de un paso. Luz = elevación del **centro** solar > 0°. Visibilidad = elevación del **centro** terrestre > 0°. Los porcentajes integran tiempo, no cuentan muestras. Los cruces se interpolan linealmente entre elevaciones de signo distinto y los tramos vecinos con el mismo estado se fusionan. Las duraciones máximas se recortan a la ventana consultada. Eventos submuestreados pueden omitirse.

Las curvas se reducen a un máximo aproximado de 250 puntos solo al dibujar; las estadísticas usan todas las muestras. Las bandas se dibujan a partir de los intervalos completos. La precisión de pantalla de un decimal no es una declaración de exactitud física.

## Viabilidad

Índice exploratorio = 0,5 × porcentaje de luz + 0,5 × porcentaje de visibilidad terrestre, de 0 a 100. Pesos editoriales iguales, no determinados por NASA ni por requisitos de una misión. No penaliza directamente interrupciones continuas, ni tiene en cuenta coincidencia simultánea de luz y enlace. Dos lugares con el mismo índice pueden exigir baterías y relés muy diferentes. Las duraciones se muestran aparte y generan advertencias.

La recomendación señala el mayor índice relativo entre candidatos (empates con diferencia < 0,05 puntos), sin declarar un lugar seguro o apto para aterrizar.

## Exclusiones y siguiente paso

- DEM y obstáculos locales: pueden cambiar de forma sustancial los resultados cerca del polo. Se advierte cuando alguno de los centros pasa a menos de 1° del horizonte.
- Eclipses, discos solares/terrestres extendidos, tiempo de luz y aberración. Un centro sobre el horizonte no garantiza que el disco esté completamente visible o que el Sol no esté eclipsado.
- Estación terrestre concreta, rotación de su ubicación, disponibilidad DSN, radiofrecuencia, antenas, potencia, atmósfera terrestre y relés.
- Energía generada, ángulo de paneles, batería, temperatura, pendiente y seguridad de aterrizaje.
- Escena 3D: centros y distancias del Sol y de la Tierra sincronizados con el instante UTC, con la misma efeméride que las series del informe. Conversión a Three.js: (x, y, z) científico → (x, z, −y) / 1737,4. Terminador esférico mediante luz solar direccional; no incluye eclipses ni relieve. La luz ambiente, atmósfera, halo, estrellas y orientación de la textura terrestre son visuales, no resultados científicos.

Antes de un análisis polar de precisión: DEM/LOLA, marco lunar y transformación cartográfica explícitos (p. ej. SPICE/MOON_ME), horizonte por azimut, tolerancias de navegación, eclipses y requisitos reales de misión.

## Validación

Referencia independiente almacenada en `tests/fixtures/horizons-lunar-2026.json`: ocho fechas del 27 de septiembre al 4 de octubre de 2026, puntos subterrestre y subsolar de NASA/JPL Horizons. Las 32 comparaciones angulares pasan una tolerancia de 0,05°. Es una regresión acotada, no una cota de error global ni validación de sombras.

Horizons usa DE441, MOON_ME y coordenadas aparentes; el modelo local usa orientación analítica y posiciones geométricas. Se conserva la respuesta original y el procedimiento para repetir la consulta. La prueba verifica signos, orientación y unidades sin exigir equivalencia exacta de ambos modelos.

Otras pruebas: cenit/nadir, este positivo, paralaje lunar, interpolación de cruces, tramos continuos, horizonte tangente, extremo parcial, intervalos de un minuto, una lunación, centro terrestre visible en la cara cercana y oculto en la lejana, validación y copia de entradas.

Referencias primarias:

- [Documentación de Astronomy Engine](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md): GeoMoon, HelioVector y RotationAxis.
- [IAU WGCCRE 2015](https://astropedia.astrogeology.usgs.gov/download/Docs/WGCCRE/WGCCRE2015reprint.pdf): orientación de cuerpos y convenciones cartográficas.
- [Manual de JPL Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html): cantidades 14 y 15, punto subobservador y subsolar.
- [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/): radio de referencia LRO y separación entre textura visual y datos científicos.
