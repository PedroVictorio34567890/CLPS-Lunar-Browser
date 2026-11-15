# Entrega · Lunar Mission Browser 0.3.0

## Qué subir

La carpeta `dist/` contiene la web compilada. Publica **todo su contenido**, incluidas las carpetas `assets`, `textures` y `terrain`, en un alojamiento estático HTTPS. No necesita backend ni claves. No abras `index.html` mediante `file://`: el worker y los datos necesitan HTTP/HTTPS.

El ZIP `release/Lunar-Mission-Browser-web.zip` contiene esa misma distribución, preparada para servir desde la raíz de un dominio. Extraer y publicar su contenido; la aplicación no se ejecuta dentro del ZIP. Este archivo no incluye escenarios privados guardados en el navegador.

Para un sitio bajo una subcarpeta, por ejemplo GitHub Pages del repositorio, recompila con:

```sh
pnpm exec vite build --base=/CLPS-Lunar-Browser/
```

Publica ese nuevo `dist/` en la ruta correspondiente. El ZIP anterior es para raíz: no reutilizarlo para esa subcarpeta sin regenerarlo. Las texturas y los DEM respetan la base configurada. Sirve JavaScript con su tipo MIME correcto y permite descargar `.f32`, `.i16` y `.f64`; no sustituyas esos archivos por una página HTML.

## Demostración breve

1. Abre la web, elige español o inglés y cierra o recorre el tutorial.
2. Pulsa «Añadir ejemplo LOLA · borde de Shackleton».
3. Conserva las fechas y los requisitos de ejemplo y pulsa «Analizar y comparar».
4. Explica el resumen inicial. El ejemplo permite demostrar cortes; no está presentado como un lugar favorable o certificado.
5. Abre comunicaciones, datos o terreno según el aspecto que quieras enseñar.
6. Abre «Guardar los resultados» para descargar JSON o CSV.

El tutorial se puede repetir desde la cabecera. Los escenarios se guardan explícitamente en el navegador; el despliegue público no los sincroniza.

## Comprobación tras publicar

- Abre el enlace público en una ventana privada sin iniciar sesión.
- Comprueba que la Luna se dibuja y que el ejemplo completa el cálculo.
- Confirma que aparecen relieve LOLA y resultados de terreno, y que se descargan JSON/CSV.
- Comprueba el enlace desde móvil. La configuración aparece primero en pantallas pequeñas.
- Usa la URL pública en el formulario del concurso, no una dirección localhost.

Los enlaces externos y las teselas oficiales requieren Internet. Los cálculos usan los datos numéricos incluidos. La aplicación no incluye una API de IA en ejecución.

## Estado y límites

Versión de demostración y estudio, no una herramienta oficial o certificada de NASA. Paleta azul, blanco y rojo con marca propia; no utiliza el logotipo de NASA. La ayuda de IA durante desarrollo está declarada en `CREDITS.md` y en los metadatos JSON. Los modelos, la cobertura y las limitaciones se explican en el informe y en la documentación científica.

La presentación puede entregarse como prototipo funcional; no implica que se hayan resuelto las validaciones físicas pendientes, relés reales, eclipses o riesgos de aterrizaje a escala inferior al DEM.
