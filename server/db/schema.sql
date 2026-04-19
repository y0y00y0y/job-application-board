create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_token_hash_idx on sessions(token_hash);
create index if not exists sessions_user_id_idx on sessions(user_id);

create table if not exists applications (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  company text not null,
  position text not null,
  stage text not null check (stage in ('applied', 'test', 'interview', 'offer', 'rejected')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  apply_date date not null,
  deadline date,
  link text,
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_stage_order_idx
  on applications(user_id, stage, sort_order);
