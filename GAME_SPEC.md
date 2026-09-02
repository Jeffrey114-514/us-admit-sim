# 美国大学申请模拟器（us-admit-sim）· 完整技术规格文档

> 用途：供其他 AI / 分析者完整理解本游戏的数值、公式与机制。单文件 HTML 游戏（`index.html`），无后端、无依赖。本文档对应代码状态：截至 2026-09-02（含压力系统①②③、评级拆 offer 后才显示、本地+Supabase 双路排行榜；尚未 commit）。

---

## 1. 游戏目标与总体结构

玩家从**初三上 → 高三上共 7 个学期**（round 0–6），养成一名计划申请海外大学的学生。每学期：先处理一张**随机事件**，再用**行动点（AP）**执行行动提升六维/标化/GPA，期末生成**成绩单**并触发**学期成长**。第 6 学期结束进入**夏校申请季**，第 7 学期结束进入**申请季**：选 1 所 ED（早决定，可选）+ 在 RD 勾选 10–20 所，最后逐封**翻牌拆 offer**。

全局常量（`config` 段）：

| 常量 | 值 | 含义 |
|---|---|--- |
| `TOTAL_ROUNDS` | 7 | 学期总数 |
| `AP_BY_ROUND` | `[3,3,4,4,5,5,8]` | 各学期行动点数（初三3/高一4/高二5/高三上8，全季共 32） |
| `START_POINTS` | 24 | 六维初始点池 |
| `DEALT` | 6 | 每期随机发放的非基础行动数 |
| `REACH_MAX` / `MATCH_MAX` / `SAFETY_MAX` | 5 / 10 / 10 | 三档候选校数量上限 |
| `RD_PER_BAND` | 10 | RD 每档可选上限 |
| `RD_MAX` | 20 | RD 总选校上限 |

年级映射：`[初三上, 初三下, 高一上, 高一下, 高二上, 高二下, 高三上]`（round 0–6）。

---

## 2. 开局设定（Setup）

### 2.1 六维属性 `STAT_NAMES`
`academic 学术 / english 英语 / stamina 精力上限 / creativity 创造力 / social 社交 / luck 运气`，各取值 1–12。
- 默认 `editStats` 各 4，合计 = `START_POINTS`(24)。
- 也可选模板 `TEMPLATES`：卷王(学术9)、快乐青年(均4)、斜杠(创5社5)、躺平(运气10)。

### 2.2 天性特质 `TRAITS`（随机 2 个）
| id | 名称 | 效果（fx） |
|---|---|--- |
| earlybird | 早起鸟 | 每回合精力恢复 +6（`energyRegen`） |
| socialbf | 社牛 | 社交/人脉收益 ×1.35，声望 +1 |
| koi | 锦鲤 | 运气 +2 |
| bookworm | 书虫 | 学术类行动收益 ×1.35 |
| linguist | 语言天赋 | 英语类行动收益 ×1.4 |
| athlete | 运动健将 | 精力上限 +8，压力增长 ×0.85 |
| iron | 抗压体质 | 压力增长 ×0.7 |
| glass | 玻璃心 | 压力增长 ×1.3，创造力 +1 |
| procras | 拖延症 | 精力消耗 ×1.25，英语 +2 起步 |
| perfection | 完美主义 | 文书/推荐信成长 ×1.3，压力增长 ×1.1 |

加成通过 `sumFx`(累加) / `mulFx`(累乘) 注入对应计算。

### 2.3 课程难度 `RIGOR`
| id | 名称 | 课程组合 mix | 说明 |
|---|---|---|--- |
| regular | 全常规 | 5×R | 易拿 A，加权 GPA 上限 4.0 |
| mixed | 混搭 | 2×AP + 1×H + 2×R | 默认，稳中求进 |
| heavy | 多 AP | 4×AP + 1×H | 加权 GPA 可冲 5.0，但难拿 A、耗精力 |

### 2.4 专业 `MAJORS`（影响对口行动与契合度）
`und 未定 / cs 计算机 / biz 商科 / sci 自然科学 / soc 人文社科 / art 艺术 / med 医学预科`。选具体专业后，每期随机行动里优先出现 2 个对口行动（`related`），且对口行动提升 `majorFit`（契合度）。

---

## 3. 每学期循环（核心玩法）

