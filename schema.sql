CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20) UNIQUE NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barbeiros (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  duracao_minutos INTEGER DEFAULT 30,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  barbeiro_id INTEGER NOT NULL REFERENCES barbeiros(id),
  servico_id INTEGER REFERENCES servicos(id),
  data DATE NOT NULL,
  horario TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'agendado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_horario_ocupado
ON agendamentos (barbeiro_id, data, horario)
WHERE status IN ('agendado', 'bloqueado');

INSERT INTO barbeiros (nome, telefone)
VALUES
  ('Victor', '5522999999999'),
  ('Carlos', '5522888888888')
ON CONFLICT DO NOTHING;

INSERT INTO servicos (nome, preco, duracao_minutos)
VALUES
  ('Corte navalhado', 35.00, 30),
  ('Barba', 25.00, 30),
  ('Corte + barba', 55.00, 60),
  ('Sobrancelha', 15.00, 15)
ON CONFLICT DO NOTHING;
