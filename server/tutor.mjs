/**
 * AI Tutor：优先调用本地配置的 OpenAI 兼容接口；
 * 未配置 Key 或调用失败时，回退到基于课程内容的离线讲解。
 *
 * 配置来源优先级：
 *   1. 数据库（在「设置」页填写，AES-256-GCM 加密存储）
 *   2. 项目根目录 .env（TUTOR_* 或 OPENAI_*，已被 .gitignore 忽略）
 */
import './env.mjs';
import { randomUUID } from 'node:crypto';
import { decryptSecret, getSetting, setSetting } from './db.mjs';

export const TUTOR_MODES = {
  simple: { label: '简单解释', hint: '用最直白的话讲清楚，不超过 200 字，先给一个类比。' },
  deep: { label: '深入解释', hint: '给出严谨定义、推导思路、边界条件与常见误区，可以分点展开。' },
  example: { label: '举例说明', hint: '给 2-3 个具体例子，其中一个必须是 AI 算法开发工作中的真实场景。' },
  practice: { label: '练习模式', hint: '先出一道有针对性的练习题，再给出解题思路与答案，最后追问一个变体。' },
  socratic: { label: '苏格拉底式', hint: '不要直接给答案，用一连串由浅入深的问题引导用户自己推导出来。' },
  free: { label: '自由提问', hint: '直接回答用户问题，必要时补充相关背景。' },
};

const SYSTEM_PROMPT = `你是「AI 算法实验室」的本地学习导师，服务一位正在从计算机基础转向 AI 算法开发岗的学习者。

要求：
1. 全程中文，英文术语保留原词并附中文（如 注意力 Attention）。
2. 回答紧扣当前课程内容，先讲清楚"为什么"，再讲"是什么"和"怎么用"。
3. 涉及数字、维度、复杂度、显存、吞吐时给出具体数值和量级，不要只说"很大/很快"。
4. 面向求职：能指出这个知识点在 AI 算法岗面试和工作中怎么被考察、怎么被使用。
5. 不要空话套话，不要复述题目。必要时用短代码或公式说明，公式用 LaTeX（行内 $...$，独立 $$...$$）。
6. 不确定的内容要明说"这点我不确定"，不要编造论文、API 或数字。`;

function buildContextBlock(context) {
  if (!context) return '';
  const lines = [];
  if (context.stageTitle) lines.push(`当前阶段：${context.stageTitle}`);
  if (context.title) lines.push(`当前知识点：${context.title}`);
  if (context.summary) lines.push(`一句话概括：${context.summary}`);
  if (context.intuition) lines.push(`直觉解释：${context.intuition}`);
  if (context.formal) lines.push(`严谨定义：${context.formal}`);
  if (context.formula) lines.push(`核心公式（LaTeX）：${context.formula}`);
  if (context.code) lines.push(`示例代码：\n\`\`\`\n${String(context.code).slice(0, 1500)}\n\`\`\``);
  if (Array.isArray(context.mistakes) && context.mistakes.length) {
    lines.push(`常见错误：${context.mistakes.join('；')}`);
  }
  if (Array.isArray(context.weakTopics) && context.weakTopics.length) {
    lines.push(`该学习者近期薄弱知识点：${context.weakTopics.join('、')}`);
  }
  if (!lines.length) return '';
  return `\n\n【当前学习上下文】\n${lines.join('\n')}`;
}

/** .env 回退配置（TUTOR_* 优先，兼容 OPENAI_* 命名） */
function envConfig() {
  const first = (...names) => {
    for (const name of names) {
      const value = process.env[name];
      if (value && value.trim()) return value.trim();
    }
    return '';
  };
  return {
    provider: first('TUTOR_PROVIDER'),
    baseUrl: first('TUTOR_BASE_URL', 'OPENAI_BASE_URL'),
    model: first('TUTOR_MODEL', 'OPENAI_MODEL'),
    apiKey: first('TUTOR_API_KEY', 'OPENAI_API_KEY'),
  };
}

