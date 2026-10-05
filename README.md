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

React + TypeScript + Vite, con React Three Fiber y Drei para integrar Three.js en el ciclo de vida de React. La escena se carga por separado. El resto de la aplicación sigue siendo utilizable si no hay WebGL. El estado es de sesión: recargar elimina los lugares seleccionados.

Convención: esfera fija con +Y al norte, longitud 0° en +X y este hacia −Z. `x = r cos(lat) cos(lon)`, `y = r sin(lat)`, `z = −r cos(lat) sin(lon)`. Coincide con los UV de `SphereGeometry` y la textura NASA centrada en 0°. La selección convierte la intersección a coordenadas locales antes de calcular latitud y longitud. El punto exacto del polo no tiene longitud físicamente única.

La región 80° S–90° S es un **umbral de interfaz elegido para esta iteración**, no una condición científica del desafío. Fuera de ella se advierte sin bloquear.

## Límites científicos y siguiente iteración

**Hay cálculos astronómicos geométricos, no resultados de demostración.** Astronomy Engine 2.1.19 aporta posiciones y orientación lunar. Se muestrea cada cinco minutos incluyendo exactamente los extremos, con cruces del horizonte interpolados. La luz y la comunicación se definen por el centro del Sol y de la Tierra sobre 0° de elevación, respectivamente. Se calculan porcentajes temporales, periodos continuos máximos y un índice exploratorio `0,5 × luz (%) + 0,5 × visibilidad terrestre (%)`.

El modelo utiliza una esfera de 1737,4 km y altura de observador cero. **No incluye relieve, eclipses, discos extendidos, estaciones terrestres, presupuesto de enlace ni baterías.** El índice pondera disponibilidades medias, no la longitud de las interrupciones, y no certifica viabilidad de misión. Todas estas limitaciones aparecen en el informe. Las duraciones están recortadas al periodo elegido. El muestreo de cinco minutos no implica una precisión científica de cinco minutos.

La formulación, referencias y validación están documentadas en [docs/SCIENCE.md](docs/SCIENCE.md). `pendingEngine` permanece como adaptador explícito de la primera versión y no se utiliza en el flujo de la aplicación.

La textura del [CGI Moon Kit de NASA SVS](https://svs.gsfc.nasa.gov/4720/) y la textura terrestre de los ejemplos de Three.js se distribuyen localmente con créditos en `public/textures/README.md`. Son recursos visuales, no DEM. La escena representa las posiciones geométricas y la iluminación esférica del instante UTC elegido, con distancias y tamaños a escala. El aspecto fotométrico y las texturas son aproximaciones visuales. Las fuentes tipográficas se solicitan a Google Fonts con sustitutos locales si no hay conexión; la escena y sus texturas no dependen de un servicio externo en ejecución.

La siguiente iteración debe incorporar un DEM polar y un horizonte dependiente del azimut, validar marcos cartográficos de mayor precisión, modelar eclipses y definir requisitos de energía y telecomunicaciones por misión. La escena y la reproducción temporal ya comparten las efemérides del informe; queda pendiente incorporar el relieve en ambas representaciones.

## Verificación de esta entrega

- TypeScript sin errores y compilación de producción Vite correcta.
- Diecinueve pruebas automatizadas (incluidas coherencia escena/informe y límites de reproducción): dominio inicial, ocho fechas de referencia JPL, elevación topocéntrica, cruces de horizonte, intervalos parciales, una lunación con caras cercana/lejana, límites e índice exploratorio.
- Navegador: alta manual y por clic, edición, arrastre sin crear lugares, zoom con rueda, parada y restablecimiento de rotación, máximo de ocho por ambas vías, eliminación, intervalo invertido y acceso rápido, apertura y cierre del informe.
- Revisión visual de escritorio y ancho móvil de 390 px, sin desbordamiento horizontal. Los gestos táctiles están configurados en OrbitControls, pero no se han probado en un dispositivo táctil físico.
- Iteración 2 en producción: cálculo de dos candidatos durante 30 días con el worker compilado, reapertura del informe, invalidación al modificar el periodo y bloqueo por encima de 90 días; informe revisado en móvil, sin errores de consola.
