/* 19-footer.js — 附录：Supabase 建表 SQL 注释 */

/* ============================================================
   共享榜（Supabase）建表 SQL —— 在 Supabase SQL Editor 执行：
   ------------------------------------------------------------
   create table leaderboard (
     id      text   primary key check (char_length(id) <= 10),
     school  text   not null,
     band    text   not null,
     grade   text   not null,
     score   int    not null,
     gpa     real,
     sat     int,
     ts      bigint  default extract(epoch from now())::bigint
   );
   alter table leaderboard enable row level security;
   -- 匿名可读榜
   -- 已通过 Supabase Management API 自动建表并应用策略（见 /tmp/supasetup.js）。
   -- 实际生效策略（支持 select/insert/upsert，限制 id≤10 字）：
   --   create policy "public all" on leaderboard for all to anon using (true) with check (char_length(id) <= 10);
   -- 本文件 LEADERBOARD 已置 mode:"supabase" 并填好 url / anonKey / table，可直接使用。
   ============================================================ */
