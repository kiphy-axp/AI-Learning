#!/usr/bin/env node
/**
 * 把 AI-Learning 项目的旧版内容源（content-source/stage-N.json）迁移为
 * ai-algo-lab 的 schema v2，写入 content/stages/stage-N.json。
 *
 * 旧字段全部保留，只补齐 v2 新增字段：
 *   stageEmoji / stageDesc / category / difficulty / estimatedMinutes / interviewPoints / resources
 *
 * 用法：node scripts/migrate-legacy-content.mjs [旧内容源目录]
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const legacyDir = resolve(
  process.argv[2] ?? join(projectRoot, '..', '..', 'AI-Learning', 'content-source'),
);
const outDir = join(projectRoot, 'content', 'stages');

/** 阶段元信息：旧内容源里没有 emoji / 描述 / 分类 */
const STAGE_META = {
  1: { emoji: '💻', desc: 'CPU、内存、操作系统、网络与 HTTP：看懂程序运行时到底发生了什么', category: '基础', difficulty: '基础' },
  2: { emoji: '🐍', desc: '从语法到类与模块：把 Python 写成能维护的工程代码', category: '基础', difficulty: '基础' },
  3: { emoji: '🐧', desc: '终端、Shell 与 Git 工作流：算法工程师每天都在用的协作底座', category: '基础', difficulty: '基础' },
  4: { emoji: '📐', desc: '线性代数、微积分与概率统计：读懂模型公式的最小数学集', category: '基础', difficulty: '基础' },
  5: { emoji: '📊', desc: 'NumPy、Pandas 与可视化：把脏数据变成可训练的数据集', category: '基础', difficulty: '基础' },
  6: { emoji: '🤖', desc: '回归、树模型、SVM、聚类与 PCA：经典机器学习算法全貌', category: '进阶', difficulty: '进阶' },
  7: { emoji: '🧠', desc: '神经网络、反向传播、PyTorch、CNN 与 RNN：深度学习的起点', category: '进阶', difficulty: '进阶' },
  8: { emoji: '⚡', desc: 'Token、Embedding、Attention 与整体架构：大模型的结构基石', category: '进阶', difficulty: '进阶' },
  9: { emoji: '🗣️', desc: 'Prompt、微调、向量库、RAG 与 MCP：把大模型接进真实产品', category: '进阶', difficulty: '进阶' },
  10: { emoji: '🕊️', desc: 'Tool Calling、Agent Loop、Memory 与多智能体：让模型自己干活', category: '进阶', difficulty: '进阶' },
};

/** 按内容体量估算学习时长 */
function estimateMinutes(lesson) {
  const text = [
    lesson.summary,
    lesson.intuition,
    lesson.formal,
    lesson.aiConnection,
    lesson.codeExample?.code,
  ]
    .filter(Boolean)
    .join('');
  const chars = text.length;
  const codeLines = (lesson.codeExample?.code ?? '').split('\n').length;
  const base = 15 + Math.round(chars / 220) + Math.round(codeLines / 6);
  return Math.min(60, Math.max(20, base));
}

function migrateLesson(lesson, index, meta) {
  return {
    slug: lesson.slug,
    title: lesson.title,
    order: lesson.order ?? index + 1,
    module: lesson.module ?? '基础',
    difficulty: meta.difficulty,
    estimatedMinutes: estimateMinutes(lesson),
    summary: lesson.summary ?? '',
    intuition: lesson.intuition ?? '',
    formal: lesson.formal ?? '',
    formula: lesson.formula ?? '',
    aiConnection: lesson.aiConnection ?? '',
    codeExample: lesson.codeExample ?? { lang: 'text', filename: '', code: '' },
    mistakes: lesson.mistakes ?? [],
    interviewPoints: [],
    resources: [],
    quiz: lesson.quiz ?? [],
  };
}

function main() {
  if (!existsSync(legacyDir)) {
    console.error(`找不到旧内容源目录：${legacyDir}`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  let totalLessons = 0;
  for (let stage = 1; stage <= 10; stage += 1) {
    const file = join(legacyDir, `stage-${stage}.json`);
    if (!existsSync(file)) {
      console.warn(`跳过 stage-${stage}：文件不存在`);
      continue;
    }
    const src = JSON.parse(readFileSync(file, 'utf8'));
    const meta = STAGE_META[stage];
    const out = {
      stage,
      stageSlug: src.stageSlug,
      stageTitle: src.stageTitle,
      stageEmoji: meta.emoji,
      stageDesc: meta.desc,
      category: meta.category,
      lessons: src.lessons.map((l, i) => migrateLesson(l, i, meta)),
    };
    const target = join(outDir, `stage-${stage}.json`);
    writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    totalLessons += out.lessons.length;
    console.log(
      `✓ stage-${stage} ${out.stageTitle} — ${out.lessons.length} 节, ${(JSON.stringify(out).length / 1024).toFixed(1)}KB`,
    );
  }
  console.log(`\n迁移完成：10 个阶段 / ${totalLessons} 节 → ${outDir}`);
}

main();
