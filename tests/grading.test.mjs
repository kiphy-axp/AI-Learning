import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeShort, matchKeyword, normalize } from '../web/src/lib/grading.ts';

test('归一化：全角、大小写、空白与标点', () => {
  assert.equal(normalize('Ａｔｔｅｎｔｉｏｎ 注意力！'), 'attention注意力');
  assert.equal(normalize('O(n) 复杂度'), 'on复杂度');
});

test('要点命中：直接包含', () => {
  assert.ok(matchKeyword('点积', '点积就是把对应分量相乘再求和'));
  assert.ok(matchKeyword('Attention', 'attention 让模型动态关注相关位置'));
});

test('要点命中：换一种说法（同义词）', () => {
  assert.ok(matchKeyword('点积', '内积反映两个向量的相似程度'));
  assert.ok(matchKeyword('损失函数', 'loss 衡量预测和真实标签差多远'));
  assert.ok(matchKeyword('自注意力', 'self attention 让序列内部互相看'));
  assert.ok(matchKeyword('哈希表', '散列表平均查找是 O(1)'));
  assert.ok(matchKeyword('动态规划', 'dp 的核心是把子问题答案记下来'));
});

test('要点命中：中文英文复合关键词，命中任一片段即可', () => {
  assert.ok(matchKeyword('注意力 Attention', '它靠 attention 加权求和'));
  assert.ok(matchKeyword('注意力 Attention', '注意力机制会动态加权'));
});

test('要点命中：允许一个字以内的笔误', () => {
  assert.ok(matchKeyword('梯度下降', '梯度下将是最常用的优化方法'));
});

test('要点命中：用词相近（二元组重合度过半）', () => {
  assert.ok(matchKeyword('反向传播', '反向传递误差并更新权重'));
});

test('不该命中的不要硬命中', () => {
  assert.ok(!matchKeyword('点积', '矩阵乘法是把行列对应元素相乘'));
  assert.ok(!matchKeyword('过拟合', '训练轮数太少，模型还没学到规律'));
});

test('判过标准：命中一个要点 + 回答不敷衍就算过', () => {
  const q = { keywords: ['点积', '相似度', '投影'] };
  const verdict = gradeShort(q, '内积就是把两个向量对应位置相乘再相加，结果越大说明方向越接近。');
  assert.equal(verdict.correct, true, verdict.detail);
  assert.ok(verdict.hits.length >= 1);
});

test('判过标准：敷衍的短回答不算过', () => {
  const q = { keywords: ['点积', '相似度'] };
  const verdict = gradeShort(q, '不知道');
  assert.equal(verdict.correct, false);
  assert.match(verdict.detail, /太短/);
});

test('判过标准：完全没沾边但写得很长，标记为需要自己确认', () => {
  const q = { keywords: ['点积', '相似度'] };
  const verdict = gradeShort(
    q,
    '我觉得这个问题要从计算机的发展历史讲起，早期机器用的是继电器，后来换成晶体管，速度提升了很多倍。',
  );
  assert.equal(verdict.correct, false);
  assert.equal(verdict.confidence, 'low');
  assert.match(verdict.detail, /我答对了/);
});

test('判过标准：要点答全时给出 high 置信度', () => {
  const q = { keywords: ['点积', '相似度'] };
  const verdict = gradeShort(q, '点积可以衡量两个向量的相似度，值越大方向越一致。');
  assert.equal(verdict.correct, true);
  assert.equal(verdict.confidence, 'high');
  assert.deepEqual(verdict.missed, []);
});
