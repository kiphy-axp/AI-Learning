import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stagesDir = join(root, 'content', 'stages');

const files = readdirSync(stagesDir).filter((f) => /^stage-\d+\.json$/.test(f));

test('内容目录存在且有阶段文件', () => {
  assert.ok(files.length >= 16, `期望至少 16 个阶段，实际 ${files.length}`);
});

test('每个阶段结构完整', () => {
  const stageSlugs = new Set();
  for (const file of files) {
    const doc = JSON.parse(readFileSync(join(stagesDir, file), 'utf8'));
    assert.equal(typeof doc.stage, 'number', `${file} 缺 stage`);
    assert.ok(doc.stageSlug && doc.stageTitle && doc.stageEmoji && doc.stageDesc, `${file} 阶段元信息不完整`);
    assert.ok(['基础', '进阶', '算法岗核心'].includes(doc.category), `${file} category 非法`);
    assert.ok(doc.lessons.length >= 5, `${file} 课程数过少`);
    assert.ok(!stageSlugs.has(doc.stageSlug), `${file} stageSlug 重复`);
    stageSlugs.add(doc.stageSlug);
  }
});

test('每节课程字段完整且习题为 choice/short/code 三题', () => {
  for (const file of files) {
    const doc = JSON.parse(readFileSync(join(stagesDir, file), 'utf8'));
    const slugs = new Set();
    doc.lessons.forEach((lesson, index) => {
      const where = `${file} › ${lesson.slug}`;
      for (const field of ['slug', 'title', 'module', 'difficulty', 'summary', 'intuition', 'formal', 'aiConnection']) {
        assert.ok(typeof lesson[field] === 'string' && lesson[field].trim(), `${where} 字段 ${field} 为空`);
      }
      assert.equal(lesson.order, index + 1, `${where} order 不连续`);
      assert.ok(!slugs.has(lesson.slug), `${where} slug 重复`);
      slugs.add(lesson.slug);
      assert.equal(lesson.quiz.length, 3, `${where} 习题数不是 3`);
      assert.deepEqual(
        lesson.quiz.map((q) => q.type),
        ['choice', 'short', 'code'],
        `${where} 题型顺序不对`,
      );
      const choice = lesson.quiz[0];
      assert.ok(choice.options.length >= 2 && choice.answerIndex < choice.options.length, `${where} 选择题答案越界`);
      assert.ok(lesson.quiz[2].solution && lesson.quiz[2].checks.length, `${where} 编程题缺答案或校验点`);
    });
  }
});

test('内容总量达到算法岗学习站的最低规模', () => {
  let lessons = 0;
  let interviewPoints = 0;
  let quizzes = 0;
  for (const file of files) {
    const doc = JSON.parse(readFileSync(join(stagesDir, file), 'utf8'));
    lessons += doc.lessons.length;
    quizzes += doc.lessons.reduce((sum, l) => sum + l.quiz.length, 0);
    interviewPoints += doc.lessons.reduce((sum, l) => sum + (l.interviewPoints?.length ?? 0), 0);
  }
  assert.ok(lessons >= 150, `知识点总数偏少：${lessons}`);
  assert.ok(quizzes >= 450, `习题总数偏少：${quizzes}`);
  assert.ok(interviewPoints >= 200, `面试考点偏少：${interviewPoints}`);
});
