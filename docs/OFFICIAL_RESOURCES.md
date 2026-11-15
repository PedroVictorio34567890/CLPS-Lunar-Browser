# Integración de recursos oficiales · revisión 2026-11-14

Los cuatro portales aportados no son un archivo nuevo de misión ni proporcionan por sí solos órbitas o ventanas contractuales de relé. No se atribuye una fecha de publicación nueva a sus datos. El cuarto recurso pertenece a la Agencia Espacial Canadiense.

## Uso en la aplicación

Abrir **Recursos oficiales · mapas y verificación**, debajo del área de trabajo. Seleccionar un lugar candidato para ver su tesela polar; cambiar el nivel de detalle para ampliar. Los cuatro recursos tienen enlaces y atribución. Las coordenadas norte/este se muestran listas para copiar en QuickMap o Moon Trek; no se inventan parámetros de enlace profundo no documentados.

### Moon Trek

- Fuente: https://trek.nasa.gov/moon/
- API cartográfica: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
- Capa verificada: `LRO_LOLA_Shade_SPole875_5mp_v04`.
- Capacidades: https://trek.nasa.gov/tiles/Moon/SP/LRO_LOLA_Shade_SPole875_5mp_v04/1.0.0/WMTSCapabilities.xml
- Proyección: estereográfica polar sur, IAU2000:30120, radio 1.737.400 m, longitud este. x = 2R tan((90+lat)/2) sin(lon), y = 2R tan((90+lat)/2) cos(lon).
- Extensión declarada: x/y entre −75.840 y 75.840 m. Origen de matriz: −1.095.930, +1.095.930 m. Teselas de 256 píxeles. Lado de tesela de nivel z: 2.191.860 / 2^z m; niveles disponibles 0–9, interfaz 4–9. Índices de filas y columnas derivados del origen, no de la extensión del producto.
- Carga bajo demanda al abrir el panel. Las teselas permanecen en el servicio oficial; sin copia masiva, proxy ni descarga local del mosaico. Los fallos de carga y la ausencia de cobertura se muestran expresamente.
- Es una imagen de relieve sombreado, no un DEM numérico ni una simulación de iluminación. Una respuesta PNG correcta puede incluir zonas sin datos. El norte local varía sobre la proyección. El producto no amplía la cobertura del DEM científico instalado, no calcula pendientes ni demuestra seguridad de aterrizaje.

### QuickMap

https://quickmap.lroc.asu.edu/ redirige al servicio actual https://quickmap.lroc.im-ldi.com/. Se conserva la entrada aportada por el usuario. Referencia para inspección externa de imágenes y capas LROC. No se extraen elevaciones de imágenes ni se atribuyen automáticamente capas del visor a los cálculos.

### Horizons

- Fuente: https://ssd.jpl.nasa.gov/horizons/
- Documentación: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Política de acceso: https://ssd-api.jpl.nasa.gov/doc/ (no incrustar las APIs en webs).
- La consulta abre una página externa iniciada por el usuario, sin fetch automático ni proxy. Usa fechas UTC de la misión, siete intervalos/ocho instantes, destino Luna 301, observador geocéntrico 500@399, cantidades 14/15, formato CSV dentro de respuesta JSON v1.2.
- El usuario pega o importa la respuesta (máximo 2 MB). Se verifican versión/fuente declaradas, objetivo, observador, centro geocéntrico, escala UT, columnas, valores finitos/rangos, orden temporal y extremos iguales al periodo actual. No se acepta una tabla de superficie en este importador. La firma textual no es autenticación criptográfica del origen.
- Se comparan longitudes y latitudes aparentes subterrestres/subsolares con el modelo geométrico IAU local; se informa el máximo absoluto por coordenada, con longitud circular. No es separación angular sobre el cielo. Las diferencias incluyen convenciones de orientación y tiempo de luz: no se usa un umbral de aprobación ni se reemplazan efemérides o resultados del motor.
- Cambiar el texto o el periodo impide mostrar/exportar un contraste obsoleto. La exportación incluye respuesta original, resultados, lugares, fechas, fuentes y alcance.
- Consultas adicionales de Sol 10 y Tierra 399 desde `coord@301`, longitud/latitud del candidato y altura de referencia 0 km, cantidad 4 (azimut/elevación aparentes sin refracción). Son ocho muestras de revisión externa, no ventanas de comunicación ni horizonte de terreno.
- Comprobación en vivo el 14 de noviembre de 2026: consulta 27 septiembre–4 octubre de 2026; ocho instantes; máximos de coordenadas ≈0,00296° Tierra y ≈0,00248° Sol. Este ejemplo no valida todo el dominio temporal.

### Agencia Espacial Canadiense

https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/ se integra como contexto de exploración, Gateway y robótica. No se convierte la existencia de Gateway en una garantía de relé. Faltan órbita/efemérides, estaciones, frecuencias, capacidades y disponibilidad de servicio de un relé concreto.

## Pendientes de la hoja de ruta

Esta integración queda separada de los siguientes puntos: relés reales, refinamiento de iluminación/energía, cobertura de terreno y seguridad de aterrizaje más amplias, y validación integral. El exportador de esta sección es una revisión de fuentes y contraste, no un informe completo de viabilidad.