顺序：`enterEvent()`（事件）→ 玩家用 AP 执行行动（`doAction`）→ `endRound()`（出成绩单 + 成长 + 下一期）。

### 3.1 事件机制 `EVENTS` / `drawEvent()`
- 事件池 `EVENTS`（约 50+ 条），按 `cat`（学业/人际/机遇/健康/家庭/创意/荣誉）分类。
- `drawEvent`：`weightedPick(events, e=>e.fit||3)`，并避免最近用过的（`usedEvents` 上限 20）。
- 部分事件带 `stage:[6,7]`（仅高三触发，如"申请系统崩了""朋友圈焦虑""校友面试""ED 提交夜"）。
- `power:true` 事件（如"招生官点拨"）**不进常规加权池**，仅特殊触发。
- 有 `choices` 的事件需二选一，不同选择改精力/压力/属性/声望。

### 3.2 行动点、精力、压力
- 每点行动消耗 1 AP + 行动自身 `energy`，并增加 `stress`。
- `maxEnergy = 50 + 6*stamina + Σ(stamina 特质)`；开局精力 50（§4.3 斜率加陡：stamina 更值钱）。
- `pen()`：当 `stress >= 70` 时行动收益 ×0.5（精力类/学术类生效减半）。
- 休息（REST）：`energy -45, stress -14`（回血减压，但补偿有限，压力更黏）。
- 回合结束 `endRound`：精力 `+10 + regen`，压力 `-2`（自动回落幅度小，需主动管理）。
- 每学期自动减压小、事件/行动加压力为主，故全局 <30 不易达，需刻意休息。

### 3.3 学期成绩单（GPA 计算）
`genSemesterCourses()`：对每门课按 `RIGOR[rigor].mix` 生成原始分：
```
raw = 2.6 + 0.117*academic
    + (eRatio - 0.5)*0.45            # eRatio = 本学期平均精力 / maxEnergy
    - (strAvg/100)*0.30               # strAvg = 本学期平均压力（用均值，避免“最后一动休息”刷 GPA）
    + (luck - 6)*0.03
    - LEVEL_DIFF[lvl]                 # AP:0.20  H:0.10  R:0
    + gauss(0, 0.22)                  # 随机波动
    + GRADE_EASE[round]               # 低年级加分：见下
raw = clamp(raw, 0, 4.0)
grade = snapGrade(raw)                # 取 GRADE_SCALE 最近点
```
- **压力系统③（长期高压拖累 GPA）**：`closeSemester` 在算出 `gpaU/gpaW` 后，再减去 `stressDrag = K*(avgStress/10)²`（封顶 `CAP`），`K=0.008, CAP=0.45`。例：平均压力 30→扣 0.072、50→0.20、70→0.39、100→0.45。幅度轻但随压力二次加速，越高越明显；仅当 `drag>0.05` 时提示「长期高压拖累成绩」。
- `GRADE_EASE = [0.6, 0.6, 0.3, 0.3, 0.1, 0.1, 0]`（索引 = round 0..6，初三/高一更易拿 A）。
- `GRADE_SCALE`（绩点）：A4.0 / A-3.7 / B+3.3 / B3.0 / B-2.7 / C+2.3 / C2.0 / C-1.7 / D+1.3 / D1.0 / F0.0。
- 未加权：`gpaU` 用 `p`（原始绩点）；加权：`gpaW` 用 `wp = min(5, p + LEVEL_BONUS[lvl])`（`AP:+1.0 / H:+0.5 / R:0`）。
- `cumGPA(kind)`：所有学期 `质量点总和 ÷ 总学分`（kind="W" 加权 / "U" 未加权）。

### 3.4 学期成长（自动）
`closeSemester()` 末尾：六维 key 随机抽 3 个，各 `+0.5`（`clamp 1..12`），记日志。7 学期最多每维 +3.5。

