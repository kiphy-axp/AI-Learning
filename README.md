# AI 算法实验室 · 本地学习站

> 一个**完全本地运行**的计算机与 AI 学习网站，面向「转行 / 求职 AI 算法开发岗」这个目标设计。
> 无需注册登录、无账号系统、无云端依赖，学习数据全部保存在你自己的电脑上。

![总览](docs/screenshot-home.png)

## 它解决什么问题

网上学 AI 的路径太碎：课程东一节西一节，学完不知道会了什么、缺什么，面试前也没法集中复习。
这个学习站把 **16 个阶段 / 166 个知识点** 串成一条从计算机基础到 LLM 训练推理的完整路线，并且：

- 每节都按「直觉解释 → 严谨定义 → 核心公式 → **与 AI 算法开发的联系** → 示例代码 → 常见错误 → **面试考点** → 延伸资源」组织
- 每节配 3 道题（选择 / 简答 / 编程），答错自动进错题本，正确率低于 70% 的知识点自动进薄弱清单
- 620 条面试考点单独汇总成页，支持**随机抽一题**做模拟面试
- 进度、错题、笔记、学习时长全部写入本地 SQLite，关掉浏览器也在，换机器拷一个文件就走

## 界面

| 课程学习 | 练习测验 |
| --- | --- |
| ![课程](docs/screenshot-lesson.png) | ![练习](docs/screenshot-practice.png) |

| 学习路线 | 面试考点 |
| --- | --- |
| ![路线](docs/screenshot-roadmap.png) | ![面试](docs/screenshot-interview.png) |

## 课程结构

| 类别 | 阶段 | 说明 |
| --- | --- | --- |
| 基础 | 1 计算机基础 · 2 Python · 3 Linux + Git · 4 数学基础 · 5 数据处理 | 打地基，不留死角 |
| 进阶 | 6 机器学习 · 7 深度学习 · 8 Transformer · 9 LLM Engineering · 10 AI Agent | 建立完整模型认知 |
| **算法岗核心** | 11 数据结构与算法 · 12 数学进阶 · 13 机器学习与深度学习进阶 · 14 LLM 训练与推理工程 · 15 GPU 与 CUDA 性能优化 · 16 论文精读与复现 | 面试与工作的正面战场 |

内容规模：

| 指标 | 数量 |
| --- | --- |
| 阶段 | 16 |
| 知识点 | 166 节 |
| 练习题 | 498 道 |
| 面试考点 | 620 条 |
| 代码示例 | 166 段（Python / CUDA / bash，均为可直接运行的完整代码） |
| 外部资源 | 225 条（论文 arXiv 链接、官方文档） |
| 预计学时 | 约 93 小时 |

几个例子，说明内容深度：

- **11 数据结构与算法**：附 78 题 LeetCode 高频题单（题号经官方 API 核对），覆盖复杂度推导、Top-K、编辑距离、Viterbi、滑窗注意力等真实场景
- **12 数学进阶**：SVD 与 Eckart–Young、KL 散度与 RLHF 约束、凸优化与 SVM 对偶、条件数与 fp16 loss scaling，公式全部 KaTeX 渲染
- **14 LLM 训练与推理工程**：显存账本（7B = 14GB bf16 权重 + 56GB Adam 状态 + …）、ZeRO 三阶段通信量、LoRA / QLoRA / DPO / PagedAttention 的真实代码
- **15 GPU 与 CUDA**：A100/H100 带宽与算力、Roofline、内存合并访问、从朴素到寄存器分块的 GEMM、FlashAttention 在线 softmax

## 快速开始

环境要求：**Node.js ≥ 22.5**（使用了内置 `node:sqlite`，无任何原生编译依赖）。

```bash
git clone https://github.com/kiphy-axp/AI-Learning.git
cd AI-Learning

./start.sh          # 一键：装依赖 → 构建 → 启动 → 开浏览器（默认 http://127.0.0.1:4173）
./start.sh 5000     # 指定端口，端口被占用会自动 +1
```

macOS 用户也可以直接**双击 `启动学习站.command`**。

开发模式：

