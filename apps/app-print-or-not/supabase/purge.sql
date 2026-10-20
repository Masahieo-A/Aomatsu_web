-- 課題終了後に全生徒データを削除する（students, cards, hint_logs）。
-- 設定（settings）は残す。元に戻せないので、必要なら先に教員画面で CSV を保存しておくこと。
-- Supabase の SQL Editor で実行する。教員画面（/teacher）の「データ削除」でも同じことができる。
begin;
truncate table public.pon_hint_logs, public.pon_cards, public.pon_students restart identity;
commit;