### 3.5 标化考试公式
**SAT** `doSAT()`（高二起解锁）：
```
base   = 1090 + 40*english
noise  = gauss(0, 55) * (1 - 0.04*luck)
penalty = clamp((stress-40)/60, 0, 1) * 70     # §4.2 线性：压力从 40 起渐增扣分，无免疫阈值
sat    = round( clamp(base + noise + (luck-6)*5 - penalty, 400, 1560) / 10 ) * 10
（3% 概率满分 1600）
```
**托福** `doTOEFL()`（高一上起解锁）：
```
base   = 52 + 5.6*english
noise  = gauss(0, 5) * (1 - 0.04*luck)
penalty = clamp((stress-40)/60, 0, 1) * 7      # §4.2 线性（与 SAT 同源，幅度更小）
toefl  = round( clamp(base + noise + (luck-6)*1.2 - penalty, 40, 118) )
（3% 概率满分 120）
```
取历史最佳 `satBest / toeflBest`。`gauss` 为 Box–Muller 正态采样。

---

## 4. 行动清单（精确数值）

基础行动随年级解锁：`vocab`、`study` 常驻；`r>=2` 加 `toefl`；`r>=4` 加 `sat`；`r>=6` 加 `write`（打磨文书）；`r<=1` 加 `zk`（中考复习）。其余行动每期随机抽 `DEALT=6` 个（专业对口优先）。

| 行动 | 精力 | 压力 | 主要效果（受对应特质乘子影响） |
|---|---|---|--- |
| 背单词 vocab | 15 | 5 | 英语 +0.50×`englishGain`×`pen()` |
| 口语角 oral | 15 | 4 | 英语 +0.42，社交 +0.2，声望 +2 |
| 读外刊 read | 12 | 3 | 英语 +0.38，创造力 +0.15，文书质量 +0.15，声望 +1 |
| 打磨文书 write | 18 | 6 | 英语 +0.25，文书质量 +0.8，声望 +1（仅高三） |
| 刷 SAT sat | 35 | 12 | 考一次 SAT（见 §3.5） |
| 刷托福 toefl | 25 | 8 | 考一次托福（见 §3.5） |
| 啃硬课 study | 25 | 10 | 学术 +0.7×`academicGain`×`pen()`，声望 +1 |
| 泡图书馆 library | 20 | 6 | 学术 +0.5，创造力 +0.1，声望 +1 |
| 做科研 research | 28 | 12 | 学术 +0.6，推荐信 +0.4，声望 +1（拿奖 +2），`20%+学术%` 概率拿奖 |
| 冲竞赛 contest | 30 | 14 | 创造力 +0.3，声望 +2，按概率拿国家级奖 |
| 搞社团 club | 20 | 8 | 社交 +0.4，创造力 +0.2，声望 +3，履历 +1 项 |
| 发展特长 talent | 20 | 6 | 创造力 +0.6，文书 +0.2，声望 +1，按概率拿奖 |
| 经营人脉 network | 15 | 5 | 社交 +0.5，推荐信 +0.6，声望 +2 |
| 中考复习 zk | 18 | 8 | 初三专属，声望 +1 |
| 写代码 code | 26 | 10 | 专业 cs 对口，契合度 +，声望 +2 |
| 搞商赛/创业 biz | 24 | 9 | 专业 biz 对口，声望 +2 |
| 进实验室 lab | 26 | 10 | 专业 sci 对口，声望 +1 |
| 社科调研 debate | 18 | 5 | 专业 soc 对口，声望 +1 |
| 艺术创作 art | 18 | 5 | 专业 art 对口，声望 +1 |
| 医疗志愿 med | 20 | 6 | 专业 med 对口，声望 +2 |
| 休息 rest | -45 | -25 | 回精力、减压（无 AP 消耗，随时可用） |

对口行动 `majorGainFrom`：本专业 `+8`、相关专业 `+6` 契合度（`bumpFit`）。

---

## 5. 录取概率公式 `admitProb(p, sc, ed)`

输入档案 `p`（由 `buildProfile()` 从游戏状态生成）：

| 字段 | 来源 |
|---|--- |
| `gpa` | `cumGPA("U")` 未加权累计 GPA |
| `rigor` | 课程难度 id |
| `sat` / `toefl` | `results.satBest` / `results.toeflBest` |
| `ecCount` | 履历项数 `results.ecs.length` |
| `leadRoles` / `founded` / `natlAwards` | 领导角色 / 创办 / 国家级奖项数 |
| `creativity` / `essay` / `rec` | 创造力 / 文书质量(0–10) / 推荐信质量(0–10) |
| `luck` / `reputation` | 运气 / 声望(0–100) |
| `majorFit` | 专业契合度(0–1) |
| `spike` / `summer` | 突出成就 / 夏校加成 |
| `isIntl` | 是否为国际生（本游戏恒为 true） |

