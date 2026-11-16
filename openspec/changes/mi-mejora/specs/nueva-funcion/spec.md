# Especificación: Exportador Markdown

## ADDED Requirements

### Requirement: Botón de Exportación
La web DEBE incluir un botón "Exportar Informe Markdown" que genere un archivo `informe_incidencias.md` y lo descargue.

#### Scenario: Generación del informe
- **WHEN** el usuario pulsa el botón
- **THEN** se descarga un archivo Markdown con tabla de KPIs, tickets urgentes y resumen PII.
