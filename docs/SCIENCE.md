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
- Comportamiento real de batería: límites de potencia, pérdidas de carga, degradación y temperatura. Pendiente y seguridad de aterrizaje.
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

## Horizonte local del visor

La vista de superficie resta la posición del observador esférico a cada vector selenocéntrico, y proyecta la línea de visión sobre la base local este/norte/vertical. Azimut = atan2(este, norte), normalizado a [0°, 360°); elevación = asin(vertical/distancia). El eje de cámara +X apunta al este, +Y a la vertical y −Z al norte. La distancia se expresa en radios lunares. Las pruebas comparan las elevaciones del visor con las del informe en múltiples fechas, longitudes y ambos polos.

El observador tiene altura cero y el horizonte geométrico está a 0°. Una semiesfera inferior opaca enmascara la parte del cielo bajo ese plano; es una representación ideal, no una malla topográfica. La lectura de visibilidad usa el centro del cuerpo, igual que el informe, aunque la imagen pueda mostrar parte de su disco sobre el horizonte. No se modelan eclipses ni refracción. En los polos, el meridiano del candidato define la base de azimut; en cenit/nadir no existe un azimut único.

## Evaluación de requisitos de comunicaciones

La evaluación de misión es una capa posterior al cálculo astronómico. Para cada muestra se usa elevación terrestre menos el mínimo configurado y se aplica la misma integración temporal e interpolación de cruces. Se evalúan disponibilidad ≥ mínimo e interrupción máxima ≤ tolerancia, sin redondear los resultados mostrados y con tolerancia numérica de 1e-9 en porcentaje/horas. El umbral se refiere al centro terrestre y debe superarse estrictamente; no define la visibilidad de una estación concreta.

Las bandas del bloque de requisitos emplean el umbral de misión. Las curvas y métricas astronómicas de referencia conservan 0°, explícitamente identificadas. Los intervalos se recortan al periodo, se listan de mayor a menor duración y no acreditan viabilidad de radio o energética. La copia de parámetros queda asociada al informe para evitar reinterpretarlo después de modificar los requisitos.

## Balance energético preliminar

Los parámetros son ejemplos editables, no especificaciones NASA. La evaluación conserva la misma copia de requisitos que comunicaciones y usa las efemérides del lugar cada cinco minutos, incluyendo el extremo final exacto.

La demanda es constante: `P = P_operación × fracción_operación + P_reposo × (1 − fracción_operación)`. El porcentaje de operación representa una media, no un horario de actividades. Debe incluirse el consumo de radio dentro de estas cargas; no se calcula todavía un presupuesto de enlace.

La generación es cero con el centro solar bajo o en el horizonte. Con seguimiento se supone incidencia normal ideal. Con panel fijo: `P_solar = P_nominal × factor_útil × max(0, sin(h) cos(β) + cos(h) sin(β) cos(A − A_panel))`, siendo h la elevación solar, β la inclinación desde la horizontal y A el azimut desde el norte hacia el este. El factor útil reúne pérdidas configurables; no modela su evolución térmica ni la distancia solar.

Se dividen los intervalos en los cruces interpolados del horizonte. En cada tramo se evalúa la potencia solar en el punto medio, interpolando el azimut por el arco corto. La carga cambia según `(generación − demanda) × duración` y se limita entre cero y la capacidad. Se contabilizan por separado excedente no almacenado y demanda sin cubrir. La batería ideal puede volver a cargarse después de agotarse; no se modelan el reinicio ni el controlador.

La primera caída bajo reserva y el agotamiento se interpolan dentro del tramo de potencia constante. La reserva no desconecta cargas. Un agotamiento exacto al final puede no causar demanda sin cubrir; ambos indicadores se muestran por separado. Los intervalos de déficit están recortados al periodo. La curva conserva mínimos y máximos al reducir puntos para su presentación.