学校 `sc` 字段：`acceptRate, acceptRateIntl, sat25, sat75, gpaAvg, toeflMin, aidIntl, ed, edAcceptRate, admitByMajor, region, testReq`。

**逐步计算：**

```
// 1) 基准录取率（logit 空间）
intlRate = sc.acceptRateIntl ?? max(sc.acceptRate*0.6, 0.8)
baseRate = p.isIntl ? intlRate : sc.acceptRate
if (ed):
    if (sc.ed && sc.edAcceptRate != null) baseRate = sc.edAcceptRate
    else if (sc.ed) baseRate = clamp(baseRate * 2.4, 0.5, 42)   // ED 加成（无 ED 率时退回 ×2.4）
base = clamp(baseRate, 0.5, 95) / 100
logit = ln(base / (1 - base))

// 2) 各维度标准化分（z 分，单调递增）
rigorPts = sc.rigor=="heavy"?0.42 : sc.rigor=="mixed"?0.20 : 0
gpaEff = p.gpa + rigorPts * clamp((p.gpa - 2.4)/1.4, 0, 1)
zA    = sc.gpaAvg != null ? (gpaEff - sc.gpaAvg)/0.35 : 0
zT    = p.sat > 0 ? (p.sat - (sc.sat25!=null ? (sc.sat25+sc.sat75)/2 : 1420)) / 165 : 0
zTOEF = p.toefl > 0 ? (p.toefl - (sc.toeflMin!=null ? sc.toeflMin : 95)) / 28 : 0
ecScore = p.ecCount*0.5 + p.leadRoles*0.7 + (p.founded?1:0) + p.natlAwards*1.1 + p.creativity*0.15
zE    = ecScore/6 - 0.5
er    = (clamp(p.essay,0,10) + clamp(p.rec,0,10)) / 20
zR    = er - 0.5

// 3) 加权合成 S（学术总权 0.60，活动/文书 0.40）
S = 0.28*zA + 0.20*zT + 0.12*zTOEF + 0.24*zE + 0.16*zR
S += (p.luck - 5) * 0.03
S += (p.reputation/100 - 0.4) * 0.12
mw = (sc.admitByMajor in {major,major-strict} or sc.region in {UK,HK}) ? 0.5 : 0.18
S += (p.majorFit - 0.5) * mw

// 4) logistic 映射
P = 1 / (1 + exp(-(logit + 3.0*S)))

// 5) 国际生助学金惩罚
if (p.isIntl):
    if (sc.aidIntl == "none")      P *= 0.62
    else if (sc.aidIntl == "need-aware") P *= 0.88

// 6) 标化保底惩罚（乘法）
if (p.toefl == 0) P *= 0.75
else if (sc.toeflMin != null && p.toefl < sc.toeflMin) P *= 0.6
if (p.sat == 0) P *= 0.7

// 7) 顶尖校"信号弹"加成（降权、部分叠加，避免掩盖学术短板）
dist = (p.spike||0)*0.4 + (p.summer||0)*0.3
if (dist > 0):
    sel = clamp(-logit/3.0, 0, 1.1)        # 顶尖校 ~1.1，普通校 ~0
    add = dist * sel * 0.5
    P2  = 1/(1+exp(-(logit + 3.0*S + add)))
    P   = P + (P2 - P) * 0.5

// 8) 硬门槛（test-required 美校缺标化 / 有托福线却无托福 → 压到极低）
if (p.sat == 0 && sc.sat25 != null && sc.region=="US" && sc.testReq) P = min(P, 0.012)
if (p.toefl == 0 && sc.toeflMin != null) P = min(P, 0.015)
```

**关键设计点（供分析）**
- **单调性**：`zA/zT/zTOEF` 均随分数升高而升高（无 sat25 的校用回退中点 1420，故 SAT 仍加分；托福过线后继续加分，不再"过线即平"）。
- **国际化惩罚**：国际生用 `acceptRateIntl`（缺失则 `acceptRate×0.6` 保守估计）；need-blind(`none`) ×0.62、need-aware ×0.88。
- **硬门槛仅针对 test-required 美校**：UK/HK 与 test-optional 美校自然豁免，不会被误杀。
- **信号弹降权**：spike/summer 只抬最难校，加成减半且仅取一半幅度，防止活动/奖项掩盖学术短板。

