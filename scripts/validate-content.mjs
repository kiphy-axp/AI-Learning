#!/usr/bin/env node
/**
 * 校验 content/stages/*.json 是否符合 schema v2。
 * 退出码 0 = 全部通过；1 = 有问题。
 *
 * 用法：node scripts/validate-content.mjs [--json]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const stagesDir = resolve(here, '..', 'content', 'stages');
const asJson = process.argv.includes('--json');

const LESSON_STRING_FIELDS = [
  'slug',
  'title',
  'module',
  'difficulty',
  'track',
  'summary',
  'intuition',
  'formal',
  'aiConnection',
];
const DIFFICULTIES = new Set(['基础', '进阶', '高阶']);
const TRACKS = new Set(['main', 'side']);
const CATEGORIES = new Set(['基础', '进阶', '算法岗核心']);
const ACT_NAMES = {
  1: '第一幕 · 起步',
  2: '第二幕 · 编程入门',
  3: '第三幕 · 计算机科学基础',
  4: '第四幕 · 数学',
  5: '第五幕 · 数据与经典机器学习',
  6: '第六幕 · 深度学习与大模型',
  7: '第七幕 · 算法岗进阶',
};

const errors = [];
const warnings = [];
const stats = { stages: 0, lessons: 0, quizzes: 0, codeExamples: 0, resources: 0, main: 0, side: 0 };

function fail(where, message) {
  errors.push(`${where}: ${message}`);
}

function checkLesson(stageFile, stage, lesson, index) {
  const where = `${stageFile} › ${lesson.slug ?? `#${index + 1}`}`;
  for (const field of LESSON_STRING_FIELDS) {
    if (typeof lesson[field] !== 'string' || lesson[field].trim() === '') {
      fail(where, `字段 ${field} 缺失或为空`);
    }
  }
  if (!DIFFICULTIES.has(lesson.difficulty)) {
    fail(where, `difficulty 非法：${lesson.difficulty}`);
  }
  if (!TRACKS.has(lesson.track)) {
    fail(where, `track 非法：${lesson.track}`);
  } else {
    stats[lesson.track] += 1;
    // 主线阶段里的高阶课应为支线，保持"主线 = 打地基"的口径
    if (lesson.track === 'main' && lesson.difficulty === '高阶') {
      warnings.push(`${where}: 主线里的高阶课，建议标为 side`);
    }
  }
  if (lesson.order !== index + 1) {
    fail(where, `order 应为 ${index + 1}，实际 ${lesson.order}`);
  }
  if (typeof lesson.formula !== 'string') {
    fail(where, 'formula 必须是字符串（无公式时写 ""）');
  }
  if (typeof lesson.estimatedMinutes !== 'number' || lesson.estimatedMinutes < 5) {
    fail(where, 'estimatedMinutes 非法');
  }
  if (!lesson.codeExample || typeof lesson.codeExample.code !== 'string') {
    fail(where, 'codeExample 缺失');
  } else if (lesson.codeExample.code.trim()) {
    stats.codeExamples += 1;
  }
  if (!Array.isArray(lesson.mistakes) || lesson.mistakes.length === 0) {
    fail(where, 'mistakes 不能为空');
  }
  if (!Array.isArray(lesson.interviewPoints)) {
    fail(where, 'interviewPoints 必须是数组');
  }
  if (!Array.isArray(lesson.resources)) {
    fail(where, 'resources 必须是数组');
  } else {
    stats.resources += lesson.resources.length;
    lesson.resources.forEach((r, i) => {
      if (!r?.title || !r?.url) fail(where, `resources[${i}] 缺 title/url`);
      else if (!/^https?:\/\//.test(r.url)) fail(where, `resources[${i}].url 不是 http(s) 链接`);
    });
  }
  // 2-3 题：选择 + 简答是必须的，编程题只在"这一节真的教代码"时才加
  if (!Array.isArray(lesson.quiz) || lesson.quiz.length < 2 || lesson.quiz.length > 3) {
    fail(where, `quiz 应为 2-3 题，实际 ${lesson.quiz?.length ?? 0}`);
    return;
  }
  stats.quizzes += lesson.quiz.length;
  const types = lesson.quiz.map((q) => q.type);
  const expectedTypes = ['choice', 'short', 'code'].slice(0, types.length);
  if (types.join(',') !== expectedTypes.join(',')) {
    fail(where, `quiz 题型顺序应为 ${expectedTypes.join(',')}，实际 ${types.join(',')}`);
  }
  lesson.quiz.forEach((q, qi) => {
    const qw = `${where} › quiz[${qi}]`;
    if (!q.id || !q.prompt) fail(qw, '缺 id/prompt');
    if (q.type === 'choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) fail(qw, 'options 至少 2 项');
      else if (typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex >= q.options.length) {
        fail(qw, `answerIndex 越界：${q.answerIndex}`);
      }
      if (!q.explanation) fail(qw, 'choice 缺 explanation');
    } else if (q.type === 'short') {
      if (!q.answer) fail(qw, 'short 缺 answer');
      if (!Array.isArray(q.keywords) || q.keywords.length === 0) fail(qw, 'short 缺 keywords');
      if (!q.explanation) fail(qw, 'short 缺 explanation');
    } else if (q.type === 'code') {
      if (!q.starterCode) fail(qw, 'code 缺 starterCode');
      if (!q.solution) fail(qw, 'code 缺 solution');
      if (!Array.isArray(q.checks) || q.checks.length === 0) fail(qw, 'code 缺 checks');
    } else {
      fail(qw, `未知题型：${q.type}`);
    }
  });
  if (lesson.interviewPoints.length === 0) {
    warnings.push(`${where}: interviewPoints 为空（旧内容迁移项，可后续补充）`);
  }
}

function main() {
  let files;
  try {
    files = readdirSync(stagesDir).filter((f) => /^stage-\d+\.json$/.test(f));
  } catch {
    console.error(`找不到内容目录：${stagesDir}`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error('content/stages 下没有任何 stage-N.json');
    process.exit(1);
  }

  const seenSlugs = new Map();
  const seenStages = new Map();

  for (const file of files.sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))) {
    const full = join(stagesDir, file);
    let doc;
    try {
      doc = JSON.parse(readFileSync(full, 'utf8'));
    } catch (err) {
      fail(file, `JSON 解析失败：${err.message}`);
      continue;
    }
    stats.stages += 1;
    if (typeof doc.stage !== 'number' || doc.stage < 1 || doc.stage > 22) {
      fail(file, `stage 必须是 1-22 的整数，实际 ${doc.stage}`);
    }
    if (seenStages.has(doc.stage)) fail(file, `stage ${doc.stage} 与 ${seenStages.get(doc.stage)} 重复`);
    seenStages.set(doc.stage, file);
    const expectedFile = `stage-${doc.stage}.json`;
    if (file !== expectedFile) fail(file, `文件名与 stage 不一致，应为 ${expectedFile}`);
    for (const field of ['stageSlug', 'stageTitle', 'stageEmoji', 'stageDesc', 'actName', 'category']) {
      if (typeof doc[field] !== 'string' || !doc[field].trim()) fail(file, `顶层字段 ${field} 缺失`);
    }
    if (!ACT_NAMES[doc.act]) {
      fail(file, `act 非法：${doc.act}（应为 1-7）`);
    } else if (doc.actName !== ACT_NAMES[doc.act]) {
      fail(file, `actName 与 act 不匹配：act=${doc.act} 应为「${ACT_NAMES[doc.act]}」，实际「${doc.actName}」`);
    }
    if (!CATEGORIES.has(doc.category)) fail(file, `category 非法：${doc.category}`);
    if (!Array.isArray(doc.lessons) || doc.lessons.length < 5) {
      fail(file, `lessons 至少 5 节，实际 ${doc.lessons?.length ?? 0}`);
      continue;
    }
    if (doc.lessons.length < 8) {
      warnings.push(`${file}: 仅 ${doc.lessons.length} 节，少于常规阶段的 8 节`);
    }
    if (seenSlugs.has(doc.stageSlug)) {
      fail(file, `stageSlug ${doc.stageSlug} 与 ${seenSlugs.get(doc.stageSlug)} 重复`);
    }
    seenSlugs.set(doc.stageSlug, file);

    const lessonSlugs = new Set();
    doc.lessons.forEach((lesson, index) => {
      stats.lessons += 1;
      if (lessonSlugs.has(lesson.slug)) fail(file, `阶段内 slug 重复：${lesson.slug}`);
      lessonSlugs.add(lesson.slug);
      checkLesson(file, doc, lesson, index);
    });
  }

  const summary = {
    ...stats,
    errors: errors.length,
    warnings: warnings.length,
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, errors, warnings }, null, 2));
  } else {
    console.log(
      `阶段 ${stats.stages} 个 · 知识点 ${stats.lessons} 节（主线 ${stats.main} / 支线 ${stats.side}）· 习题 ${stats.quizzes} 道 · 代码示例 ${stats.codeExamples} 个 · 外部资源 ${stats.resources} 条`,
    );
    if (warnings.length) {
      console.log(`\n⚠ 警告 ${warnings.length} 条：`);
      warnings.slice(0, 12).forEach((w) => console.log(`  - ${w}`));
      if (warnings.length > 12) console.log(`  ... 另有 ${warnings.length - 12} 条`);
    }
    if (errors.length) {
      console.log(`\n✗ 错误 ${errors.length} 条：`);
      errors.slice(0, 40).forEach((e) => console.log(`  - ${e}`));
      if (errors.length > 40) console.log(`  ... 另有 ${errors.length - 40} 条`);
      process.exit(1);
    }
    console.log('\n✓ 内容校验全部通过');
  }

  if (errors.length) process.exit(1);
}

main();
