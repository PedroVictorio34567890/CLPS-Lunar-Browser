# Fuentes y créditos

Lunar Mission Browser es un proyecto independiente para NASA Space Apps 2026. No representa aprobación o certificación de NASA. El símbolo orbital y el favicon son elementos de la aplicación, no logotipos NASA.

## Datos y referencias

- [NASA PGDA · LOLA, Site04](https://pgda.gsfc.nasa.gov/products/78): elevaciones de Shackleton, procesadas a 20 m; Barker et al. (2021), Planetary and Space Science 203, 105119. Los hashes y transformaciones están en `public/terrain`.
- [LRO/LOLA · LDEM_80S_80M](https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_80M.LBL): DEM regional a 80 m, recortado para la aplicación.
- [NASA/JPL NAIF SPICE](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/): orientación MOON_ME/DE421 preparada con SpiceyPy; metadatos y kernels en `public/terrain/frame-metadata.json`.
- [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/): contraste independiente de coordenadas, con alcance acotado.
- [NASA Moon Trek](https://trek.nasa.gov/moon/): contexto visual mediante WMTS, no elevaciones calculadas desde imágenes.
- [LROC QuickMap](https://quickmap.lroc.asu.edu/): enlace de inspección externa.
- [NASA SVS · CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/): textura lunar, Ernie Wright; datos LRO/LROC y LOLA.
- [NASA/JPL · Telecommunications Link Design Handbook](https://deepspace.jpl.nasa.gov/dsndocs/810-005/): referencia de radio.
- [Canadian Space Agency · Moon exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/): contexto de exploración lunar, no datos de un servicio de relé.

## Software y recursos visuales

- [Astronomy Engine](https://github.com/cosinekitty/astronomy), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/).
- [Three.js](https://threejs.org/), [React Three Fiber](https://github.com/pmndrs/react-three-fiber), [Drei](https://github.com/pmndrs/drei), [Lucide](https://lucide.dev/).
- [Textura terrestre de los ejemplos Three.js](https://github.com/mrdoob/three.js/blob/dev/examples/textures/planets/earth_atmos_2048.jpg): imagen estática, no meteorología en tiempo real.
- [SpiceyPy](https://github.com/AndrewAnnex/SpiceyPy): preparación de la tabla de orientación.

Los recursos externos conservan sus atribuciones y licencias originales. No se atribuye autoría de esos recursos al equipo.

## Asistencia de IA

OpenAI ChatGPT/Codex ha asistido en programación, depuración, pruebas, documentación, textos y estilos de interfaz. Los datos científicos originales proceden de las fuentes indicadas; los resultados calculados son estimaciones del modelo, no nuevas observaciones NASA. La aplicación no necesita servicios de IA para ejecutar sus cálculos. Si se incorporan medios generados con IA a una presentación o vídeo, deben declararse conforme a los requisitos de la entrega.