Se verifican descarga y recarga analíticas, conservación de energía, saturación de batería, amanecer, intervalos parciales, orientación de paneles, porcentajes de operación y copia de entradas. La precisión de los eventos está limitada por el muestreo y los modelos; no incluye relieve, eclipses, eficiencia de carga, límites de potencia o degradación. Cumplir la geometría de comunicaciones y este balance ideal no certifica viabilidad operativa.

## Ventanas conjuntas de comunicaciones y energía

La evaluación conjunta intersecta los intervalos de elevación terrestre por encima del mínimo de misión con el complemento de los intervalos de demanda energética sin cubrir. Usa el consumo medio configurado completo: no asigna prioridades eléctricas ni certifica alimentación individual de la radio. La reserva no desconecta cargas y, por tanto, cruzarla no elimina una ventana conjunta.

Los eventos se ordenan por fecha y se integran como intervalos semiabiertos. Se distinguen acceso con energía, fallo geométrico, déficit energético y ambos. Los cortes consecutivos se fusionan para calcular la interrupción máxima aunque cambie su causa. Las horas de acceso perdido por energía cuentan solamente déficit durante visibilidad geométrica, evitando contar dos veces limitaciones simultáneas. Se aplican los mismos umbrales de disponibilidad e interrupción de misión, sin alterar el índice exploratorio anterior.

La evaluación hereda las limitaciones de la esfera sin relieve, batería ideal y carga media; no representa cobertura de radio, horarios de transmisión, desconexión selectiva, estaciones o relés. Los intervalos quedan recortados al periodo. Pruebas: superposición, extremos exactos, cortes con cambio de causa, acceso total/nulo y agotamiento frente a reserva.

## Relieve local LOLA experimental (bloque adicional)

Fuente: NASA PGDA Site04, https://pgda.gsfc.nasa.gov/products/78, Barker et al. (2021), doi:10.1016/j.pss.2020.105119. Se distribuye un derivado de 20 m del GeoTIFF de 5 m: cada cuarta muestra, Float32. Procedimiento, proyección, hashes y cita están en public/terrain/README.md y metadata.json. scripts/prepare-terrain.py reproduce la preparación; el original permanece en qa/terrain-source, ignorado por Git.

Proyección sur: rho = 2R tan((90°+lat)/2), x = rho sin(lon), y = rho cos(lon), R = 1737400 m. Se respetan centros de píxel y se interpolan alturas bilinealmente. Se requiere un margen interior de 3040 m y cada consulta se valida; nunca se rellena terreno ausente con cero.

Se trazan rayos geodésicos cada 0,5°, con muestras cada 20 m hasta 3000 m. Para distancia d y altura z, el ángulo desde z0+2 m es atan2((R+z) cos(d/R) − (R+z0+2), (R+z) sin(d/R)). El máximo y un suelo de 0° definen la máscara local; no es el horizonte lejano completo. La interpolación angular cierra la costura norte.

Las posiciones topocéntricas se calculan a altura z0+2 m. El Sol debe superar el perfil; la Tierra debe superar max(perfil, elevación mínima de misión). El umbral de misión sigue siendo absoluto respecto a la horizontal. El panel usa la elevación solar física para la incidencia y la visibilidad local para cortar generación. Se divide la integración energética también en los cruces de ocultación. Las diferencias frente a la esfera incluyen las distintas alturas de observador.

El bloque local transforma los vectores J2000 a MOON_ME_DE421 mediante orientaciones derivadas de SPICE; véase la validación y las limitaciones de esta transformación más abajo. Faltan obstáculos más allá de 100 km, detalles perdidos por muestreo, discos extendidos y eclipses. La fuente interpola huecos entre mediciones; las celdas no son todas observaciones independientes.

El worker añade este bloque al informe esférico. Fallos de cobertura o integridad se indican sin sustituir el estudio local por datos esféricos. El horizonte de superficie, los contadores y el comparador de escenarios usan el bloque LOLA cuando está disponible y vigente; la referencia esférica se conserva de forma explícita. No se deforma aún la malla 3D. Pruebas: proyección, cobertura, terreno plano, cresta analítica, costura de azimut, integridad del fichero y separación sombra/incidencia.

## Orientación local MOON_ME_DE421

