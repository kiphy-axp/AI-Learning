# 课程内容 Schema v2

每个阶段一个 JSON 文件，放在 `content/stages/stage-<N>.json`，UTF-8 无 BOM，禁止尾随逗号。
一个文件必须是一个 JSON 对象，结构如下。

## 顶层

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `stage` | number | ✅ | 阶段序号，整数 |
| `stageSlug` | string | ✅ | 英文短横线 slug，全局唯一 |
| `stageTitle` | string | ✅ | 中文阶段名 |
| `stageEmoji` | string | ✅ | 单个 emoji |
| `stageDesc` | string | ✅ | 20-40 字，说明这个阶段解决什么问题 |
| `category` | string | ✅ | 三选一：`基础` / `进阶` / `算法岗核心` |
| `lessons` | array | ✅ | 课程数组，至少 8 节 |

## lesson

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `slug` | string | ✅ | 英文短横线 slug，阶段内唯一，全小写 |
| `title` | string | ✅ | 中文标题，可带英文术语，如 `复杂度分析 Big-O` |
| `order` | number | ✅ | 从 1 递增，与数组顺序一致 |
| `module` | string | ✅ | 所属模块名（中文），同一阶段内 3-5 个模块 |
| `difficulty` | string | ✅ | 三选一：`基础` / `进阶` / `高阶` |
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
| `quiz` | array | ✅ | 恰好 3 题，顺序固定：choice → short → code |

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

- 全中文讲解，英文术语保留原词并给中文（如 `注意力 Attention`）。
- 面向**求职 AI 算法开发岗**的读者：每节都要回答"这东西在工作里什么时候用得上"。
- 不要空话套话，不要"本章将介绍…"这类目录式句子；直接讲知识本身。
- 涉及数字、维度、复杂度、显存、吞吐时给出具体数值和量级，不要只说"很大/很快"。
- 公式必须能被 KaTeX 渲染；不确定时用文字描述并留 `""`，不要写坏公式。
- 代码示例遵循各领域现代写法：Python 用类型注解可选，CUDA 用 `__global__` 标准写法，bash 给可复制命令。
