create table if not exists household_chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default timezone('utc', now()),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb
);

create index if not exists household_chat_messages_household_id_created_at_idx
  on household_chat_messages (household_id, created_at);