export function tutorConfig() {
  const env = envConfig();
  const keyEnc = getSetting('tutor_api_key_enc', '');
  const dbKey = keyEnc ? decryptSecret(keyEnc) : '';
  const baseUrl = getSetting('tutor_base_url', '') || env.baseUrl;
  const model = getSetting('tutor_model', '') || env.model;
  const provider = getSetting('tutor_provider', '') || env.provider;
  const apiKey = dbKey || env.apiKey;
  return {
    provider,
    baseUrl,
    model,
    hasKey: Boolean(apiKey),
    apiKey,
    source: dbKey ? 'database' : env.apiKey ? 'env' : 'none',
  };
}

export function publicTutorConfig() {
  const { provider, baseUrl, model, hasKey, source } = tutorConfig();
  return { provider, baseUrl, model, hasKey, source };
}

/** 离线回退：基于课程内容拼装结构化讲解 */
export function offlineAnswer({ message, mode, context }) {
  const m = TUTOR_MODES[mode] ?? TUTOR_MODES.free;
  const title = context?.title ?? '这个知识点';
  const parts = [];

  if (mode === 'practice' && context) {
    parts.push(`**练习模式**：先别看答案，试着用自己的话回答下面两个问题：\n\n1. ${title} 解决了什么问题？如果没有它会怎样？\n2. ${context.summary ?? '它的核心机制是什么？'}`);
    if (context.formal) parts.push(`**参考思路**：${context.formal}`);
    if (context.code) parts.push(`**动手写一遍**：\n\`\`\`\n${context.code}\n\`\`\``);
  } else if (mode === 'socratic' && context) {
    parts.push(
      [
        `**苏格拉底式引导**：我们来一步步推。`,
        `1. 你现在的理解是：${context.summary ?? title}。那么它在什么场景下**必须**被用到？`,
        `2. ${context.intuition ?? ''}`.trim(),
        `3. 如果把它去掉，模型或程序会出现什么具体问题？`,
        `4. 现在回头看公式：${context.formula || '（本节无公式）'} —— 每个符号对应刚才哪一步？`,
      ].join('\n\n'),
    );
  } else {
    if (mode === 'simple') {
      parts.push(`**一句话**：${context?.summary ?? `${title} 是本节的核心机制。`}`);
      if (context?.intuition) parts.push(context.intuition);
    } else if (mode === 'example') {
      parts.push(`**先从直觉开始**：${context?.intuition ?? '（本节未提供直觉解释）'}`);
      if (context?.aiConnection) parts.push(`**工作中的真实场景**：${context.aiConnection}`);
    } else {
      if (context?.summary) parts.push(`**核心**：${context.summary}`);
      if (context?.formal) parts.push(`**严谨定义**：${context.formal}`);
      if (context?.intuition && mode === 'deep') parts.push(`**直觉**：${context.intuition}`);
    }
    if (context?.formula) parts.push(`**核心公式**：\n\n$$${context.formula}$$`);
    if (context?.aiConnection) parts.push(`**与 AI 算法开发的联系**：${context.aiConnection}`);
    if (context?.code) parts.push(`**示例代码**：\n\`\`\`\n${context.code}\n\`\`\``);
    if (context?.mistakes?.length) {
      parts.push(`**常见错误**：\n${context.mistakes.map((x) => `- ${x}`).join('\n')}`);
    }
  }

  if (message && mode === 'free') {
    parts.push(
      `**关于你的问题「${message}」**：当前处于离线模式，我只能基于本节已有内容作答。` +
        `如果你在「设置」里填入 OpenAI 兼容接口的 API Key（如 DeepSeek、OpenRouter、本地 Ollama），我就能结合完整上下文深入回答。`,
    );
  }

  parts.push(
    `\n> 当前为**离线讲解模式**（未配置模型接口）。在「设置」页填入 API Key 后可获得更灵活的回答。${m.label ? ` 当前模式：${m.label}` : ''}`,
  );
  return parts.filter(Boolean).join('\n\n');
}

/** 会话 ID：持久化在本地数据库，便于网关侧复用上下文与缓存 */
function sessionId() {
  const fromEnv = (process.env.TUTOR_SESSION_ID ?? '').trim();
  if (fromEnv) return fromEnv;
  const existing = getSetting('tutor_session_id', '');
  if (existing) return existing;
  const created = `ai-algo-lab-${randomUUID()}`;
  setSetting('tutor_session_id', created);
  return created;
}