---

## 6. 夏校申请季（高二下 → 高三上）

第 6 学期结束触发 `goSummer()`：从 `SUMMER_PROGRAMS`（8 个，如 RSI/SSP/MITES/SUMaC/CMU SAMS/耶鲁全球青年学者/Garcia/本地科研助理）随机抽 4 个。每个含 `need`（gpa/sat/academic/english/social/rep 门槛）与 `boost`（0.3–0.9）。

`summerQualify`：所有 `need` 满足才 `ok`。最多申 **2 个**，中了的 `boost` 提升录取概率。
保底选项「跳过申请·苦心冲标化」：英语 +1，并额外多考一次 SAT。

---

## 7. 申请季：ED + RD 选校与档位

### 7.1 `buildBands(p)`（概率划分法）
```
all = SCHOOLS.map(sc => ({sc, P: admitProb(p,sc), band:null}))   # 基准概率，不含 ε

reachPool  = all.filter(x => x.P <= 0.10).sort((a,b)=>a.P-b.P)
matchPool  = all.filter(x => 0.10 < x.P && x.P <= 0.30).sort((a,b)=>a.P-b.P)
safetyPool = all.filter(x => x.P > 0.30).sort((a,b)=>b.P-a.P)

rN = min(REACH_MAX=5,  reachPool.length)
mN = min(MATCH_MAX=10, matchPool.length)
sN = min(SAFETY_MAX=10,safetyPool.length)

# 匹配/保底池不满 → 缺额补到冲刺（顶尖校天然更难，归冲刺合理）
deficit = (MATCH_MAX-mN) + (SAFETY_MAX-sN)
rN = min(REACH_MAX + deficit, reachPool.length)

reach  = reachPool.slice(0,rN);   reach.forEach(band="reach")
match  = matchPool.slice(0,mN);   match.forEach(band="match")
safety = safetyPool.slice(0,sN);  safety.forEach(band="safety")

noMatch  = (reachPool.length == all.length)   # 所有校对你都 ≤10%
noSafety = (safety.length == 0)             # 没有 >30% 的保底校
easiestP = safety.length ? safety[0].P
           : (match.length ? match[match.length-1].P : 0)

return {reach, match, safety, noMatch, noSafety, easiestP}
```
- **常态**：5 冲刺 + 10 匹配 + 10 保底 = **25 所**。
- **无匹配（noMatch）**：全部校对你都 ≤10%，只能冲；`takeBand` 允许冲刺上限放宽到 25 所。
- **无保底（noSafety）**：没有 >30% 的校；最容易录取的也仅是匹配档。

### 7.2 ED（早决定，可选 1 所）
`edPick()`：搜一所 `region=="US" && ed` 的校（中/英文名）。ED 概率见公式 §5 步 1。
- ED **录取** → 绑定入学，自动撤回全部 RD（结局页仅显示 ED 结果）。
- ED **未录** → 照常走 RD。

### 7.3 RD 勾选
候选按档分三列展示，勾选写入 `PICK.rdSel`（含 `band`，结果页沿用、不重算以保证一致性）。`minN = min(10, 总候选数)`，`RD_MAX=20`。

---

## 8. 结局页（拆 offer）

- 选校时一次性抽取本季**共同冲击 ε**（好年/坏年），ED/RD 显示与摇号均使用同一 ε，因此拆开前后概率一致。
- **ED**：列表式卡片显示「录取·绑定 / 未录取」+ 概率。
- **RD**：**3D 翻牌**——正面 `#排名·档 / 校名 / 录取率% / 点击拆开→`，点击翻面显示「录取 / 拒绝」。逐张随机摇号（`Math.random() < P`）。
- **「🎴 一键拆 offer」**按钮：一次翻完全部牌 + 展开完整清单表（列表式），按钮变「已拆开 ✓」。
- **评级与最佳录取延迟揭示**：`S/A/B/—` 评级卡片（`#rdSummary`）**默认收起（class=collapsed）**，仅在玩家拆开 offer（点翻牌或一键拆）后才揭开——保留拆信悬念，不在进结局页时直接弹出。
  - 评级规则：取 best = 录取校中按 **档位优先（冲刺 > 匹配 > 保底）**，同档按 `rank` 最小（最难）者；`reach→S / match→A / safety→B / 全拒→—`。
  - 评分 `score = round((1-(rank-1)/(N-1))*1000) + {S:60, A:30, B:10, —:0}`（`N=57`），用于排行榜。
