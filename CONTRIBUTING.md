# 贡献指南

谢谢你愿意一起做这个项目 🙌

源码在 `src/`（拆成了 CSS + JSON 数据 + 20 个 JS 模块），根目录 `index.html` 是由 `node build.js` 生成的**单文件构建产物**——所以玩家和部署者依然"零构建"，但**改代码的你需要多跑一条命令**（只需 Node，无第三方依赖）。

下面这些地方容易踩坑，动手前请先看一遍。

---

## 快速开始

```bash
git clone https://github.com/<你的用户名>/us-admit-sim.git
cd us-admit-sim
node build.js                   # 生成根目录 index.html
python3 -m http.server 8000     # 推荐用本地服务，避免个别浏览器的 file:// 限制
# 打开 http://localhost:8000
```

**改代码流程**：改 `src/` 下的源码 → `node build.js` → 刷新浏览器。
（直接双击根目录 `index.html` 也能玩，不需要起服务。）

---

## 代码结构导览

源码在 `src/`，**JS 模块按文件名前缀数字顺序加载**（`build.js` 里的 `ORDER` 数组就是加载顺序，新增模块记得加进去）：

| 模块 | 内容 |
|---|---|
| `src/styles.css` | 全部 CSS，用 CSS 变量控制主题色 |
| `src/shell.html` | HTML 骨架，`<!--CSS-->` / `<!--APP-->` 两个占位符由构建替换 |
| `src/data/*.json` | **纯数据**：`schools`(57 校) / `traits`(10 特质) / `majors`(7 专业) / `summer`(8 夏校) |
| `js/00-schools.js` | 学校池（构建时从 `schools.json` 注入） |
| `js/01-utils.js` | 工具函数 `clamp` / `ri` / `gauss` / `pick` + SVG 图标 |
| `js/02-config.js` | 常量：`START_POINTS`、`ADMIT_SCALE`、`TEMPLATES`、`RIGOR`、成绩换算 |
| `js/03-traits.js` | 天性特质（注入自 `traits.json`）+ `sumFx` / `mulFx` |
| `js/04-achievements.js` | 12 项成就定义（含判定函数） |
| `js/05-state.js` | 全局状态 `G`、精力上限、累计 GPA |
| `js/06-setup.js` | 开局界面：六维配点 / 特质 / 课程难度 / 专业 |
| `js/07-stages.js` | 7 个学期的 `STAGES` 表 |
| `js/08-events.js` | **随机事件表 `EVENTS`（300 行）** + 抽事件逻辑 |
| `js/09-majors.js` | 专业方向（注入自 `majors.json`）+ 契合度累加 |
| `js/10-actions.js` | 行动池 `ACTIONS` + 各 `doXxx()` 效果 + 压力 |
| `js/11-semester.js` | 每学期成绩单生成与结算 |
| `js/12-flow.js` | 回合流程：事件 → 行动 → 状态渲染 |
| `js/13-pick.js` | 选校分档 `buildBands()` / ED / RD 交互 |
| `js/14-summer.js` | 夏校申请季（数据注入自 `summer.json`） |
| `js/15-admit.js` | **`buildProfile()` + `admitProb()`**——录取模型核心 |
| `js/16-leaderboard.js` | 排行榜：本地 / Supabase 双路 + 常驻浮窗弹层 |
| `js/17-help.js` | 玩法说明文本 `HELP` |
| `js/18-main.js` | 按钮接线与启动（**必须最后**） |
| `js/19-footer.js` | 附录：Supabase 建表 SQL 注释 |

> 想改学校数据，直接编辑 `src/data/schools.json` 就行，不用碰任何 JS。

想理解**为什么某个数值是现在这个值**，看 **[docs/GAME_SPEC.md](docs/GAME_SPEC.md)**，那里记录了完整的公式和历史调参原因。

---

## 常见改动怎么改

### 加一所学校 / 更新录取数据

编辑 **`src/data/schools.json`**（构建时会自动注入，不用改任何 JS）。字段含义见 `docs/admissions_doc.html`（逐校参数核对表）。

**请务必附上数据来源和年份**（比如该校 Common Data Set 的 `dataYear` 字段），不要凭印象填。国际生录取率填 `acceptRateIntl`——游戏对国际生玩家读的就是这个字段。

### 调数值平衡（难度、收益、压力）

