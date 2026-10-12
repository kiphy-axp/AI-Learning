# 课程内容 Schema v2

每个阶段一个 JSON 文件，放在 `content/stages/stage-<N>.json`，UTF-8 无 BOM，禁止尾随逗号。
一个文件必须是一个 JSON 对象，结构如下。

## 顶层

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `stage` | number | ✅ | 阶段序号，整数，1-22 |
| `stageSlug` | string | ✅ | 英文短横线 slug，全局唯一 |
| `stageTitle` | string | ✅ | 中文阶段名 |
| `stageEmoji` | string | ✅ | 单个 emoji |
| `stageDesc` | string | ✅ | 20-40 字，说明这个阶段解决什么问题 |
| `act` | number | ✅ | 所属幕，1-7 |
| `actName` | string | ✅ | 幕名，如 `第一幕 · 起步` |
| `category` | string | ✅ | 三选一：`基础` / `进阶` / `算法岗核心` |
| `lessons` | array | ✅ | 课程数组，至少 5 节 |

七幕结构（面向零基础学习者的推进顺序）：

| 幕 | 名称 | 阶段 |
| --- | --- | --- |
| 1 | 第一幕 · 起步 | 1 计算机是什么 · 2 程序与计算思维 · 3 学习工具与方法 |
| 2 | 第二幕 · 编程入门 | 4 Python 起步 · 5 Python · 6 Linux + Git |
| 3 | 第三幕 · 计算机科学基础 | 7 计算机基础 · 8 算法思维入门 · 9 数据结构与算法 |
| 4 | 第四幕 · 数学 | 10 数学衔接 · 11 数学基础 · 12 数学进阶 |
| 5 | 第五幕 · 数据与经典机器学习 | 13 数据处理 · 14 机器学习 |
| 6 | 第六幕 · 深度学习与大模型 | 15 深度学习 · 16 ML/DL 进阶 · 17 Transformer · 18 LLM Engineering · 19 AI Agent |
| 7 | 第七幕 · 算法岗进阶 | 20 LLM 训练与推理工程 · 21 GPU 与 CUDA · 22 论文精读与复现 |

## lesson

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `slug` | string | ✅ | 英文短横线 slug，阶段内唯一，全小写 |
| `title` | string | ✅ | 中文标题，可带英文术语，如 `复杂度分析 Big-O` |
| `order` | number | ✅ | 从 1 递增，与数组顺序一致 |
| `module` | string | ✅ | 所属模块名（中文），同一阶段内 3-5 个模块 |
| `difficulty` | string | ✅ | 三选一：`基础` / `进阶` / `高阶` |
| `track` | string | ✅ | 二选一：`main`（主线必学）/ `side`（支线按需）。主线 = 打地基到能独立训练模型；支线 = 面向算法岗的专项深化。**主线阶段里 difficulty 为「高阶」的课标 side** |
| `estimatedMinutes` | number | ✅ | 建议学习分钟数，20-60 |
| `summary` | string | ✅ | 1-2 句话概括本节 |
| `intuition` | string | ✅ | 150-300 字。生活化直觉，先讲"为什么需要它" |
| `formal` | string | ✅ | 150-350 字。严谨定义 / 推导 / 边界条件 / 复杂度 |
| `formula` | string | ✅ | 核心公式的 LaTeX（不含 `$`），没有公式则写 `""` |
| `aiConnection` | string | ✅ | 120-250 字。明确说明与 AI 算法开发工作的联系 |
| `codeExample` | object | ✅ | 见下 |
| `mistakes` | string[] | ✅ | 3-4 条常见错误，每条 15-40 字，写"错在哪 + 正确做法" |
| `interviewPoints` | string[] | ✅ | 2-4 条面试/笔试考点。`算法岗核心` 阶段必须写满 3 条以上 |
| `resources` | object[] | ✅ | 1-3 条延伸资源 `{"title": "...", "url": "https://..."}`，优先官方文档 / 论文 / 权威教程 |
| `quiz` | array | ✅ | **2-3 题**，顺序固定：choice → short（→ code）。编程题（code）只在**这一节真的教代码**时才加：概念课、工具课、计算机组成课不要硬凑编程题 |

### codeExample

```json
{ "lang": "python", "filename": "example.py", "code": "可直接运行的代码" }
```

- `lang`：`python` / `cpp` / `cuda` / `bash` / `text` 之一
- `code`：10-40 行，必须可运行或可直接粘贴到 CUDA/终端，**不要**省略号，**不要**伪代码占位
- 代码里用 `\n` 转义换行，不要出现未转义的双引号

### quiz 三种题型

choice：

```json
{
  "id": "<lesson-slug>-q1",
  "type": "choice",
  "prompt": "题干",
  "options": ["A", "B", "C", "D"],
  "answerIndex": 1,
  "explanation": "为什么选它，以及其他选项错在哪"
}
```

short：

```json
{
  "id": "<lesson-slug>-q2",
  "type": "short",
  "prompt": "简答题干",
  "answer": "参考回答，以「参考回答：」开头，80-150 字",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "explanation": "一句话点评得分要点"
}
```

code：

```json
{
  "id": "<lesson-slug>-q3",
  "type": "code",
  "prompt": "编程题干，说明输入输出与约束",
  "starterCode": "带函数签名与 pass 的起始代码",
  "solution": "完整可运行参考答案",
  "checks": ["必须出现在答案里的关键片段1", "片段2"]
}
```

## 内容风格

- **读者设定：一个从未接触过计算机的高中生。** 默认对方不知道"内存""进程""编译"是什么，
  任何术语第一次出现都要用一句大白话解释；不要假设对方学过编程或大学数学。
- 全中文讲解，英文术语保留原词并给中文（如 `注意力 Attention`）。
- 面向**求职 AI 算法开发岗**的读者：每节都要回答"这东西在工作里什么时候用得上"。
- 不要空话套话，不要"本章将介绍…"这类目录式句子；直接讲知识本身。
- 涉及数字、维度、复杂度、显存、吞吐时给出具体数值和量级，不要只说"很大/很快"。
- 公式必须能被 KaTeX 渲染；不确定时用文字描述并留 `""`，不要写坏公式。
- 代码示例遵循各领域现代写法：Python 用类型注解可选，CUDA 用 `__global__` 标准写法，bash 给可复制命令。
- 起步类阶段（计算机是什么、程序与计算思维、学习工具与方法、数学衔接）允许用生活化类比、
  手算例子、伪代码替代真实代码，但 `codeExample.code` 仍必须是能直接跑或能直接照做的内容。
