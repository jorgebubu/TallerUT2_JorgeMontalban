-- Reto B: Persistencia centralizada en Supabase
CREATE TABLE tickets (
  id BIGINT PRIMARY KEY,
  autor TEXT,
  ubicacion TEXT,
  categoria TEXT,
  mensaje_anonimizado TEXT,
  pii_detectada JSONB,
  razonamiento_ia TEXT,
  prioridad TEXT,
  estado TEXT,
  tiempo_estimado_minutos INT,
  solucion_sugerida TEXT
);

-- Habilitar RLS y política pública de lectura/escritura para demo (ajustar en producción)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON tickets FOR ALL USING (true) WITH CHECK (true);
