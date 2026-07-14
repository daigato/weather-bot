-- ============================================
-- AIお天気LINEボット: user_settings テーブル
-- Supabase SQL Editor で実行してください
-- ============================================

-- ユーザー設定テーブル
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  line_user_id text,
  city_key text not null default '東京',
  character text not null default 'オカン',
  notification_time text not null default 'off',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create unique index idx_user_settings_user_id on public.user_settings(user_id);
create index idx_user_settings_line_user_id on public.user_settings(line_user_id);

-- RLS（行レベルセキュリティ）の有効化
alter table public.user_settings enable row level security;

-- 自分の設定のみ読み書き可能とするポリシー
create policy "ユーザーは自分の設定のみ参照可能"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "ユーザーは自分の設定のみ挿入可能"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "ユーザーは自分の設定のみ更新可能"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- updated_at を自動更新するトリガー
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();