- **排行榜（上传可选）**：拆开 offer 后出现「🏆 上传到排行榜」按钮 → 输入**玩家名（≤10 字，中英文皆可）** → 入榜。同一玩家名多次上传只保留最佳成绩，不会刷屏。
  - 默认 **本地模式**（localStorage，键 `usadmit_lb`），开箱即玩、单机可见。
  - 跨玩家共享榜：把 `LEADERBOARD.mode` 改为 `"supabase"` 并填 `url/anonKey/table`（见 `index.html` 底部建表 SQL + RLS 策略）；CDN 不可用或填错自动回退本地，不会卡死。
- 底部附**全部 57 校按录取率排序**的总表，便于复盘。
- 另展示人格标签、完整成绩单、成就（12 项，如 SAT1500+、GPA3.9+、零压力毕业、声望 10+、六维全 6+ 等）。

---

## 9. 学校数据集 `SCHOOLS`（57 所）

字段：`rank, nameEn, nameZh, acceptRate, acceptRateIntl, sat25, sat75, gpaAvg, toeflMin, aidIntl, ed, edAcceptRate, admitByMajor, region, testReq`。
- **Region**：US（带 rank）、UK、HK。
- **数据覆盖**（截至本文档状态）：
  - `gpaAvg`：全填充。
  - `sat25/sat75/toeflMin`：UK 12 校 + HK 5 校 + UIUC + UW-Madison + UT-Austin 已补全（共 20 校）；7 所 UC 与 7 所顶尖美校仍部分缺失，由模型回退中点（SAT 1420 / 托福 95）处理。
  - `ed:true` 的 8 校若无 `edAcceptRate`，公式退回 `acceptRate×2.4`。
  - `toeflMin` 为空 = 该校不以托福为硬门槛（豁免 §5 步 6 的扣减）。

---

## 10. 当前平衡性标定（蒙特卡洛 `mc_sim.js`）

模拟玩家真实参加 SAT/托福，三档分布（弱/中/强，各约 400–1000 局）：
- **弱玩家**（躺平+低分）：至少 1 所录取概率 ~7.9% → 经第十六/十七轮放宽后约 **63.6%**（英语+GPA+成长叠加偏宽松，可单独下调）。
- **中玩家**：~97–100%，保底预测 ~29–56%、匹配 ~12–22%。
- **强玩家**：100%，保底 ~51–75%、匹配 ~22–36%、冲刺 ~14%。

单调性已专项验证：UK 曼大托福 80→120 从 13.4%→31.9% 严格递增；SAT 1200→1560 从 12.2%→32.2% 严格递增；UC Berkeley（无 sat25）SAT 仍 1.5%→5.1% 递增；曼大过托福线后继续涨（过线不平）。

---

## 11. 想要调整时改哪里（速查）

| 想调 | 位置 |
|---|--- |
| 英语/学术单次加成 | `doVocab/doOral/doRead/doWrite`、`doStudy/doLibrary` 系数 |
| 低年级 GPA 难度 | `const GRADE_EASE` |
| 学期成长幅度 | `closeSemester()` 内 `+0.5` 与随机抽 `3` |
| 档位数量 | `REACH_MAX / MATCH_MAX / SAFETY_MAX / RD_PER_BAND / RD_MAX` |
| 录取公式权重/尺度 | `admitProb` 内 `S=...` 与 `/165`、`/28`、回退中点 `1420` |
| 单校数据 | `const SCHOOLS = [...]` |
| 行动能耗/效果 | `const ACTIONS = [...]` |

> 校验工具：`/tmp/mc_sim.js`（三档分布）、`/tmp/harness4.js`、`/tmp/validate.js`、`/tmp/test_offers.js`、`/tmp/loadtest.js`。本地双击 `index.html` 即可游玩；改完 `git add index.html && git commit && git push origin main` 自动重部署（Vercel Import 的私有仓库）。
