-- PRINT or NOT? 共有DBのスキーマ（Supabase の SQL Editor で実行する）
--
-- 【アクセス方針】
-- 生徒はログインしないため、Supabase Auth の RLS（行単位の本人判定）は使えない。
-- その代わり「全テーブルで RLS を有効にし、ポリシーを1つも作らない」ことで anon / authenticated からの
-- 読み書きをすべて拒否し、アクセスを Next.js の API（service role キー、サーバー内のみ）経由だけに限定している。
-- service role キーはブラウザに渡さない。入力の検証・レート制限・教員パスコードは API 側で行う。
--
-- 【個人情報】氏名・メールアドレスの列は作らない。識別子は「クラス＋出席番号」のみ。

-- ---- 生徒の立場 ----
create table if not exists public.pon_students (
  class_id      text        not null,
  number        smallint    not null check (number between 1 and 60),
  stance_before smallint    check (stance_before between 1 and 5),
  stance_after  smallint    check (stance_after between 1 and 5),
  stance_reason text,
  updated_at    timestamptz not null default now(),
  primary key (class_id, number)
);

-- ---- Evidence Card ----
create table if not exists public.pon_cards (
  class_id        text        not null,
  number          smallint    not null check (number between 1 and 60),
  article_id      text        not null,
  side            text        not null check (side in ('pro', 'con')),
  point           text        not null,
  source_sentence text        not null default '',
  fact            text        not null default '',
  number_example  text        not null default '',
  so_what         text        not null default '',
  weak_point      text        not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (class_id, number, article_id)
);

-- ---- ヒント開示ログ ----
create table if not exists public.pon_hint_logs (
  id         bigserial   primary key,
  class_id   text        not null,
  number     smallint    not null check (number between 1 and 60),
  article_id text        not null,
  level      text        not null check (level in ('lv1', 'lv2')),
  paragraph  smallint    not null check (paragraph >= 0),
  hint       smallint    not null check (hint between 1 and 3),
  created_at timestamptz not null default now()
);
create index if not exists pon_hint_logs_class_idx on public.pon_hint_logs (class_id, article_id, level, paragraph);

-- ---- 設定（1行だけ） ----
create table if not exists public.pon_settings (
  id         int         primary key default 1 check (id = 1),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---- RLS: 有効化のみ（ポリシー無し = anon / authenticated は一切読み書きできない） ----
alter table public.pon_students  enable row level security;
alter table public.pon_cards     enable row level security;
alter table public.pon_hint_logs enable row level security;
alter table public.pon_settings  enable row level security;

revoke all on public.pon_students, public.pon_cards, public.pon_hint_logs, public.pon_settings from anon, authenticated;
revoke all on sequence public.pon_hint_logs_id_seq from anon, authenticated;

-- ---- 匿名集計ビュー（出席番号を含まない。件数のみ） ----
create or replace view public.pon_class_stance_view as
  select class_id, stance_before, stance_after, count(*)::int as students
  from public.pon_students
  group by class_id, stance_before, stance_after;

-- 教員画面で「ヒントが多く開かれた段落」を出すための匿名集計（出席番号を含まない）
create or replace view public.pon_hint_paragraph_view as
  select class_id, article_id, level, paragraph, count(*)::int as opens
  from public.pon_hint_logs
  group by class_id, article_id, level, paragraph;

-- ビューも anon / authenticated には公開しない（サーバー API が service role で読む）
revoke all on public.pon_class_stance_view, public.pon_hint_paragraph_view from anon, authenticated;
