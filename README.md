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

### Cámara y Sol

La Luna y las ubicaciones permanecen fijas en el espacio. Tanto el arrastre como la órbita automática mueven exclusivamente la cámara alrededor de la Luna. El Sol de `src/scene/Sun.tsx` también ocupa una posición fija: puede salir del encuadre o quedar oculto por la Luna al cambiar el punto de vista. Su núcleo y halo dorado se renderizan en 3D con prueba de profundidad; la luz direccional proviene de esa misma dirección. El halo es procedural y no requiere imágenes externas ni nuevas dependencias. La posición y el tamaño del Sol siguen siendo ilustrativos, sin efemérides.

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

La textura del [CGI Moon Kit de NASA SVS](https://svs.gsfc.nasa.gov/4720/) se distribuye localmente con sus créditos en `public/textures/README.md`. Es un recurso visual, no un DEM. La luz de la escena, el Sol y las distancias son ilustrativos e independientes del periodo seleccionado. No representan una fase lunar ni un instante astronómico. Las fuentes tipográficas se solicitan a Google Fonts con sustitutos locales si no hay conexión; la escena y su textura no dependen de un servicio externo en ejecución.

La siguiente iteración debe incorporar un DEM polar y un horizonte dependiente del azimut, validar marcos cartográficos de mayor precisión, modelar eclipses y definir requisitos de energía y telecomunicaciones por misión. También queda pendiente sincronizar la escena 3D y la reproducción temporal con las efemérides; las curvas del informe sí corresponden al periodo calculado.

## Verificación de esta entrega

- TypeScript sin errores y compilación de producción Vite correcta.
- Catorce pruebas automatizadas: dominio inicial, ocho fechas de referencia JPL, elevación topocéntrica, cruces de horizonte, intervalos parciales, una lunación con caras cercana/lejana, límites e índice exploratorio.
- Navegador: alta manual y por clic, edición, arrastre sin crear lugares, zoom con rueda, parada y restablecimiento de rotación, máximo de ocho por ambas vías, eliminación, intervalo invertido y acceso rápido, apertura y cierre del informe.
- Revisión visual de escritorio y ancho móvil de 390 px, sin desbordamiento horizontal. Los gestos táctiles están configurados en OrbitControls, pero no se han probado en un dispositivo táctil físico.
- Iteración 2 en producción: cálculo de dos candidatos durante 30 días con el worker compilado, reapertura del informe, invalidación al modificar el periodo y bloqueo por encima de 90 días; informe revisado en móvil, sin errores de consola.