El estudio LOLA usa `pxform(J2000, MOON_ME_DE421, ET)` de SPICE, preparado con los kernels oficiales NAIF `moon_080317.tf`, `moon_pa_de421_1900-2050.bpc` y `naif0012.tls`. Se fija explícitamente DE421 en lugar de un alias cuyo significado pueda cambiar. Se rota cada vector selenocéntrico J2000 de Astronomy Engine antes de calcular azimut/elevación y comparar con el horizonte del DEM.

La tabla local `moon-me-de421.f64` contiene 73061 cuaterniones Hamilton (escalar primero), Float64 little-endian, cada 6 horas TT; ocupa 2337952 bytes. Se interpola por SLERP y se normaliza. El generador convierte TT a ET/TDB mediante SPICE. El navegador convierte UTC a TT con TAI−UTC de NAIF0012 y 32,184 s; después de 2017 conserva 37 s para TAI−UTC, sin predecir futuros segundos intercalares. Una actualización de estos requiere actualizar el código de conversión. No se admite representar el instante 23:59:60 con Date de JavaScript.

Cobertura de producto: inicio >= 2000-01-01 UTC y fin <= 2050-01-01 UTC, ambos incluidos. Fuera de cobertura se omite el bloque local y se muestra un motivo específico; no se extrapola ni se sustituye silenciosamente por IAU. Los datos y su longitud se verifican mediante SHA-256 antes de usarlos. El informe esférico conserva su modelo y dominio previos.

Validación: los 73060 puntos medios entre muestras se comparan con SPICE directo al generar la tabla. Error angular máximo observado: 0,02256 segundos de arco. Esto mide solo la interpolación de orientación en esos instantes, no un límite global de precisión física. Las pruebas TypeScript usan matrices SPICE en fechas independientes fuera de la malla, verifican signos, ejes y conservación de distancias con tolerancia de 0,1 segundos de arco; también comprueban extremos, segundos intercalares y rechazo de datos corruptos. La prueba de integración ejecuta el módulo compilado con los archivos reales y verifica que el informe esférico no cambia.

Las posiciones traslacionales siguen siendo Astronomy Engine (con su propia aproximación temporal), no DE421/SPK. Por tanto, no se presenta esto como una efeméride SPICE completa ni se atribuye el error de orientación al conjunto de las elevaciones. Las diferencias de la tabla esfera/relieve incluyen ahora orientación, altura y obstáculos. Faltan horizonte más allá de 100 km, validación de precisión de DEM y efemérides, eclipses y un presupuesto de enlace para validar comunicaciones.

Reproducción y hashes: `scripts/prepare-lunar-frame.py`, `public/terrain/frame-metadata.json`. Fuente primaria: [especificación de marcos lunares NAIF](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf).

## Horizonte regional hasta 100 km

Se conserva la altura del observador y el perfil de 0–3 km de Site04. Desde 3 km hasta 100 km se añade el DEM oficial LOLA GDR `LDEM_80S_80M`, versión 2.0 (2017), en MOON_ME/DE421 y la misma esfera de 1737400 m. No se amplía el dominio de candidatos: sigue requiriéndose cobertura detallada del observador en Shackleton.

La etiqueta PDS original se distribuye en `public/terrain/LDEM_80S_80M.LBL`: 7600 × 7600, Int16 little-endian, factor 0,5 m/DN. La altura es DN × 0,5, sin sumar el radio de referencia a la elevación. Los centros originales son x=(col−3799,5)×80, y=(3799,5−fila)×80, con índices desde cero. Se recortan filas/columnas [2300,5300), conservando 3000 × 3000 muestras nativas, 18 MB y una extensión de 240 × 240 km. No hay decimación ni relleno adicional. El original de 115,52 MB permanece en qa/, fuera de Git. `scripts/prepare-regional-terrain.py` valida la etiqueta y reproduce el recorte; hashes en `regional-metadata.json`.

