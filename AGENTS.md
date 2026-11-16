# Contexto del Proyecto: MotorShield Taller - JM

## Descripción General
Aplicación web interactiva (Dashboard) para gestionar incidencias y presupuestos de un taller mecánico / concesionario, desarrollada por Jorge Montalban, garantizando que ningún dato personal sensible (PII) quede expuesto según normativa RGPD.

## Stack Tecnológico Obligatorio
- **Frontend:** HTML5 semántico en un archivo `index.html`.
- **Estilos:** TailwindCSS cargado mediante CDN oficial (no usar compiladores complejos para facilitar el despliegue directo). Diseño moderno, limpio y responsive con soporte para modo claro/oscuro.
- **Lógica:** JavaScript Vanilla moderno (ES6+) en un archivo `app.js`.
- **Persistencia de Datos:** Carga inicial desde `datos_tickets.json` y guardado de cambios en `localStorage` del navegador.

## Reglas de Código para el Agente
1. Todo el código y los comentarios deben estar en **español**.
2. NUNCA uses `innerHTML` directamente con textos de usuario sin escapar para evitar vulnerabilidades XSS.
3. Mantén las funciones pequeñas, claras y fáciles de entender por un estudiante de 2º de DAW.
