# Referencia independiente de JPL Horizons

`horizons-lunar-2026.json` conserva la respuesta original de NASA/JPL Horizons, consultada el 28 de septiembre de 2026. No se necesita red al ejecutar las pruebas.

Endpoint: https://ssd.jpl.nasa.gov/api/horizons.api

Parámetros: `format=json`, `COMMAND='301'`, `CENTER='500@399'`, `EPHEM_TYPE='OBSERVER'`, `START_TIME='2026-09-27'`, `STOP_TIME='2026-10-04'`, `STEP_SIZE='1 d'`, `QUANTITIES='14,15'`, `CSV_FORMAT='YES'`.

Se comparan ocho fechas UTC: longitud/latitud del punto subterrestre y subsolar. El signo este de Horizons y su rango 0–360° se normalizan al comparar con el rango ±180° de la aplicación. Tolerancia de regresión: 0,05° por coordenada.

Horizons utiliza DE441/MOON_ME y posiciones aparentes; la aplicación utiliza vectores geométricos simultáneos y orientación IAU analítica de Astronomy Engine. Por ello no se exige igualdad exacta. Esta comprobación acotada detecta errores de orientación, signo, unidades y tiempo; no certifica la precisión sobre todo 2000–2100 ni valida sombras de relieve, eclipses o comunicaciones operativas.

Definiciones de las cantidades 14 y 15: https://ssd.jpl.nasa.gov/horizons/manual.html
