<div align="center">
  <img src="assets/brand/mark.svg" alt="AllinBand" width="96" />
</div>

# AllinBand

> Antes de avisar a tu familia, AllinBand te pregunta a ti.

Landing del concepto AllinBand: una pulsera que vigila los signos vitales, pregunta a quien la lleva si está bien y, si no responde, avisa en orden a sus contactos.

**Es un proyecto académico.** No es un dispositivo médico, no está a la venta y la página no recoge datos. Las cifras son objetivos de diseño, no resultados medidos.

[Ver la demo](https://trinity-bytes.github.io/allin-band/)

![Vista de la landing](assets/images/og-image.jpg)

## Cómo funciona la página

La página es el chat de una familia. Abre con la pulsera preguntando "¿Estás bien?" y la respuesta del visitante decide lo que pasa:

- **Estoy bien:** la alerta se cancela y nadie recibe nada.
- **No puedo responder:** la alerta sube por la red de contactos hasta que alguien confirma.

Nombres, datos y tiempos de la conversación son ficticios.

## Ejecutar en local

Es un sitio estático, sin instalación ni paso de build. Los enlaces y fuentes funcionan mejor con un servidor:

```bash
git clone https://github.com/trinity-bytes/allin-band.git
cd allin-band
python3 -m http.server 8000
```

## Estructura

```
index.html            Página única
css/
  variables.css       Tokens: color, tipografía, espacio, forma, movimiento
  reset.css           Reset
  base.css            Fuentes, tipografía, foco, salto al contenido
  chat.css            Burbujas, avisos, confirmaciones, botones de respuesta
  sections.css        Cabecera, fondos de pantalla y secciones
js/
  main.js             Menú, sección activa, botón flotante
  demo.js             Reproduce la alerta según la respuesta
assets/
  brand/              Logo, favicon y fondo de pantalla (SVG)
  fonts/              Atkinson Hyperlegible Next, Bricolage Grotesque
  images/             Pulsera y fotos ilustrativas (WebP), imagen para compartir
```

## Decisiones

- **Sin JavaScript se lee todo:** la conversación completa está en el HTML y `demo.js` solo la reproduce.
- **Sin terceros:** las fuentes se sirven desde el proyecto, así que la página no hace peticiones externas.
- **Texto que escala:** los tamaños van en `rem` y los cortes en `em`, por lo que respetan el tamaño de letra del navegador. El cuerpo parte en 18 px.
- **Movimiento:** solo se anima la llegada de los mensajes, y respeta `prefers-reduced-motion`.
- **Accesibilidad:** objetivo WCAG 2.2 AA.

## Equipo

Desarrollado por **Vivessence** para el curso Arquitectura de Computadoras, UPC 2025.