/**
 * 部分网关要求额外的会话头（例如 opencode.ai 需要 x-opencode-session，
 * 缺失会返回 400 MissingSessionID）。可用 TUTOR_SESSION_HEADER 覆盖。
 */
function sessionHeaderFor(baseUrl) {
  const explicit = (process.env.TUTOR_SESSION_HEADER ?? '').trim();
  if (explicit) return explicit;
  return baseUrl.includes('opencode.ai') ? 'x-opencode-session' : '';
}

/** 调用 OpenAI 兼容的 /chat/completions */
export async function remoteAnswer({ message, mode, context, history }) {
  const cfg = tutorConfig();
  if (!cfg.hasKey || !cfg.baseUrl || !cfg.model) {
    return { ok: false, reason: 'not-configured' };
  }
  const m = TUTOR_MODES[mode] ?? TUTOR_MODES.free;
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;

  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n本轮回答方式：${m.hint}` },
    ...(Array.isArray(history) ? history.slice(-8) : []).map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.content ?? '').slice(0, 4000),
    })),
    { role: 'user', content: `${message || '请讲解当前知识点'}${buildContextBlock(context)}` },
  ];

  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${cfg.apiKey}`,
  };
  const sessionHeader = sessionHeaderFor(base);
  if (sessionHeader) headers[sessionHeader] = sessionId();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.6 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, reason: `http-${res.status}`, detail: text.slice(0, 400) };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { ok: false, reason: 'empty-response' };
    return { ok: true, content, model: cfg.model };
  } catch (err) {
    return { ok: false, reason: err.name === 'AbortError' ? 'timeout' : 'network-error', detail: String(err.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}


/* ------------------------------------------------------------ AI 批改简答题 */

const GRADE_PROMPT = `你是判卷老师，负责批改一道简答题。

判定标准（很重要）：**只要意思对就算过**。
- 不要求用词与参考答案一致，不要求逐字命中要点词
- 同义表述、换一种说法、举例说明、用大白话讲清楚，都算答对
- 只有明确答错、答非所问、或明显没理解概念时才算不过
- 回答比参考答案更简略但抓住了核心，也算过

只输出一行 JSON，不要任何解释、不要代码块：
{"correct": true 或 false, "score": 0 到 100 的整数, "feedback": "一句话点评，先说答对了什么，再补一句漏了什么"}`;

/** 让模型按「意思对了就算过」批改简答题；未配置模型时返回 not-configured */
export async function gradeAnswer({ prompt, reference, keywords, answer }) {
  const cfg = tutorConfig();
  if (!cfg.hasKey || !cfg.baseUrl || !cfg.model) return { ok: false, reason: 'not-configured' };

  const base = cfg.baseUrl.replace(/\/+$/, '');
  const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` };
  const sessionHeader = sessionHeaderFor(base);
  if (sessionHeader) headers[sessionHeader] = sessionId();

  const user = [
    `题目：${prompt ?? ''}`,
    `参考答案：${reference ?? ''}`,
    Array.isArray(keywords) && keywords.length ? `要点（仅供你参考，不要求逐字命中）：${keywords.join('、')}` : '',
    `学生的回答：${String(answer ?? '').slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: GRADE_PROMPT },
          { role: 'user', content: user },
        ],
        temperature: 0,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, reason: `http-${res.status}`, detail: text.slice(0, 300) };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const jsonText = content.replace(/```json|```/g, '').trim();
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start < 0 || end <= start) return { ok: false, reason: 'unparsable', detail: content.slice(0, 200) };
    const parsed = JSON.parse(jsonText.slice(start, end + 1));
    return {
      ok: true,
      correct: Boolean(parsed.correct),
      score: Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : null,
      feedback: String(parsed.feedback ?? '').slice(0, 400),
      model: cfg.model,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err.name === 'AbortError' ? 'timeout' : 'network-error',
      detail: String(err.message ?? err),
    };
  } finally {
    clearTimeout(timer);
  }
}
