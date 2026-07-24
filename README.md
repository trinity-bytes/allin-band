<div align="center">
  <img src="assets/images/vivessense-logo.png" alt="AllinBand Logo" width="120" />
</div>

# AllinBand

> Seguridad que te acompana. Autonomia que te cuida.

Pulsera inteligente para monitoreo continuo de signos vitales con deteccion temprana mediante Machine Learning y respuesta automatica ante emergencias.

[Live Demo](https://trinity-bytes.github.io/AllinBand-Landing/)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

## Overview

AllinBand es un sistema de cuidado saludable disenado para pacientes con condiciones de riesgo y adultos mayores. La pulsera monitorea frecuencia cardiaca, saturacion de oxigeno y temperatura de forma continua y silenciosa.

**Flujo principal:**

1. La pulsera mide signos vitales 24/7 sin accion del usuario
2. ML analiza patrones personales y detecta anomalias criticas
3. Se activa alerta local + notificaciones a contactos + ubicacion

**Audiencias:**

- **Pacientes:** independencia con proteccion silenciosa
- **Cuidadores:** notificaciones precisas solo ante emergencias reales

## Getting Started

No se requiere instalacion. Es un sitio estatico puro (HTML + CSS + JS).

```bash
# Clonar el repositorio
git clone https://github.com/trinity-bytes/AllinBand-Landing.git
cd AllinBand-Landing

# Abrir en navegador
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

No hay paso de build, dependencias npm, ni servidor de desarrollo. Los archivos CSS y JS se cargan directamente.

## Project Structure

```
allin-band/
  index.html                 # Pagina principal (single-page)
  css/
    variables.css            # Design tokens: colores, tipografia, espaciados, breakpoints
    reset.css                # CSS reset + prefers-reduced-motion
    base.css                 # Tipografia, container, scrollbar, estilos globales
    components.css           # Botones, cards, badges, forms, grid de features
    sections.css             # Estilos por seccion: navbar, hero, FAQ, footer, etc.
    utilities.css            # Clases utilitarias (margin, padding, text, flex, display)
  js/
    main.js                  # Navegacion, smooth scroll, FAQ accordion, back-to-top
    animations.js            # IntersectionObserver scroll reveal, stat counters
    form.js                  # Validacion y envio simulado del formulario de contacto
  assets/
    images/                  # Logo, favicon, producto, imagenes de contenido
    icons/                   # Favicon.ico
  docs/
    DESIGN-PLAN.md           # Design blueprint y decisiones de arquitectura visual
```

## Architecture

### Design System (CSS Custom Properties)

Todo el diseno se rige por tokens en `css/variables.css`. Cambiar un valor ahi actualiza toda la pagina.

**Paleta dark premium:**
- Superficies: `#0b0f1a` (deep), `#111827` (surface), `#1f2937` (alt), `#1a2332` (elevated)
- Texto: `#f9fafb` (primary), `#d1d5db` (body), `#9ca3af` (muted)
- Acentos: `#8b5cf6` (violet), `#06b6d4` (cyan), `#f59e0b` (warm/CTA)

**Tipografia:**
- Display: Space Grotesk (headings, numeros de stats)
- Body: Inter (texto general)
- Mono: JetBrains Mono (datos tecnicos, contadores)

### CSS Architecture

- **Modular**: Cada archivo CSS tiene una responsabilidad unica
- **Mobile-first**: breakpoints en 640, 768, 1024, 1280px
- **Sin frameworks**: CSS puro con Custom Properties, Flexbox y Grid
- **Reduced motion**: respetado en animaciones CSS y JS via `prefers-reduced-motion`

### JavaScript

Vanilla JS sin dependencias. Tres archivos con responsabilidades separadas:

- `main.js`: navegacion, scroll, FAQ, back-to-top
- `animations.js`: scroll reveal (IntersectionObserver), contadores animados
- `form.js`: validacion de formulario, envio simulado

### Accessibility

- `lang="es"` preservado
- headings semanticos (h1 > h2 > h3)
- `aria-expanded` y `aria-controls` sincronizados en FAQ
- `aria-hidden` en elementos decorativos (ECG, pulse rings)
- focus visible con `outline` en todos los controles interactivos
- contraste de texto >= 4.5:1 en todas las superficies dark

## Key Features

| Feature | Implementation |
|---|---|
| Dark premium theme | CSS custom properties, aurora gradient backgrounds |
| Glassmorphic cards | `backdrop-filter: blur()` con fallback solido |
| ECG animation | SVG polyline + CSS `@keyframes ecgSweep` |
| Pulse rings | CSS `@keyframes pulseExpand` con delays escalonados |
| Scroll reveal | IntersectionObserver, 15% threshold, unobserve after trigger |
| Stat counters | IntersectionObserver + `requestAnimationFrame` con ease-out |
| FAQ accordion | max-height transition + aria-expanded/aria-controls |
| Responsive | Mobile-first grid, 4 breakpoints |

## Browser Support

- Chrome 80+
- Firefox 80+
- Safari 14+
- Edge 80+

Requiere soporte para `backdrop-filter` (con fallback solido si no esta disponible).

## Team

Desarrollado por **Vivessence** — Arquitectura de Computadoras, UPC 2025.
