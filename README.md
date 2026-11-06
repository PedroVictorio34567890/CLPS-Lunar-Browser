# CLPS Lunar Mission Browser · Iteración 2

Aplicación local de exploración y preparación de lugares candidatos de aterrizaje lunar. Proyecto para NASA Space Apps Challenge 2026; no es una herramienta oficial de NASA. No incorpora servicios de IA.

## Ejecutar

Requisitos: Node.js 22.18+ (o 24 LTS) y pnpm 11.

```sh
pnpm install
pnpm dev
```

Abrir la URL local que muestra Vite (normalmente http://127.0.0.1:5173).

En este equipo, las dependencias ya están instaladas. Si pnpm no aparece en el PATH, `./Start-Dev.ps1` usa el ejecutable incluido en el entorno de Codex. No cambia la política de ejecución de PowerShell.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

El proyecto incluye `pnpm-lock.yaml` y solo autoriza el script de instalación de esbuild en `pnpm-workspace.yaml`. La distribución estática se genera en `dist/`. No necesita backend, claves ni variables de entorno.

### Cámara, Tierra y Sol

La Luna y sus marcadores permanecen fijos en el marco lunar. El arrastre y la órbita automática mueven únicamente la cámara. El instante de la escena se controla por separado: cambiarlo no restablece cámara ni zoom.

El Sol y la Tierra usan las mismas efemérides geométricas de Astronomy Engine que el informe, transformadas del marco científico al de Three.js. Sus centros y distancias cambian con el instante UTC, incluida la libración aparente de la Tierra. Una unidad representa 1737,4 km; los radios terrestres y solares representados son 6371 km y 695700 km. La luz direccional sigue al Sol y muestra el terminador sobre las esferas. Se conserva una luz ambiente tenue para explorar el lado nocturno. Halo, atmósfera y brillo son estilizados; la orientación de continentes/nubes terrestres y las estrellas siguen siendo decorativas. No se simulan eclipses ni sombras de terreno.

## Reproducción temporal

Bajo la escena, la barra permite elegir cualquier instante del periodo sin ejecutar un informe ni seleccionar lugares. Los botones permiten reproducir/pausar e ir al inicio/final. Velocidades: 1, 6 y 24 horas simuladas por segundo real. La animación actualiza efemérides a 10 Hz usando tiempo transcurrido, se detiene exactamente al final y puede reiniciarse desde allí. Mover la barra pausa la reproducción; cambiar el periodo vuelve a su inicio y pausa. Un periodo inválido bloquea los controles conservando el último instante. Al ocultar la pestaña se pausa para evitar saltos inesperados. Todo se expresa en UTC.

La reproducción recorre el periodo; no modifica el informe ni su muestreo de cinco minutos. No calcula sombras locales: hará falta incorporar el DEM.

## Vista desde una ubicación

Añade un candidato y elígelo en «Desde la superficie». Se abre un cielo local visto desde altura cero sobre la esfera lunar, con horizonte ideal a 0°, puntos cardinales y lectura de azimut/elevación de los centros del Sol y la Tierra. Las posiciones se recalculan con el tiempo UTC; la cámara conserva la dirección de la mirada mientras el cielo evoluciona.

Arrastra con ratón o un dedo; con el visor enfocado, las flechas giran la mirada en pasos de 5°. «Mirar hacia el Sol», «Mirar hacia la Tierra» y «Mirar al norte» orientan la cámara una vez (no seguimiento automático). «Acercar» y «Alejar» ajustan el campo de visión entre 20° y 80°, conservando las proporciones angulares. Los cuerpos bajo el horizonte se ocultan; un disco puede sobresalir parcialmente aunque su centro esté debajo.

«Vista orbital» recupera la cámara orbital, que permanece montada y suspende su movimiento automático mientras está oculta. Editar o cambiar el lugar reinicia la mirada local; eliminar el candidato observado devuelve la vista orbital. En los polos exactos la longitud elegida define el meridiano de referencia; en el cenit/nadir el azimut aparece como indefinido.

El suelo liso es una máscara visual del horizonte, no terreno NASA. No representa montañas, pendientes, sombras locales ni una altura de antena. Las lecturas coinciden con el modelo esférico del informe.

## Uso

1. Pulsa la superficie de la Luna para colocar una ubicación o introduce latitud y longitud. Sur y oeste se expresan con signo negativo. Los campos admiten decimales; la lista redondea a tres decimales solo para mostrar, conservando la precisión de entrada.
2. Arrastra con un dedo o ratón para orbitar; usa rueda o pellizco de dos dedos para zoom. La primera interacción detiene la rotación automática. «Restablecer vista» reinicia cámara, zoom y rotación. El movimiento aparente se obtiene orbitando la cámara alrededor de una Luna fija, de modo que las coordenadas y los marcadores no cambien de referencia.
3. Edita o elimina ubicaciones desde la lista. Se admiten ocho; número y color se conservan al editar y los huecos se reutilizan al eliminar. Los marcadores de la cara opuesta se ocultan correctamente por la esfera: orbita para verlos.
4. Selecciona inicio y fin en **UTC**, entre 2000 y 2100 y con un máximo de 90 días por análisis. Los accesos rápidos fijan el fin a 24 horas, 7, 14 o 30 días después del inicio. La zona horaria del dispositivo no altera el periodo.
5. Pulsa «Analizar y comparar». Un Web Worker calcula las efemérides sin bloquear la cámara. El panel captura los lugares y el periodo al iniciar el cálculo y muestra métricas, curvas de elevación, bandas de disponibilidad y advertencias. Se puede cerrar con el botón o Escape. Si modificas las entradas, vuelve a analizar: la indicación de resultado vigente se invalida.

## Arquitectura

| Archivo / carpeta | Responsabilidad |
| --- | --- |
| `src/App.tsx` | Composición y flujo de comparación |
| `src/scene/MoonScene.tsx` | Canvas, textura, marcadores, cámara y gestos |
| `src/lib/coordinates.ts` | Conversión geográfica ↔ cartesiana y validación |
| `src/lib/sites.ts`, `src/hooks/useSites.ts` | Límite de lugares, colores y estado |
| `src/lib/period.ts` | Validación UTC y duraciones |
| `src/components/LocationPanel.tsx` | Formulario y edición de ubicaciones |
| `src/components/TimePanel.tsx`, `Timeline.tsx` | Periodo y estructura de línea temporal |
| `src/components/ComparisonPanel.tsx` | Informe y reserva del horizonte local |
| `src/models.ts` | Tipos de ubicaciones, periodos y resultados |
| `src/science/engine.ts` | Contrato asíncrono sustituible `ScienceEngine` |
| `src/science/ephemeris.ts` | Vectores Sol/Tierra, orientación lunar y elevación local |
| `src/science/statistics.ts`, `sphericalEngine.ts` | Ventanas, porcentajes, duraciones e índice exploratorio |
| `src/science/workerEngine.ts`, `science.worker.ts` | Ejecución astronómica fuera del hilo de interfaz |
| `src/components/AnalysisSeries.tsx` | Curvas de elevación y bandas temporales calculadas |
| `tests/domain.test.ts` | Pruebas de coordenadas, límites, UTC y honestidad del informe |
| `tests/science.test.ts`, `tests/fixtures/` | Pruebas astronómicas y referencia NASA/JPL Horizons |

React + TypeScript + Vite, con React Three Fiber y Drei para integrar Three.js en el ciclo de vida de React. La escena se carga por separado. El resto de la aplicación sigue siendo utilizable si no hay WebGL. La misión de trabajo es de sesión; los escenarios guardados explícitamente se recuperan desde la biblioteca local del navegador.

Convención: esfera fija con +Y al norte, longitud 0° en +X y este hacia −Z. `x = r cos(lat) cos(lon)`, `y = r sin(lat)`, `z = −r cos(lat) sin(lon)`. Coincide con los UV de `SphereGeometry` y la textura NASA centrada en 0°. La selección convierte la intersección a coordenadas locales antes de calcular latitud y longitud. El punto exacto del polo no tiene longitud físicamente única.

La región 80° S–90° S es un **umbral de interfaz elegido para esta iteración**, no una condición científica del desafío. Fuera de ella se advierte sin bloquear.

## Límites científicos y siguiente iteración

**Hay cálculos astronómicos geométricos, no resultados de demostración.** Astronomy Engine 2.1.19 aporta posiciones y orientación lunar. Se muestrea cada cinco minutos incluyendo exactamente los extremos, con cruces del horizonte interpolados. La luz y la comunicación se definen por el centro del Sol y de la Tierra sobre 0° de elevación, respectivamente. Se calculan porcentajes temporales, periodos continuos máximos y un índice exploratorio `0,5 × luz (%) + 0,5 × visibilidad terrestre (%)`.

El modelo utiliza una esfera de 1737,4 km y altura de observador cero. **No incluye relieve, eclipses, discos extendidos, estaciones terrestres, presupuesto de enlace. La energía se evalúa por separado con una batería ideal.** El índice pondera disponibilidades medias, no la longitud de las interrupciones, y no certifica viabilidad de misión. Todas estas limitaciones aparecen en el informe. Las duraciones están recortadas al periodo elegido. El muestreo de cinco minutos no implica una precisión científica de cinco minutos.

La formulación, referencias y validación están documentadas en [docs/SCIENCE.md](docs/SCIENCE.md). `pendingEngine` permanece como adaptador explícito de la primera versión y no se utiliza en el flujo de la aplicación.

La textura del [CGI Moon Kit de NASA SVS](https://svs.gsfc.nasa.gov/4720/) y la textura terrestre de los ejemplos de Three.js se distribuyen localmente con créditos en `public/textures/README.md`. Son recursos visuales, no DEM. La escena representa las posiciones geométricas y la iluminación esférica del instante UTC elegido, con distancias y tamaños a escala. El aspecto fotométrico y las texturas son aproximaciones visuales. Las fuentes tipográficas se solicitan a Google Fonts con sustitutos locales si no hay conexión; la escena y sus texturas no dependen de un servicio externo en ejecución.

La siguiente iteración debe incorporar un DEM polar y un horizonte dependiente del azimut, validar marcos cartográficos de mayor precisión, modelar eclipses y refinar los modelos de energía y telecomunicaciones con requisitos reales de misión. La escena y la reproducción temporal ya comparten las efemérides del informe; queda pendiente incorporar el relieve en ambas representaciones.

## Verificación de esta entrega

- TypeScript sin errores y compilación de producción Vite correcta.
- Treinta y una pruebas automatizadas (incluidas coherencia escena/informe y límites de reproducción): dominio inicial, ocho fechas de referencia JPL, elevación topocéntrica, cruces de horizonte, intervalos parciales, una lunación con caras cercana/lejana, límites e índice exploratorio.
- Navegador: alta manual y por clic, edición, arrastre sin crear lugares, zoom con rueda, parada y restablecimiento de rotación, máximo de ocho por ambas vías, eliminación, intervalo invertido y acceso rápido, apertura y cierre del informe.
- Revisión visual de escritorio y ancho móvil de 390 px, sin desbordamiento horizontal. Los gestos táctiles están configurados en OrbitControls, pero no se han probado en un dispositivo táctil físico.
- Iteración 2 en producción: cálculo de dos candidatos durante 30 días con el worker compilado, reapertura del informe, invalidación al modificar el periodo y bloqueo por encima de 90 días; informe revisado en móvil, sin errores de consola.

## Requisitos de misión y prioridad de comunicaciones

El panel 03 incorpora ejemplos editables, no requisitos NASA: interrupción máxima de 6 h, disponibilidad mínima del 90% y elevación terrestre mínima de 5°. Las entradas permiten otros límites, incluidos 0 h de interrupción y 100% de disponibilidad. Se valida que los números sean finitos, los porcentajes estén en [0,100] y la elevación en [0,90). El centro terrestre debe estar estrictamente por encima del umbral.

El informe captura una copia de los requisitos al iniciar el cálculo. Si cambian los lugares, fechas o requisitos, hay que analizar de nuevo; el informe anterior no se presenta como vigente. La primera sección de cada lugar evalúa por separado disponibilidad e interrupción máxima, y solo indica cumplimiento geométrico si ambas pasan. Incluye la ventana continua más larga, una banda temporal y las interrupciones ordenadas por duración con fechas UTC. Los cortes en los extremos del periodo se identifican como recortados.

La evaluación reutiliza las muestras de elevación de cinco minutos del motor y resta el umbral antes de interpolar cruces. Las cifras de referencia a 0° y el índice luz/visibilidad se mantienen identificados por separado; ese índice no evalúa requisitos de misión. No se modelan estaciones terrestres, relés, calidad de señal ni presupuesto de enlace, y el margen angular no sustituye el relieve.

El balance energético utiliza consumo en operación/reposo, porcentaje de operación, potencia nominal y factor útil de generación, capacidad de batería, carga inicial y reserva. Admite seguimiento solar ideal o panel fijo con inclinación y azimut. Muestra la curva de carga, mínimos, energía generada, demanda sin cubrir, excedente, caída bajo reserva y periodos sin energía suficiente. La reserva es una alerta: no desconecta cargas. La carga inicial debe ser al menos la reserva. Los cambios de trabajo requieren guardado explícito en Escenarios guardados para recuperarlos tras recargar.

Verificación: 31 pruebas, incluidas descarga, recarga, conservación de energía, cruces solares, orientación de paneles, idiomas y ventanas con umbral angular, límites inclusivos, cortes completos, referencia a 0°, validación y detección de requisitos modificados.

## Tutorial de bienvenida

La aplicación abre una guía de diez temas, en español e inglés, con explicaciones de los controles, unidades, ejemplos y lectura del informe. Anterior/Siguiente y un índice permiten recorrerla o consultar un tema. Se puede cerrar con la X, Salir del tutorial o Escape; Tutorial, en la cabecera, la reinicia sin modificar los datos. Abrirla pausa la reproducción temporal.

Por defecto aparece en cada apertura. No mostrar al abrir guarda una preferencia local en este navegador; desmarcarla vuelve a activar la apertura automática. Si el navegador bloquea el almacenamiento, se informa y la guía sigue funcionando. El diálogo mantiene el foco de teclado, devuelve el foco al cerrar y adapta sus controles a pantallas pequeñas. Esta preferencia no guarda los datos de la misión.

## Comunicaciones con energía

El informe muestra ahora las ventanas en las que coinciden acceso geométrico a la Tierra y alimentación completa del consumo medio configurado. Incluye disponibilidad conjunta, corte más largo, horas perdidas por déficit energético y una cronología con causas. Usa los umbrales de comunicaciones de la misión. No certifica un enlace de radio ni supone que la reserva desconecte equipos. La explicación también está incorporada al tutorial.

Verificación actual: 35 pruebas automatizadas, TypeScript y compilación de producción.

## Próximos eventos

Tras analizar, el desplegable bajo el reloj muestra próximos cruces de los centros del Sol y la Tierra a 0°, más pérdida/recuperación del acceso según la elevación terrestre de misión. El lugar se selecciona independientemente de la cámara. Los contadores avanzan con el instante de escena usando las ventanas del informe vigente, sin recalcular efemérides en cada fotograma. Cambiar entradas invalida el informe y los contadores. No se inventan eventos en los extremos recortados del periodo; un evento alcanzado deja de ser futuro. Si no se detecta otro cruce, se invita a ampliar el periodo. Aproximaciones sobre esfera, con muestreo de cinco minutos e interpolación, redondeadas hacia arriba a minutos.

Verificación actual: 38 pruebas, incluyendo extremos recortados, eventos alcanzados, tangencia y diferencia entre horizonte y umbral de comunicaciones.

## Biblioteca local de escenarios

Escenarios guardados permite guardar con nombre los lugares (coordenadas, identificadores, colores y números), fechas UTC y todos los requisitos de comunicaciones y energía. Guardar como nuevo crea una referencia independiente; Actualizar actual reemplaza la versión en edición. Duplicar guardado copia la versión persistida seleccionada, no los cambios de trabajo sin guardar. Cargar restaura la misión y reinicia selección de superficie, edición de coordenadas e informe. Debe analizarse de nuevo; no se persisten informes ni cámara.

La biblioteca admite 50 escenarios y usa localStorage con formato versionado y validación de entradas. Se avisa antes de sustituir cambios sin guardar. No hay guardado automático ni sincronización entre navegadores, dispositivos o direcciones del servidor. Se detectan cambios de otra pestaña antes de escribir; datos corruptos o de versión incompatible no se sobrescriben. Un fallo de almacenamiento no se presenta como guardado correcto. Borrar los datos del navegador elimina esta biblioteca; todavía no hay exportación de respaldo.

Verificación actual: 41 pruebas, incluidas persistencia, independencia de copias, validación y conflictos de escritura.

## Comparador de escenarios y retrasos

Desde Escenarios guardados, Comparar escenarios y retrasos abre una comparación de 2–4 versiones guardadas. Cada lugar de cada escenario ocupa una fila, con fechas, duración, coordenadas, acceso geométrico, acceso con energía, mayor corte conjunto, luz, batería mínima y demanda sin cubrir. La referencia de diferencias se puede elegir por fila: porcentajes se comparan en puntos porcentuales (pp), no en variación porcentual relativa. Los umbrales se evalúan individualmente y se pueden consultar; no se ofrece una clasificación automática cuando cambian requisitos o duración.

Las variantes temporales desplazan ambas fechas +1, +3, +7, +14 o +30 días UTC, conservando duración, lugares y requisitos, incluida la carga inicial. Representan un nuevo aterrizaje, no energía consumida durante una espera. No se guardan ni modifican la biblioteca o la misión abierta. Los cálculos usan el worker en secuencia; cerrar evita iniciar los siguientes después de finalizar el actual. La comparación captura las versiones al abrirse y los resultados se descartan al modificar la selección. Para usar actualizaciones de la biblioteca hay que cerrar y reabrir el comparador.

Verificación actual: 44 pruebas, incluidas conservación de duración UTC, año bisiesto, límites temporales, independencia de variantes y evaluación conjunta por escenario.

## Primer estudio de relieve real: Shackleton

Añadir ejemplo LOLA en Lugares candidatos coloca un punto central del DEM NASA PGDA Site04. Analizar muestra Relieve local LOLA al final del informe: perfil por azimut y comparación con la esfera para luz, comunicaciones, batería y disponibilidad conjunta. También admite coordenadas manuales dentro del interior cubierto. Fuera de la zona se indica ausencia de cobertura.

El derivado ocupa 2,56 MB, procede de datos de 5 m y se distribuye a 20 m; examina obstáculos cercanos hasta 3 km con observador a 2 m. Ahora se combina con un recorte regional LOLA de 80 m/píxel (18 MB) para extender el horizonte hasta 100 km. El informe compara la visibilidad terrestre y el mayor corte geométrico a 3 y 100 km. Es experimental. La orientación local usa una tabla derivada de SPICE en MOON_ME_DE421, válida entre 2000 y el 1 de enero de 2050 UTC; fuera del intervalo se informa de falta de cobertura. No es el relieve completo del polo. Los contadores, el comparador de escenarios y la vista de superficie usan LOLA donde hay cobertura y un informe vigente; el resto se identifica como esférico. La vista orbital y la referencia del informe siguen siendo esféricas. Límites y procedencia reproducible: docs/SCIENCE.md y public/terrain/README.md.

Verificación actual: 66 pruebas, TypeScript y compilación de producción.