1. 先读 `docs/GAME_SPEC.md` 对应章节，确认你要改的量会影响什么；
2. 改完**跑模拟验证**——这类改动最容易"感觉良好但实际崩了"。`docs/sim_report.html` 是之前跑多轮模拟的报告，可以参考它的口径；
3. 改完**同步更新 `docs/GAME_SPEC.md`**，否则文档会立刻失真。

### 加成就 / 事件 / 行动

- **成就**：加进 `ACHIEVEMENTS`，`test` 是判定函数。**注意别把阈值设成不可能达到的值**——之前"文书与推荐信双 9+"的达成率是 0%（文书上限根本到不了 9），玩家永远看到灰色。设阈值前先跑模拟看看分布。
- **事件**：加进 `EVENTS`，`stage` 字段必须写对年级（比如"申请系统崩了"只该出现在高三 `[6,7]`）。
- **行动**：新增 `doXxx()` 并在行动表里注册，注意同时给出六维、声望、精力的变化，别只加收益不加代价。

### 改 UI

直接改 `src/styles.css` 和对应的渲染函数。项目用 CSS 变量做主题，改配色优先动变量而不是硬编码颜色。

---

## ⚠️ 这几个坑前人踩过，请别再踩

1. **分档必须用概率划分法**：`buildBands()` 按该玩家的录取概率 `P` 硬分三档——`P≤0.10` 冲刺、`0.10<P≤0.30` 匹配、`P>0.30` 保底。**不要改回"按难度排序后按数量切片"**，那样弱档玩家的保底栏会一直是空的，而且排序方向极易写反。
2. **权威档位存在候选对象的 `.band` 字段**：`toggleRD` / `goEnd` / 渲染都读 `.band`，不要用概率阈值反推档位。
3. **赛季共同冲击 ε 只在 `goPick` 里抽一次**，存进 `G.seasonEps`，之后 ED 卡片、RD 候选卡、拆 offer 摇号全部复用它。如果在 `goEnd` 里再抽一次，玩家会看到"拆 offer 前的概率和拆完的不一样"，像是 bug。
4. **排行榜上传后入口要消失**：这是防刷榜设计（本机标记 `usadmit_lb_uploaded`）。改动上传流程时别把这个行为弄丢了。
5. **默认本地榜**：`LEADERBOARD.mode` 靠 `LB_CLOUD_HOSTS` 正则判断是否官方域名。请不要无条件改成 `"supabase"`，否则所有 fork 的测试数据都会灌进正式榜单。

---

## 改完怎么验证

没有自动化测试，所以请手动过一遍这些**最容易回归**的点：

- [ ] **先跑 `node build.js`**，再刷新页面（否则你看的还是旧的构建产物）
- [ ] 页面能正常打开，控制台**没有报错**
- [ ] 开局默认人设正确（六维各 4 点、随机 2 特质、专业"未定"、课程"混搭"）
- [ ] 完整走一轮：7 个学期都能正常结算，夏校、申请季不卡住
- [ ] 选校页三档都有学校，且**保底栏不会混入哈佛/ MIT 这类顶级校**
- [ ] 某所学校的概率在"选校页 / ED 卡片 / 拆 offer 结果页"**三处一致**
- [ ] 拆完 offer 后能看到评级，且"最佳录取"优先取冲刺档
- [ ] 上传排行榜后，按钮和输入框消失，刷新后也不再出现

---

## 提交与 PR

- **commit message**：用 `类型: 简述` 的格式，比如 `fix: 修复拆 offer 概率不一致`、`feat: 新增 3 所英国学校`、`docs: 更新数值文档`。类型用 `feat` / `fix` / `docs` / `refactor` / `chore`。
- **改完 `src/` 记得 `node build.js`，并把重新生成的 `index.html` 一起提交**——它是部署真正用到的文件，漏掉的话线上不会生效。
- **一个 PR 只做一件事**，别把调数值和改 UI 混在一起，否则 review 和回滚都很痛苦。
- **PR 描述里请说明**：改了什么、为什么改、怎么验证的（尤其是数值改动，请附上模拟数据）。
- 涉及数值的改动，记得同步 `docs/GAME_SPEC.md`。

---

## 提 Issue

- **Bug**：说清楚复现步骤、你当时的选择（专业/课程/特质）、截图或控制台报错。
- **数值反馈**：附上你的模拟数据或几局实测结果，比"感觉太难了"有用得多。
- **新功能**：先开 issue 聊聊思路再动手，避免白做。

感谢你的时间和耐心 ☕
