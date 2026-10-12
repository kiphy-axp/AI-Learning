/**
 * 简答题判分：按「意思到了」判，不按字面抠。
 *
 * 命中规则（任一满足即算命中该要点）：
 *   1. 直接包含
 *   2. 关键词含分隔符时，任一片段命中（如「注意力 Attention」）
 *   3. 常见同义写法命中（内积 = 点积、损失函数 = loss…）
 *   4. 字符二元组重合度 ≥ 0.5（换了说法但用词相近）
 *   5. 长度 ≥ 4 的关键词允许一个字以内的笔误
 *
 * 判过标准：命中至少 1 个要点、且回答不是敷衍（≥ 20 字）即算过。
 * 命中的要点比例会一起返回，供界面提示"还差哪几点"。
 */

export type ShortVerdict = {
  correct: boolean;
  hits: string[];
  missed: string[];
  ratio: number;
  detail: string;
  /** low 表示判分依据弱（一个要点词都没匹配上），界面应提示用户自己确认 */
  confidence: 'high' | 'low';
};

/** 常见术语的等价写法：只收公认等价的，避免误判 */
const SYNONYMS: Record<string, string[]> = {
  点积: ['内积', '数量积'],
  内积: ['点积', '数量积'],
  数量积: ['点积', '内积'],
  损失函数: ['loss', '代价函数', '目标函数'],
  损失: ['loss'],
  代价函数: ['损失函数', 'loss'],
  过拟合: ['overfitting', '过度拟合'],
  欠拟合: ['underfitting', '拟合不足'],
  正则化: ['regularization', '正则'],
  归一化: ['normalization', '标准化', '规范化'],
  批归一化: ['batchnorm', 'batch normalization', 'bn'],
  层归一化: ['layernorm', 'layer normalization', 'ln'],
  激活函数: ['activation', '激活'],
  梯度下降: ['gradient descent', 'gd'],
  反向传播: ['backprop', 'backpropagation', 'bp'],
  前向传播: ['forward', 'forward pass'],
  卷积: ['convolution', 'conv'],
  池化: ['pooling', 'pool'],
  注意力: ['attention'],
  自注意力: ['self-attention', 'self attention'],
  多头注意力: ['multi-head attention', 'multihead attention'],
  词嵌入: ['embedding', '嵌入', '词向量'],
  微调: ['fine-tune', 'finetune', 'fine tuning', 'fine-tune'],
  提示词: ['prompt', '提示'],
  检索增强生成: ['rag'],
  向量数据库: ['vector database', '向量库'],
  量化: ['quantization', '定点化'],
  知识蒸馏: ['distillation', '蒸馏'],
  剪枝: ['pruning'],
  哈希表: ['散列表', 'hash table', 'hashmap', '哈希'],
  二叉搜索树: ['bst', '二叉查找树', '二叉排序树'],
  动态规划: ['dp', '动规'],
  二分查找: ['二分搜索', '折半查找', 'binary search'],
  链表: ['linked list'],
  队列: ['queue', 'fifo'],
  栈: ['stack', 'lifo'],
  排序: ['sort', 'sorting'],
  递归: ['recursion'],
  迭代: ['iteration', '循环'],
  复杂度: ['complexity'],
  时间复杂度: ['time complexity'],
  空间复杂度: ['space complexity'],
  显存: ['vram', 'gpu 内存', '显卡内存'],
  混合精度: ['mixed precision', 'amp'],
  数据并行: ['data parallel', 'dp'],
  模型并行: ['model parallel', 'tp'],
  流水线并行: ['pipeline parallel', 'pp'],
  分布式训练: ['distributed training'],
  学习率: ['learning rate', 'lr'],
  批大小: ['batch size', 'bs'],
  上下文窗口: ['context window', '上下文长度'],
  分词: ['tokenize', 'tokenization', '切词'],
  词元: ['token'],
  幻觉: ['hallucination'],
  对齐: ['alignment', 'align'],
  指令微调: ['sft', 'instruction tuning'],
};

const SEPARATORS = /[\s/·、,，;；()（）[\]【】]+/;

/** 全角转半角 + 去空白 + 去标点 + 统一小写 */
export function normalize(text: string): string {
  return (text ?? '')
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。、；：？！“”‘’（）【】《》,.;:?!"'()[\]{}<>~`·—\-_/\\|+=*&^%$#@]/g, '');
}

function bigrams(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length - 1; i += 1) out.push(text.slice(i, i + 2));
  return out;
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    diff += 1;
    if (diff > 1) return false;
    if (a.length > b.length) i += 1;
    else if (a.length < b.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

/** 单个要点是否命中（宽松匹配） */
export function matchKeyword(keyword: string, answer: string): boolean {
  const raw = (keyword ?? '').trim();
  const normalizedAnswer = normalize(answer);
  if (!raw || !normalizedAnswer) return false;

  const key = normalize(raw);
  if (key && normalizedAnswer.includes(key)) return true;

  // 同义写法
  for (const alias of SYNONYMS[raw] ?? SYNONYMS[key] ?? []) {
    const normalizedAlias = normalize(alias);
    if (normalizedAlias && normalizedAnswer.includes(normalizedAlias)) return true;
  }

  // 「中文 英文」这类复合关键词，任一片段命中即可
  const parts = raw.split(SEPARATORS).map(normalize).filter((p) => p.length >= 2);
  if (parts.length > 1 && parts.some((p) => normalizedAnswer.includes(p))) return true;

  // 换了说法：字符二元组重合度过半
  if (key.length >= 4) {
    const grams = bigrams(key);
    const hit = grams.filter((g) => normalizedAnswer.includes(g)).length;
    if (grams.length && hit / grams.length >= 0.5) return true;
  }

  // 允许一个字以内的笔误
  if (key.length >= 4 && key.length <= 10) {
    for (let i = 0; i + key.length <= normalizedAnswer.length; i += 1) {
      if (editDistanceAtMostOne(key, normalizedAnswer.slice(i, i + key.length))) return true;
    }
  }

  return false;
}

export function gradeShort(
  question: { keywords: string[]; answer?: string },
  rawAnswer: string,
): ShortVerdict {
  const keywords = (question.keywords ?? []).filter(Boolean);
  const text = (rawAnswer ?? '').trim();
  const normalized = normalize(text);

  if (normalized.length < 12) {
    return {
      correct: false,
      hits: [],
      missed: keywords,
      ratio: 0,
      detail: '回答太短了。哪怕用自己的话讲一遍机制也行，写满一两句就算数。',
      confidence: 'high',
    };
  }

  const hits = keywords.filter((k) => matchKeyword(k, text));
  const missed = keywords.filter((k) => !hits.includes(k));
  const ratio = keywords.length ? hits.length / keywords.length : 0;
  const substantive = normalized.length >= 20;

  // 意思到了就算过：命中任意一个要点 + 回答不是敷衍
  const correct = hits.length >= 1 && substantive;
  const confidence: ShortVerdict['confidence'] = hits.length >= 2 || ratio >= 0.5 ? 'high' : 'low';

  const detail = correct
    ? `命中 ${hits.length}/${keywords.length} 个要点${missed.length ? `（还可以补：${missed.join('、')}）` : '，要点都答到了'}`
    : `没匹配到要点词${text.length >= 40 ? '，但你的回答可能已经说到了——觉得答对了就点「我答对了」' : ''}`;

  return { correct, hits, missed, ratio, detail, confidence };
}
