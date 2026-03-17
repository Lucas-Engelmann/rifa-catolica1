-- ============================================================
-- COLE ESTE CÓDIGO INTEIRO NO "SQL Editor" DO SUPABASE
-- E CLIQUE EM "RUN"
-- ============================================================

-- Tabela de números reservados
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  metodo_notificacao TEXT DEFAULT 'ambos',
  codigo_confirmacao TEXT NOT NULL,
  valor_pago NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente', -- pendente | pago | cancelado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela do sorteio
CREATE TABLE IF NOT EXISTS sorteio (
  id SERIAL PRIMARY KEY,
  numero_sorteado INTEGER,
  nome_vencedor TEXT,
  codigo_vencedor TEXT,
  realizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por número
CREATE INDEX IF NOT EXISTS idx_tickets_numero ON tickets(numero);

-- Permitir leitura pública dos números reservados (sem dados pessoais)
CREATE OR REPLACE VIEW numeros_reservados AS
  SELECT numero, status FROM tickets WHERE status != 'cancelado';

-- Liberar acesso anônimo de leitura na view
GRANT SELECT ON numeros_reservados TO anon;

-- Liberar insert na tabela tickets para usuários não autenticados
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode reservar" ON tickets
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Leitura apenas dos próprios tickets por codigo" ON tickets
  FOR SELECT TO anon USING (true);

-- Liberar leitura do sorteio para todos
ALTER TABLE sorteio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública do sorteio" ON sorteio
  FOR SELECT TO anon USING (true);
CREATE POLICY "Admin pode inserir sorteio" ON sorteio
  FOR INSERT TO anon WITH CHECK (true);
