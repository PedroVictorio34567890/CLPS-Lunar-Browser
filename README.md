# Lunar Mission Browser · 0.3.0

Prototipo web independiente para NASA Space Apps 2026. Permite comparar lugares candidatos del polo sur lunar, con prioridad en comunicaciones, energía y terreno. Disponible en español e inglés.

## Probar una misión

1. Añade el ejemplo LOLA de Shackleton o introduce coordenadas.
2. Elige el periodo UTC y revisa los requisitos de ejemplo.
3. Pulsa **Analizar y comparar**. El resumen muestra enlace con energía, mayor corte de radio, batería mínima y luz solar.
4. Abre las secciones de comunicaciones, almacenamiento, terreno y referencia esférica.
5. En **Guardar los resultados**, descarga el informe completo JSON o el resumen CSV.

El tutorial se abre inicialmente y se puede repetir desde la cabecera. Los escenarios se guardan explícitamente en el navegador, sin sincronización en la nube.

## Ejecutar y comprobar

Node.js 22.18+ o 24 LTS; pnpm 11. Dependencias fijadas en `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

En este equipo, `Start-Dev.ps1` permite iniciar la versión de desarrollo. La distribución estática se genera en `dist/`. No necesita backend ni claves.

**Entrega y publicación:** [docs/DELIVERY.md](docs/DELIVERY.md). Se incluyen instrucciones para alojamiento en raíz y para una subcarpeta de GitHub Pages. No ejecutar mediante `file://`.

## Funciones disponibles

- Luna fija con cámara orbital, Tierra y Sol a escala geométrica real. Vistas desde la superficie y reproducción temporal. La posición inicial muestra el hemisferio sur iluminado en las fechas de ejemplo.
- Hasta ocho candidatos, comparación de escenarios guardados y variantes con retraso.
- Iluminación y visibilidad geométrica, con muestreo de cinco minutos y extremos exactos.
- Horizonte LOLA hasta 100 km en la cobertura local: DEM de 20 m cercano y regional de 80 m lejano; observador de 2 m y orientación MOON_ME/DE421.
- Enlace directo a una estación terrestre configurable: geometría, presupuesto de radio y disponibilidad con energía.
- Balance de batería con orientación de paneles, distancia solar, eficiencias y límites de potencia.
- Almacenamiento durante cortes, datos transmitidos, pendientes y pérdidas por saturación.
- Evaluación estática del terreno: pendientes, desnivel y residuos respecto a un plano. Malla de 20 m o 80 m según cobertura.
- Enlaces oficiales, mapa visual Moon Trek y contraste independiente mediante respuesta importada de Horizons.
- Informe JSON completo, CSV por lugar y controles de coherencia numérica.

El visor 3D no es un modelo topográfico. Los cálculos de terreno se realizan con DEM numéricos y sus resultados se presentan aparte. La vista de superficie y eventos usan el horizonte con relieve cuando hay un informe vigente y cobertura; en otro caso muestran la referencia esférica. Halos, atmósfera y estrellas son efectos visuales.

## Presentación y accesibilidad

Paleta azul, blanco y rojo, marca propia y tipografía del sistema sin descarga de fuentes externas. Formularios con etiquetas, foco visible, controles de teclado, tutorial repetible, prioridad de configuración en móvil y respeto inicial de movimiento reducido. Informes con un resumen y detalles desplegables. La interfaz permanece utilizable con coordenadas si WebGL falla.

## Alcance científico

Los valores iniciales son ejemplos editables, no requisitos NASA. El modelo esférico admite 2000–2100 y un máximo de 90 días; la orientación con relieve tiene un intervalo más restringido, documentado y comprobado por la aplicación. La cobertura regional de pendientes no amplía por sí sola la cobertura del horizonte temporal.

No se certifica viabilidad operativa o aterrizaje. Siguen fuera del modelo los relés sin datos de órbita y servicio, eclipses y disco solar parcial, obstáculos menores que la malla, mecánica del suelo, dinámica de aterrizaje y comportamiento térmico/envejecimiento. Los controles del exportador verifican coherencia, no sustituyen una validación física independiente.

## Documentación y créditos

- [Modelo y evolución científica](docs/SCIENCE.md)
- [Evaluación del terreno](docs/TERRAIN_SCREENING.md)
- [Recursos oficiales](docs/OFFICIAL_RESOURCES.md)
- [Formato y controles de exportación](docs/REPORT_EXPORT.md)
- [Fuentes y asistencia de IA](CREDITS.md)

React + TypeScript estricto + Vite, con Three.js/React Three Fiber para visualización y Astronomy Engine para efemérides. Un Web Worker ejecuta los cálculos. La asistencia de ChatGPT/Codex durante el desarrollo está declarada; la aplicación no utiliza servicios de IA en ejecución.

Verificación de esta versión: 98 pruebas automatizadas, TypeScript y compilación de producción. Las pruebas incluyen conservación de energía/datos, radio, DEM, transformaciones de referencia, exportación y un contraste acotado con Horizons. No son una certificación del modelo en todo su dominio.
