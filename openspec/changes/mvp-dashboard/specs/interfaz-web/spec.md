# Especificación de la Aplicación Web

## ADDED Requirements

### Requirement: Panel Superior de Estadísticas (KPIs)
La web DEBE mostrar en la parte superior 4 tarjetas resumen que se calculen dinámicamente:
1. Total de tickets.
2. Tickets Pendientes de prioridad ALTA (en rojo).
3. Total de Datos Privados (PII) interceptados y protegidos.
4. Ataques / Rechazos bloqueados por el Root Prompt.

#### Scenario: Actualización automática de contadores
- **WHEN** se carga la página o se añade/resuelve un ticket
- **THEN** las 4 tarjetas superiores actualizan sus números al instante.

### Requirement: Listado de Tickets con Filtros y Buscador
La web DEBE mostrar las incidencias en tarjetas visuales (o tabla moderna) con insignias de colores según prioridad (`ALTA` rojo, `MEDIA` ámbar, `BAJA` verde) y estado.

#### Scenario: Filtrado interactivo
- **WHEN** el usuario selecciona una categoría (`TODAS`, `REDES`, `HARDWARE`, `SOFTWARE`, `FACTURACION`, `SEGURIDAD`) o escribe en el buscador
- **THEN** la lista muestra únicamente los tickets que coinciden sin recargar la página.

### Requirement: Formulario con Escudo RGPD en Vivo
La web DEBE incluir un formulario para crear un nuevo ticket que aplique las reglas de la skill `escudo-rgpd-js`.

#### Scenario: Creación de ticket con datos sensibles
- **WHEN** el usuario escribe un texto con DNI, tarjeta o IP en el formulario
- **THEN** la vista previa muestra el texto censurado y al guardar se almacena en localStorage con los datos protegidos.
