import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stagesDir = join(root, 'content', 'stages');

const ACT_NAMES = {
  1: '第一幕 · 起步',
  2: '第二幕 · 编程入门',
  3: '第三幕 · 计算机科学基础',
  4: '第四幕 · 数学',
  5: '第五幕 · 数据与经典机器学习',
  6: '第六幕 · 深度学习与大模型',
  7: '第七幕 · 算法岗进阶',
};

/** 面向零基础学习者的七幕结构，阶段号必须连续覆盖 1-22 */
const EXPECTED_SLUGS = [
  'what-is-computer',
  'program-thinking',
  'tools-and-method',
  'python-first-step',
  'python',
  'linux-git',
  'computer-science',
  'algorithm-thinking',
  'dsa',
  'math-bridge',
  'mathematics',
  'advanced-math',
  'data-science',
  'machine-learning',
  'deep-learning',
  'advanced-ml',
  'transformer',
  'llm',
  'agent',
  'llm-engineering',
  'gpu-cuda',
  'papers',
];

const files = readdirSync(stagesDir).filter((f) => /^stage-\d+\.json$/.test(f));
const docs = files.map((file) => ({ file, doc: JSON.parse(readFileSync(join(stagesDir, file), 'utf8')) }));

test('七幕 22 个阶段齐全且编号连续', () => {
  assert.equal(files.length, EXPECTED_SLUGS.length, `期望 ${EXPECTED_SLUGS.length} 个阶段，实际 ${files.length}`);
  const numbers = docs.map(({ doc }) => doc.stage).sort((a, b) => a - b);
  assert.deepEqual(
    numbers,
    EXPECTED_SLUGS.map((_, i) => i + 1),
    '阶段号必须连续覆盖 1-22',
  );
  const slugs = docs.map(({ doc }) => doc.stageSlug).sort();
  assert.deepEqual(slugs, [...EXPECTED_SLUGS].sort(), 'stageSlug 与规划不一致');
});

test('每个阶段结构完整且 act / actName 一致', () => {
  for (const { file, doc } of docs) {
    assert.equal(typeof doc.stage, 'number', `${file} 缺 stage`);
    assert.ok(doc.stageSlug && doc.stageTitle && doc.stageEmoji && doc.stageDesc, `${file} 阶段元信息不完整`);
    assert.ok(['基础', '进阶', '算法岗核心'].includes(doc.category), `${file} category 非法`);
    assert.equal(doc.actName, ACT_NAMES[doc.act], `${file} actName 与 act 不匹配`);
    assert.ok(doc.lessons.length >= 5, `${file} 课程数过少`);
  }
});

test('每节课程字段完整，含 track，习题为 choice/short（教代码的小节再加 code）', () => {
  for (const { file, doc } of docs) {
    const slugs = new Set();
    doc.lessons.forEach((lesson, index) => {
      const where = `${file} › ${lesson.slug}`;
      for (const field of [
        'slug',
        'title',
        'module',
        'difficulty',
        'track',
        'summary',
        'intuition',
        'formal',
        'aiConnection',
      ]) {
        assert.ok(typeof lesson[field] === 'string' && lesson[field].trim(), `${where} 字段 ${field} 为空`);
      }
      assert.ok(['main', 'side'].includes(lesson.track), `${where} track 非法`);
      assert.equal(lesson.order, index + 1, `${where} order 不连续`);
      assert.ok(!slugs.has(lesson.slug), `${where} slug 重复`);
      slugs.add(lesson.slug);
      assert.ok(
        lesson.quiz.length >= 2 && lesson.quiz.length <= 3,
        `${where} 习题数应为 2-3，实际 ${lesson.quiz.length}`,
      );
      assert.deepEqual(
        lesson.quiz.map((q) => q.type),
        ['choice', 'short', 'code'].slice(0, lesson.quiz.length),
        `${where} 题型顺序不对`,
      );
      const choice = lesson.quiz[0];
      assert.ok(choice.options.length >= 2 && choice.answerIndex < choice.options.length, `${where} 选择题答案越界`);
      const codeQuestion = lesson.quiz[2];
      if (codeQuestion) {
        assert.ok(codeQuestion.solution && codeQuestion.checks.length, `${where} 编程题缺答案或校验点`);
      }
    });
  }
});

test('主线/支线规模符合规划', () => {
  let lessons = 0;
  let main = 0;
  let side = 0;
  let quizzes = 0;
  let interviewPoints = 0;
  for (const { doc } of docs) {
    lessons += doc.lessons.length;
    quizzes += doc.lessons.reduce((sum, l) => sum + l.quiz.length, 0);
    interviewPoints += doc.lessons.reduce((sum, l) => sum + (l.interviewPoints?.length ?? 0), 0);
    for (const lesson of doc.lessons) {
      if (lesson.track === 'main') main += 1;
      else side += 1;
    }
  }
  assert.ok(lessons >= 195, `知识点总数偏少：${lessons}`);
  assert.ok(main >= 110, `主线知识点偏少：${main}`);
  assert.ok(side >= 70, `支线知识点偏少：${side}`);
  assert.ok(quizzes >= 420, `习题总数偏少：${quizzes}`);
  assert.ok(interviewPoints >= 250, `面试考点偏少：${interviewPoints}`);
});

test('零基础起步内容确实存在', () => {
  const opening = docs.filter(({ doc }) => doc.act === 1);
  assert.equal(opening.length, 3, '第一幕应为 3 个阶段');
  const total = opening.reduce((sum, { doc }) => sum + doc.lessons.length, 0);
  assert.ok(total >= 16, `第一幕课程偏少：${total}`);
  // 起步阶段不应该是"高阶"，否则对零基础读者不友好
  for (const { file, doc } of opening) {
    for (const lesson of doc.lessons) {
      assert.notEqual(lesson.difficulty, '高阶', `${file} › ${lesson.slug} 起步阶段出现高阶难度`);
    }
  }
});
