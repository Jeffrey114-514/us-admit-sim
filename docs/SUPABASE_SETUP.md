# Supabase 共享排行榜 · 部署与 RLS 加固指南

本游戏（`us-admit-sim`）的官方站点 `https://us-admit-sim.vercel.app` 使用 Supabase 托管一张**跨玩家共享排行榜**。
仓库已 public，`LEADERBOARD.anonKey`（`src/js/16-leaderboard.js` 第 10 行）人人可读，因此**整张表的安全完全依赖 Row Level Security（RLS）**。

> ⚠️ **上线前必须执行本文「三、RLS 加固 SQL」**。在未加固状态下，`anon` 角色持有 `DELETE`（实测返回 204），任何人都能清空整张榜单。
> 本仓库默认只授予 `select / insert / update`，**绝不授予 `delete`**——这是底线。

---

## 一、建表（在 Supabase SQL Editor 执行一次）

```sql
create table if not exists public.leaderboard (
  id    text    primary key,                       -- 玩家临时 ID（≤10 字）
  school text   not null default '',               -- 最佳录取校名
  band  text    not null default '',               -- 冲刺 / 匹配 / 保底
  grade text    not null default '',               -- S / A / B / —
  score integer not null default 0,                -- 综合分（0 – 100000）
  gpa   numeric not null default 0,                -- 累计 GPA（0 – 5）
  sat   integer not null default 0,                -- SAT 最高分（0 – 1600）
  ts    bigint  not null default 0                 -- 上传时间戳（Date.now()）
);
```

前端逻辑（`16-leaderboard.js`）：
- 上传：`upsert(lbEntry, {onConflict:"id"})` —— 同名玩家只保留历史最佳（不覆盖更高分）。
- 拉榜：`select("*").order("score",{ascending:false}).limit(50)`。

---

## 二、开启 RLS（安全基石）

```sql
alter table public.leaderboard enable row level security;
```

RLS 开启后，**任何角色在没有匹配策略时都被默认拒绝**。下面逐条显式授权。

---

## 三、RLS 加固 SQL（核心，上线前必须执行）

```sql
-- 1) 撤销旧权限（若之前执行过 grant all / 表默认 public 授权）
revoke all on public.leaderboard from anon;
revoke all on public.leaderboard from public;

-- 2) 授予最小权限集：仅 select / insert / update（不含 delete）
grant select, insert, update on public.leaderboard to anon;

-- 3) 任何人都能看榜（公开榜）
drop policy if exists "lb_select" on public.leaderboard;
create policy "lb_select" on public.leaderboard
  for select using (true);

-- 4) 上传（insert）：强制输入校验，杜绝恶意/越界数据
drop policy if exists "lb_insert" on public.leaderboard;
create policy "lb_insert" on public.leaderboard
  for insert with check (
    length(id) between 1 and 10              -- ID 1–10 字
    and length(coalesce(school,'')) <= 40   -- 校名 ≤40 字
    and score between 0 and 100000           -- 分数上界
    and gpa   between 0 and 5
    and sat   between 0 and 1600
  );

-- 5) 同名 upsert（update）：同样校验
drop policy if exists "lb_update" on public.leaderboard;
create policy "lb_update" on public.leaderboard
  for update using (true) with check (
    length(id) between 1 and 10
    and length(coalesce(school,'')) <= 40
    and score between 0 and 100000
    and gpa   between 0 and 5
    and sat   between 0 and 1600
  );

-- 6) 绝不授予 delete（防止整张榜被清空）
--    anon 未被 grant delete → 默认无权删除，无需额外语句。
--    请勿在这里添加任何 grant delete 或 drop policy 之外的放行。
```

> **为什么没有 `delete` 策略**：RLS 策略只定义「允许什么」。`anon` 既然没被 `grant delete`，删除请求会被数据库直接拒绝（返回 `permission denied`）。这是双保险——即使有人拿到 anonKey，最多只能写脏数据，不能清空榜单。

---

## 四、加固后的已知权衡（请知悉）

由于 `anon` 无登录身份（没有 `auth.uid()`），**`update` 策略无法限定「只能改自己的行」**。这意味着理论上某玩家可把别的玩家的分数改低/改高。
这是公开匿名榜的固有限制，可接受，因为：
1. 影响有限（只是游戏比分，非敏感数据）；
2. 输入校验（`id/school/score` 边界）已挡住 SQL 注入与越界写入；
3. **最致命的「整表清空」已被 `delete` 禁权彻底阻断**。

如需更强保护，可后续引入「上传口令 / 签名校验」机制（不在本文范围）。

---

## 五、验证加固是否生效

在 Supabase SQL Editor 用 **anonKey 对应的 REST/SQL** 跑以下检查（或用任意 HTTP 客户端，对 `https://<project>.supabase.co/rest/v1/leaderboard` 发请求）：

```sql
-- (A) 删除必须失败（加固前返回 204，加固后应报错 permission denied）
delete from public.leaderboard where id = 'test';

-- (B) 合法上传必须成功
insert into public.leaderboard (id, school, band, grade, score, gpa, sat, ts)
values ('tester','Harvard','reach','S',12345,4.0,1550,9999999999999);

-- (C) 越界上传必须失败（命中 with check）
insert into public.leaderboard (id, school, band, grade, score, gpa, sat, ts)
values ('cheater','X', 'reach','S', 999999, 9.9, 9999, 0);   -- score/gpa/sat 越界 → 拒绝

-- (D) 清理测试数据
delete from public.leaderboard where id = 'tester';   -- 应失败（验证 A 的结论）
```

期望结果：A 报错、B 成功、C 报错、D 报错。

---

## 六、现有榜单数据备份

执行加固 / 任何破坏性操作前，先备份：
- 本地已有一份备份：`/tmp/lb_backup/leaderboard_20260902_2230.json`（2026-09-02 抓取）。
- 重新备份（需要 Supabase 服务密钥或 SQL 导出）：
  ```sql
  copy (select * from public.leaderboard order by score desc)
  to '/tmp/leaderboard_backup.csv' with (format csv, header true);
  ```
  > 注意：该 `copy ... to` 需数据库超级用户权限（Supabase 不支持直接写服务器文件）；一般用 SQL Editor 的导出功能或 `select *` 后手动保存。

---

## 七、故障排查

| 现象 | 原因 | 处理 |
|------|------|------|
| 上传报 `new row violates row-level security policy` | 命中 `with check` 校验（ID 太长 / 分数越界） | 检查前端 `maxlength="10"` 与分数范围；不要绕过校验 |
| 上传报 `permission denied` | `anon` 未被授予 `insert` | 重跑「三」中的 `grant ... to anon` |
| 拉榜为空 / 403 | `select` 策略缺失或被撤销 | 重跑 `lb_select` 策略 |
| 整表被清空（加固前） | `anon` 曾持有 `delete` | 立即执行「三」加固 + 用备份恢复 |

---

> 维护提示：本文件与代码中的 `LEADERBOARD` 配置、前端校验（`16-leaderboard.js` 第 138–141 行的 ID 长度检查）应保持一致。改了校验规则，记得同步更新这里的 SQL `with check` 条件。
