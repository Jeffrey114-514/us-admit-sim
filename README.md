# 申请人生 · College Life Sim

> 一个**单文件 HTML** 的美国大学申请模拟器。从初三养到高三上，攒 GPA、刷标化、堆活动、扛压力，最后 ED / RD 选校，一封封拆 offer——看看四年下来你能去哪儿。

**🎮 在线试玩：[us-admit-sim.vercel.app](https://us-admit-sim.vercel.app)**

![license](https://img.shields.io/badge/license-MIT-green)
![no build](https://img.shields.io/badge/build-none-blue)
![single file](https://img.shields.io/badge/files-1-orange)

---

## ✨ 特性

- **零依赖、零构建（对玩家 / 部署者）**：分发形态依然是一个 `index.html`，双击就能玩，丢到任何静态托管上就能跑，不需要任何构建命令。（只有想改代码的开发者才需要跑一次 `node build.js`，见下方「开发」）
- **真实录取数据**：内置 **57 所**学校（40 所美国 + 12 所英国 + 5 所中国香港），含国际生录取率、SAT / ACT 区间、GPA 均值、助学金政策等（数据源：各校 Common Data Set，Fall 2025 / Class of 2029）。
- **有血有肉的养成**：六维属性、10 种天性特质、7 个专业方向、3 档课程难度，外加一套**压力系统**——压力越高，每次行动的收益越小（不再直接扣 GPA，靠收益递减来体现）。
- **讲道理的录取模型**：`admitProb()` 用 logit 综合学术 / 标化 / 语言 / 课外 / 推荐信，国际生走国际生录取率，还会叠加**"本季共同冲击"**——好年全校好录，坏年一起翻车。
- **所见即所得的选校**：候选校按你的真实录取率自动分档——`≤10%` 冲刺、`10~30%` 匹配、`>30%` 保底，不会再出现"哈佛是我的保底"这种离谱事。
- **拆 offer 的仪式感**：逐封翻牌，最后给一个 S / A / B 评级和"最佳录取"。
- **排行榜**：内置本地榜；官方站点直连云端，是**实时多人榜**。

---

## 🎮 怎么玩

1. **开局**：分配 24 点六维属性（学术 / 英语 / 精力 / 创造力 / 社交 / 运气），随机抽 2 个天性特质，选专业和课程难度。
2. **过学期**：共 **7 个学期**（初三上 → 高三上）。每学期先抽一张**随机事件**，再用**行动点**执行行动（啃硬课、泡实验室、搞科研、打磨文书、发展特长……）。
3. **看成绩单**：期末生成 GPA。注意**压力越高，每次行动的收益越小**——别把自己卷崩了。
4. **申请季**：选 1 所 **ED**（早决定，绑定录取）+ 勾选最多 **20 所 RD**。
5. **拆 offer**：一封封翻，看你是冲进梦校、稳稳落地，还是全聚德。

想深入机制？看 **[docs/GAME_SPEC.md](docs/GAME_SPEC.md)**——所有公式、数值表、判定规则都在里面。

---

## 🚀 本地运行

**方式一：直接打开**

```bash
git clone https://github.com/Jeffrey114-514/us-admit-sim.git
cd us-admit-sim
open index.html          # macOS；Windows 用 start，Linux 用 xdg-open
```

**方式二：起个本地服务**（推荐，避免个别浏览器的本地文件限制）

```bash
python3 -m http.server 8000
# 然后打开 http://localhost:8000
```

**部署到你自己的站点**：因为是纯静态文件，Vercel / Netlify / GitHub Pages 任意选，把仓库根目录导进去就行，不需要任何构建命令。

---

## 🏆 排行榜

游戏有两套榜单模式，由 `index.html` 顶部的 `LEADERBOARD` 配置控制：

| 模式 | 说明 |
|---|---|
| `local`（**默认**） | 成绩存在浏览器 `localStorage`，纯本机可见。开箱即用，不需要任何配置。 |
| `supabase` | 直连 Supabase，跨玩家的**实时共享榜**。同名玩家只保留最佳成绩，上传后入口消失，防刷榜。 |

**为什么默认是本地榜？** 官方站点的云端凭据就写在仓库里，如果所有 fork 都默认连云端，大家的测试数据会互相污染正式榜单。所以代码里做了判断：

```js
// 只在官方域名启用共享云榜；本地开发 / fork / 其它域名一律本地榜
const LB_CLOUD_HOSTS = [/^us-admit-sim(-.+)?\.vercel\.app$/];
const LEADERBOARD = {
  mode: LB_CLOUD_HOSTS.some(re => re.test(location.hostname)) ? "supabase" : "local",
  ...
};
```

**想让你自己的部署也用上共享榜？** 两种方式：

1. 把你的域名加进 `LB_CLOUD_HOSTS` 正则里；
2. 或者干脆建个自己的 Supabase 项目（免费），把 `mode` 改成 `"supabase"` 并填上你的 `url` 和 `anonKey`。建表 SQL 与 **RLS 加固语句**见 [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)。

> ⚠️ 仓库里的 `anonKey` 是 Supabase 的**公开匿名密钥**，设计上就是可以暴露在前端的，安全性由 RLS 策略保证（匿名用户只能读、以及写入受约束的成绩，**没有删除权限**）。上线前务必按 `docs/SUPABASE_SETUP.md` 的「RLS 加固 SQL」执行，否则任何人都能清空榜单。它属于本项目维护者的线上数据库，请不要拿去做本项目以外的事。

---

## 🤝 一起来

这是个个人项目，非常欢迎你一起把它做得更好——尤其是这几块我最需要帮手：

- 🎛 **数值平衡**：压力曲线、行动收益、录取难度，是不是太难或太水？跑模拟给数据最有说服力。
- 🏫 **学校数据**：补学校、更新某校最新的国际生录取率 / SAT 区间 / 助学金政策（请附上数据来源）。
- 🎨 **UI / 交互**：结果页、选校页的呈现还能更好看更好用。
- 🐛 **找 bug**：任何显示不一致、概率对不上、边界情况下的崩溃。
- 🌐 **多语言**：目前是简体中文。

动手前请看 **[CONTRIBUTING.md](CONTRIBUTING.md)**，里面写了代码结构、改数值的注意事项，以及怎么提 issue / PR。

提问题或建议：[Issues](../../issues) · 想聊设计：[Discussions](../../discussions)

---

## 📁 目录结构

```
us-admit-sim/
├── index.html              # 【构建产物】单文件游戏本体，双击即玩 / 部署就用它（勿直接编辑）
├── build.js                # 把 src/ 打包成上面的 index.html：node build.js
├── src/                    # 源码 —— 所有修改请改这里
│   ├── shell.html          #   HTML 骨架，CSS / JS 由构建注入
│   ├── styles.css          #   全部样式
│   ├── data/               #   纯数据（JSON，调数值最方便）
│   │   ├── schools.json    #     57 所学校
│   │   ├── traits.json     #     10 种天性特质
│   │   ├── majors.json     #     7 个专业方向
│   │   └── summer.json     #     8 个夏校项目
│   └── js/                 #   逻辑，按加载顺序编号（详见 CONTRIBUTING.md）
│       ├── 00-schools.js   #     学校池（数据注入自 schools.json）
│       ├── 01-utils.js     #     工具 / 图标
│       ├── 02-config.js    #     数值常量 / 模板 / 成绩换算
│       ├── 03-traits.js …  #     特质 / 成就 / 状态 / 开局界面
│       ├── 08-events.js    #     随机事件表（300 行）
│       ├── 10-actions.js   #     行动池与效果
│       ├── 13-pick.js      #     选校分档 / ED / RD
│       ├── 15-admit.js     #     buildProfile + admitProb（录取模型核心）
│       ├── 16-leaderboard.js #   排行榜（本地 / Supabase 双路）
│       └── 18-main.js      #     按钮接线与启动（必须最后）
├── README.md               # 你正在看的这个
├── CONTRIBUTING.md         # 贡献指南（含模块说明与踩坑提醒）
├── LICENSE                 # MIT
├── docs/
│   ├── GAME_SPEC.md        # 完整数值与机制规范（改数值前必读）
│   ├── sim_report.html     # 多轮模拟报告（平衡性分析）
│   └── admissions_doc.html # 录取模型逐校参数与权重核对表
└── .github/                # issue / PR 模板
```

---

## 🛠 开发

根目录的 `index.html` 是**构建产物**。改代码请按下面两步：

```bash
# 1. 改 src/ 下的源码（数据改 JSON，逻辑改 js/，样式改 styles.css）
# 2. 重新打包
node build.js
```

- `build.js` 会把 `src/data/*.json` 内联进 JS、再把所有模块 + CSS 内联进 `shell.html`，输出根目录的单文件 `index.html`。
- 构建产物仍是**单个 `<script>` 块**——和拆分前结构一致，测试脚本与部署方式都不受影响。
- 无第三方依赖，只需 Node（任意现代版本）。

**想快速找到"我要改的东西在哪个文件？"** 见 `CONTRIBUTING.md` 的「常见修改速查表」与「数据文件字段说明」。

**想验证改动没破坏平衡性？** 见 `CONTRIBUTING.md` 末尾的「回归检查清单」。

---

## ⚖️ 许可证

[MIT](LICENSE) © 2026 Yanning Liu

**免责声明**：本项目是**游戏**，不是升学顾问。录取率、标化区间等数据来自公开资料，只能代表历史统计；模型做了大量简化，任何"你有多大概率被录取"的输出都**不构成**对真实申请结果的预测或建议。拿它图个乐、体会一下申请季的酸甜苦辣就好，真实申请请务必咨询专业人士。