Cada uno de los 720 rayos geodésicos mantiene su perfil cercano, recorre el regional cada 80 m desde 3000 m e incluye exactamente el extremo de 100000 m. Se usa la altura absoluta regional con la misma curvatura esférica y se toma el máximo de ambos perfiles, con suelo angular 0°. No se recalibra el datum para forzar coincidencia entre productos; el diferente procesado y resolución puede generar discrepancias en la unión. Si falta una muestra, la geometría sale del mapa, falla la descarga o no coincide el SHA-256, el bloque se marca no disponible, nunca como un horizonte despejado o un resultado de 100 km calculado parcialmente.

Las métricas de luz, acceso y energía del bloque de relieve utilizan el perfil combinado. La nueva comparación 3 km/100 km usa idénticos vectores MOON_ME, altura, fechas y umbral terrestre. Muestra visibilidad y máximo corte **geométrico**, sin mezclar batería ni cambiar los resultados esféricos. Por construcción, extender el horizonte no puede aumentar esa visibilidad. Las curvas distinguen el perfil cercano (cian discontinuo) del combinado (dorado continuo).

Límites: 100 km es un límite de búsqueda, no una demostración de que más allá no existan obstáculos. A 100 km, la separación transversal entre rayos de 0,5° es de unos 873 m; pueden omitirse crestas estrechas. También existen errores de alturas, interpolación y registro entre los dos DEMs. Esto sigue siendo una estimación exploratoria, sin presupuesto de enlace ni certificación de aterrizaje.

Pruebas adicionales: cresta sintética fuera de 3 km, curvatura de una cresta lejana bajo el horizonte, rechazo de huecos/cobertura incompleta/radios incompatibles, integridad del recorte real y cobertura de los rayos del ejemplo, descarga regional fallida y corrupción de datos, y monotonía de la disponibilidad al ampliar el alcance. Fuente: [LOLA South Pole GDR](https://imbrium.mit.edu/BROWSE/LOLA_GDR/POLAR/SOUTH_POLE/).

## Uso del relieve en eventos, escenarios y superficie

El worker conserva, dentro del resultado LOLA, las ventanas solares sobre el horizonte del terreno, las terrestres sobre ese horizonte, las de acceso sobre máximo(horizonte, umbral de misión), el balance energético completo y las posiciones topocéntricas en cada muestra. `activeAnalysis` selecciona estos resultados cuando existen. En caso contrario devuelve la referencia esférica con motivo explícito: fuera de cobertura, fechas sin orientación, carga/cobertura fallida o sin cálculo. La falta de relieve nunca se etiqueta como terreno despejado.

Los contadores usan esas ventanas sin añadir eventos en los límites del periodo. El comparador usa la energía con sombras, incluida la primera caída bajo reserva, y calcula las ventanas conjuntas con el acceso del mismo modelo. Cada fila indica modelo/motivo; se suprimen diferencias numéricas entre modelos distintos. No se modifica el formato de escenarios guardados: se recalculan al comparar.

La vista de superficie consume el informe vigente y muestra una silueta angular opaca del perfil de 100 km, con suelo esférico bajo 0°. Su radio de dibujo es arbitrario: no representa distancias reales a montañas ni una malla topográfica. Se interpolan linealmente los vectores topocéntricos del informe entre muestras de 5 minutos, evitando discontinuidades de azimut en el norte. Fuera del intervalo no se extrapolan. La lectura de elevación es física; la obstrucción se consulta al azimut del cuerpo. Cerca de un cruce puede haber pequeñas diferencias respecto a los contadores, que interpolan la distancia angular al horizonte. No se simulan eclipses; los discos y halos son visuales y las métricas se refieren a sus centros.

Cambiar lugares, coordenadas, periodo o requisitos invalida `currentReport` y retira el relieve de la superficie y de los contadores hasta analizar otra vez. La vista orbital conserva la esfera y su orientación analítica; solo la vista de superficie usa los vectores MOON_ME del informe. El informe muestra primero el bloque LOLA, seguido de una referencia esférica identificada. Se verifican selección del modelo, conservación de las referencias, integración con escenarios y energía, interpolación del cielo, orientación cardinal y cierre de la silueta.
