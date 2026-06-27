-- EOM OS Empresa — Setup inicial

create table if not exists empresas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  nombre text,
  rubro text,
  num_personas integer,
  ingresos_mensual bigint,
  costo_directo_mensual bigint,
  gastos_fijos_mensual bigint,
  retiro_dueno_mensual bigint,
  clientes_activos integer,
  areas text[],
  ciclo_inicio timestamptz default now(),
  onboarding_completo boolean default false,
  created_at timestamptz default now()
);

create table if not exists diagnosticos_empresa (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  scores jsonb,
  score_total integer,
  estado text,
  ciclo integer default 1,
  created_at timestamptz default now()
);

alter table empresas enable row level security;
alter table diagnosticos_empresa enable row level security;

create policy "usuarios ven su empresa" on empresas for all using (auth.uid() = user_id);
create policy "usuarios ven sus diagnosticos" on diagnosticos_empresa for all using (auth.uid() = user_id);