```bash
npm install
npm run dev         # Vite 开发服务器（前端热更新）
npm run api         # 另一个终端启动本地 API
```

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS 3，Vite 8 构建，HashRouter 单页应用
- **后端**：Node 内置 `node:http` + `node:sqlite`，**零运行时依赖**（不用 Express、不用 Prisma、不用 Docker）
- **渲染**：自研轻量 Markdown 渲染器 + KaTeX 公式 + 代码块一键复制
- **AI 导师**：任意 OpenAI 兼容接口（OpenAI / DeepSeek / OpenRouter / 本地 Ollama / OpenCode），未配置时自动降级为基于课程内容的离线讲解

## AI 导师配置（可选）

不配也能用：导师会基于当前小节的内容、公式、示例代码和你的薄弱知识点做**离线讲解**。

想接真实模型，复制模板填上 Key 即可：

```bash
cp .env.example .env
```

```dotenv
TUTOR_PROVIDER=deepseek
TUTOR_BASE_URL=https://api.deepseek.com/v1
TUTOR_MODEL=deepseek-chat
TUTOR_API_KEY=sk-xxxxxxxx
```

重启服务生效。也可以直接在学习站「设置」页填写，Key 会用 AES-256-GCM 加密后存入本地数据库（优先级高于 `.env`）。

> `.env` 与 `data/` 均已被 `.gitignore` 忽略，Key 不会进入 Git 历史。

支持 6 种提问模式：简单解释 / 深入解释 / 举例说明 / 练习模式 / 苏格拉底式引导 / 自由提问。

## 功能一览

| 页面 | 作用 |
| --- | --- |
| 总览 | 总进度、累计时长、连续天数、下一步建议、薄弱知识点 |
| 学习路线 | 16 个阶段按类别分组，显示进度与模块构成 |
| 知识点清单 | 全部知识点表格，可按阶段 / 状态 / 难度 / 收藏筛选，直接改状态 |
| 课程学习 | 结构化讲义 + KaTeX 公式 + 代码复制 + 收藏 + 随手记笔记 |
| 练习测验 | 选择题自动判分；简答题按关键词覆盖评分；编程题按关键片段校验并给参考答案 |
| 实战项目 | 六级项目路线（数据分析 → 经典 ML → CNN → 从零实现 Transformer → LoRA 微调 → 论文复现），任务可勾选 |
| 面试考点 | 汇总 620 条考点，支持搜索与「随机抽一题」模拟面试 |
| 错题本 | 最近一次答错且未订正的题目，按知识点分组，一键重做 |
| 学习笔记 | Markdown + LaTeX 笔记，可关联到具体知识点 |
| AI 导师 | 6 种模式，自动携带当前课程上下文与薄弱项 |
| 设置 | 模型接口配置、数据导出 / 导入 |

## 数据与隐私

- 数据库：`data/learning.db`（SQLite），保存进度、错题、笔记、学习时长、设置
- 加密密钥：`data/.secret`（权限 0600），用于加密本地保存的 API Key
- **本站不采集任何数据、不发起任何外部请求**，唯一的外部请求是你主动配置的模型接口
- 备份：直接复制 `data/learning.db`，或在「设置」页导出 JSON
- 恢复出厂：删除 `data/` 目录

## 目录结构

```text
content/
  SCHEMA.md             课程内容 schema 说明
  stages/*.json         16 个阶段的课程内容
server/
  index.mjs             HTTP 服务：静态站点 + 本地 API
  db.mjs                SQLite 数据层（进度 / 错题 / 笔记 / 设置）
  tutor.mjs             AI 导师：OpenAI 兼容接口 + 离线回退
  env.mjs               零依赖 .env 加载器
web/
  src/pages/            13 个页面
  src/components/       侧边栏、Markdown + KaTeX 渲染、导师面板、UI 组件
  src/lib/              内容索引、API 客户端、全局状态
scripts/
  validate-content.mjs  课程内容校验
  migrate-legacy-content.mjs  从旧版内容源迁移（一次性）
tests/                  内容规模与结构测试
data/                   本地数据库（Git 忽略）
dist/                   构建产物（Git 忽略）
```

## 常用命令

```bash
npm run validate    # 校验全部课程内容是否符合 schema（结构、字段、题型）
npm test            # 内容规模与结构测试
npm run typecheck   # TypeScript 类型检查
npm run build       # 构建前端到 dist/
npm start           # 启动本地服务（需先 build）
```

## 贡献内容

课程内容都是纯 JSON，按 [`content/SCHEMA.md`](content/SCHEMA.md) 编写，放在 `content/stages/stage-<N>.json`。
加完跑 `npm run validate` 确认通过即可。

## License

个人学习与教学用途。
