#!/usr/bin/env node
/**
 * 知识体系重构（一次性脚本）
 *
 * 把原来"按技术主题平铺"的 16 个阶段，重排成面向零基础学习者的 7 幕结构：
 *   第一幕 起步 → 第二幕 编程入门 → 第三幕 计算机科学基础 → 第四幕 数学
 *   → 第五幕 数据与经典机器学习 → 第六幕 深度学习与大模型 → 第七幕 算法岗进阶
 *
 * 原则：
 *  1. 现有课程内容一个字段都不改，只重新编号、补 act / actName / track
 *  2. 新增的 6 个阶段（起步 3 个、Python 起步、算法思维入门、数学衔接）由内容代理写入，
 *     本脚本只负责给它们留出阶段号
 *  3. 主线 = 打地基到能独立训练模型；支线 = 面向算法岗的专项深化
 *
 * 用法：node scripts/restructure.mjs [--dry-run]
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const stagesDir = join(root, 'content', 'stages');
const dryRun = process.argv.includes('--dry-run');

const ACT_NAMES = {
  1: '第一幕 · 起步',
  2: '第二幕 · 编程入门',
  3: '第三幕 · 计算机科学基础',
  4: '第四幕 · 数学',
  5: '第五幕 · 数据与经典机器学习',
  6: '第六幕 · 深度学习与大模型',
  7: '第七幕 · 算法岗进阶',
};

/**
 * 新阶段表。
 * source = 现有阶段的 stageSlug；source 为 null 表示该阶段由内容代理新写。
 */
const PLAN = [
  { stage: 1, act: 1, slug: 'what-is-computer', tier: '基础', source: null, title: '计算机是什么' },
  { stage: 2, act: 1, slug: 'program-thinking', tier: '基础', source: null, title: '程序与计算思维' },
  { stage: 3, act: 1, slug: 'tools-and-method', tier: '基础', source: null, title: '学习工具与方法' },
  { stage: 4, act: 2, slug: 'python-first-step', tier: '基础', source: null, title: 'Python 起步' },
  { stage: 5, act: 2, slug: 'python', tier: '基础', source: 'python' },
  { stage: 6, act: 2, slug: 'linux-git', tier: '基础', source: 'linux-git' },
  { stage: 7, act: 3, slug: 'computer-science', tier: '基础', source: 'computer-science' },
  { stage: 8, act: 3, slug: 'algorithm-thinking', tier: '基础', source: null, title: '算法思维入门' },
  { stage: 9, act: 3, slug: 'dsa', tier: '算法岗核心', source: 'dsa' },
  { stage: 10, act: 4, slug: 'math-bridge', tier: '基础', source: null, title: '数学衔接：从高中到大学' },
  { stage: 11, act: 4, slug: 'mathematics', tier: '基础', source: 'mathematics' },
  { stage: 12, act: 4, slug: 'advanced-math', tier: '算法岗核心', source: 'advanced-math' },
  { stage: 13, act: 5, slug: 'data-science', tier: '基础', source: 'data-science' },
  { stage: 14, act: 5, slug: 'machine-learning', tier: '进阶', source: 'machine-learning' },
  { stage: 15, act: 6, slug: 'deep-learning', tier: '进阶', source: 'deep-learning' },
  { stage: 16, act: 6, slug: 'advanced-ml', tier: '算法岗核心', source: 'advanced-ml' },
  { stage: 17, act: 6, slug: 'transformer', tier: '进阶', source: 'transformer' },
  { stage: 18, act: 6, slug: 'llm', tier: '进阶', source: 'llm' },
  { stage: 19, act: 6, slug: 'agent', tier: '进阶', source: 'agent' },
  { stage: 20, act: 7, slug: 'llm-engineering', tier: '算法岗核心', source: 'llm-engineering' },
  { stage: 21, act: 7, slug: 'gpu-cuda', tier: '算法岗核心', source: 'gpu-cuda' },
  { stage: 22, act: 7, slug: 'papers', tier: '算法岗核心', source: 'papers' },
];

/** 整段划入支线的阶段：面向算法岗的专项深化，主线走完后再补 */
const SIDE_STAGES = new Set(['advanced-math', 'advanced-ml', 'agent', 'llm-engineering', 'gpu-cuda', 'papers']);

function trackFor(stageSlug, lesson) {
  if (SIDE_STAGES.has(stageSlug)) return 'side';
  // 主线阶段里的高阶课标为支线：不影响主线推进，想深挖再回来
  return lesson.difficulty === '高阶' ? 'side' : 'main';
}

function main() {
  const files = readdirSync(stagesDir).filter((f) => /^stage-\d+\.json$/.test(f));
  const bySlug = new Map();
  for (const file of files) {
    const doc = JSON.parse(readFileSync(join(stagesDir, file), 'utf8'));
    bySlug.set(doc.stageSlug, { doc, file });
  }

  const missing = PLAN.filter((p) => p.source && !bySlug.has(p.source));
  if (missing.length) {
    console.error('以下来源阶段找不到：', missing.map((m) => m.source).join(', '));
    process.exit(1);
  }

  const outDir = join(root, 'content', 'stages-new');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const stats = { stages: 0, lessons: 0, main: 0, side: 0, pending: [] };

  for (const item of PLAN) {
    if (!item.source) {
      stats.pending.push(`stage-${item.stage} ${item.title}（待内容代理写入）`);
      continue;
    }
    const { doc } = bySlug.get(item.source);
    const lessons = doc.lessons.map((lesson) => ({
      ...lesson,
      track: trackFor(item.slug, lesson),
    }));
    const out = {
      stage: item.stage,
      stageSlug: item.slug,
      stageTitle: doc.stageTitle,
      stageEmoji: doc.stageEmoji,
      stageDesc: doc.stageDesc,
      act: item.act,
      actName: ACT_NAMES[item.act],
      category: item.tier,
      lessons,
    };
    writeFileSync(join(outDir, `stage-${item.stage}.json`), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    stats.stages += 1;
    stats.lessons += lessons.length;
    stats.main += lessons.filter((l) => l.track === 'main').length;
    stats.side += lessons.filter((l) => l.track === 'side').length;
    console.log(
      `  第${item.act}幕 阶段${String(item.stage).padStart(2)} ${out.stageTitle}（原 ${item.source}）— ${lessons.length} 节，主线 ${lessons.filter((l) => l.track === 'main').length}`,
    );
  }

  console.log(`\n已迁移 ${stats.stages} 个现有阶段 / ${stats.lessons} 节`);
  console.log(`主线 ${stats.main} 节 · 支线 ${stats.side} 节`);
  console.log(`待新写：${stats.pending.length} 个阶段`);
  stats.pending.forEach((p) => console.log(`  - ${p}`));

  if (dryRun) {
    console.log('\n[dry-run] 未改动 content/stages');
    rmSync(outDir, { recursive: true, force: true });
    return;
  }

  const backup = join(root, 'content', `stages-backup-${new Date().toISOString().slice(0, 10)}`);
  if (existsSync(stagesDir) && !existsSync(backup)) {
    cpSync(stagesDir, backup, { recursive: true });
    console.log(`\n已备份原内容到 ${backup}`);
  }
  rmSync(stagesDir, { recursive: true, force: true });
  cpSync(outDir, stagesDir, { recursive: true });
  rmSync(outDir, { recursive: true, force: true });
  console.log(`已写入新的 ${stagesDir}`);
}

main();
