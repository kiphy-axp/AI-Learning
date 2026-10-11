import type { Lesson, LessonRef, Stage } from './types';

const modules = import.meta.glob('../../../content/stages/*.json', { eager: true }) as Record<
  string,
  { default: Stage }
>;

export const STAGES: Stage[] = Object.entries(modules)
  .map(([, mod]) => mod.default ?? (mod as unknown as Stage))
  .filter((s): s is Stage => Boolean(s?.lessons))
  .sort((a, b) => a.stage - b.stage);

export const LESSONS: LessonRef[] = STAGES.flatMap((stage) =>
  stage.lessons.map((lesson) => ({ stage, lesson })),
);

const byKey = new Map<string, LessonRef>();
for (const ref of LESSONS) {
  byKey.set(`${ref.stage.stageSlug}/${ref.lesson.slug}`, ref);
}

export function findLesson(stageSlug?: string, lessonSlug?: string): LessonRef | undefined {
  if (!stageSlug || !lessonSlug) return undefined;
  return byKey.get(`${stageSlug}/${lessonSlug}`);
}

export function findStage(stageSlug?: string): Stage | undefined {
  return STAGES.find((s) => s.stageSlug === stageSlug);
}

/** 顺序展开的全部课程（用于"下一节"） */
export const LESSON_ORDER: LessonRef[] = LESSONS;

export function neighbours(ref: LessonRef) {
  const index = LESSON_ORDER.findIndex(
    (r) => r.stage.stageSlug === ref.stage.stageSlug && r.lesson.slug === ref.lesson.slug,
  );
  return {
    index,
    prev: index > 0 ? LESSON_ORDER[index - 1] : undefined,
    next: index >= 0 && index < LESSON_ORDER.length - 1 ? LESSON_ORDER[index + 1] : undefined,
  };
}

export const TOTALS = {
  stages: STAGES.length,
  acts: new Set(STAGES.map((s) => s.act)).size,
  lessons: LESSONS.length,
  main: LESSONS.filter((r) => r.lesson.track === 'main').length,
  side: LESSONS.filter((r) => r.lesson.track === 'side').length,
  minutes: LESSONS.reduce((sum, r) => sum + (r.lesson.estimatedMinutes || 25), 0),
  mainMinutes: LESSONS.filter((r) => r.lesson.track === 'main').reduce(
    (sum, r) => sum + (r.lesson.estimatedMinutes || 25),
    0,
  ),
  quizzes: LESSONS.reduce((sum, r) => sum + (r.lesson.quiz?.length ?? 0), 0),
  codeExamples: LESSONS.filter((r) => r.lesson.codeExample?.code?.trim()).length,
  interviewPoints: LESSONS.reduce((sum, r) => sum + (r.lesson.interviewPoints?.length ?? 0), 0),
};

export type ActInfo = {
  act: number;
  actName: string;
  stages: Stage[];
  lessons: number;
  mainLessons: number;
  sideLessons: number;
  minutes: number;
};

/** 七幕结构：从零基础到算法岗的推进顺序 */
export const ACTS: ActInfo[] = (() => {
  const map = new Map<number, ActInfo>();
  for (const stage of STAGES) {
    const entry: ActInfo =
      map.get(stage.act) ??
      {
        act: stage.act,
        actName: stage.actName,
        stages: [],
        lessons: 0,
        mainLessons: 0,
        sideLessons: 0,
        minutes: 0,
      };
    entry.stages.push(stage);
    entry.lessons += stage.lessons.length;
    entry.mainLessons += stage.lessons.filter((l) => l.track === 'main').length;
    entry.sideLessons += stage.lessons.filter((l) => l.track === 'side').length;
    entry.minutes += stage.lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 25), 0);
    map.set(stage.act, entry);
  }
  return [...map.values()].sort((a, b) => a.act - b.act);
})();

/** 每幕的配色与定位说明（闯关地图用） */
export const ACT_META: Record<number, { accent: string; short: string; desc: string }> = {
  1: {
    accent: '#34d399',
    short: '起步',
    desc: '计算机是什么、程序是什么、工具怎么用 —— 不写一行代码也能看懂，读完再动手。',
  },
  2: {
    accent: '#38bdf8',
    short: '编程入门',
    desc: '从第一行 Python 代码到能写小项目，再学会 Linux 和 Git 这两件日常工具。',
  },
  3: {
    accent: '#818cf8',
    short: '计算机科学基础',
    desc: '计算机组成、算法直觉、数据结构与算法 —— 面试第一关，也是写出好代码的地基。',
  },
  4: {
    accent: '#a78bfa',
    short: '数学',
    desc: '从高中数学接上大学的线性代数、微积分、概率统计，再到看懂论文的进阶数学。',
  },
  5: {
    accent: '#f472b6',
    short: '数据与经典机器学习',
    desc: '把脏数据变成能训练的数据集，跑通第一批经典机器学习模型。',
  },
  6: {
    accent: '#fbbf24',
    short: '深度学习与大模型',
    desc: '神经网络、PyTorch、Transformer、LLM 应用与 Agent —— 现代 AI 的主干。',
  },
  7: {
    accent: '#fb7185',
    short: '算法岗进阶',
    desc: '大模型训练与推理工程、GPU 优化、论文复现 —— 面向算法岗的正面战场。',
  },
};

export const TRACK_LABEL: Record<string, string> = { main: '主线', side: '支线' };

export const TRACK_STYLE: Record<string, string> = {
  main: 'bg-brand-500/12 text-brand-300 ring-brand-500/30',
  side: 'bg-white/5 text-slate-400 ring-white/10',
};

export const CATEGORY_ORDER = ['基础', '进阶', '算法岗核心'] as const;

export const DIFFICULTY_STYLE: Record<string, string> = {
  基础: 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30',
  进阶: 'bg-sky-500/12 text-sky-300 ring-sky-500/30',
  高阶: 'bg-fuchsia-500/12 text-fuchsia-300 ring-fuchsia-500/30',
};

export const STATUS_LABEL: Record<string, string> = {
  'not-started': '未开始',
  learning: '学习中',
  review: '待复习',
  mastered: '已掌握',
};

export const STATUS_STYLE: Record<string, string> = {
  'not-started': 'bg-white/5 text-slate-400 ring-white/10',
  learning: 'bg-brand-500/12 text-brand-400 ring-brand-500/30',
  review: 'bg-amber-500/12 text-amber-300 ring-amber-500/30',
  mastered: 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30',
};

/** 面试考点总览（求职页用） */
export function allInterviewPoints(): { ref: LessonRef; point: string }[] {
  return LESSONS.flatMap((ref) =>
    (ref.lesson.interviewPoints ?? []).map((point) => ({ ref, point })),
  );
}

export function lessonCode(ref: LessonRef): string {
  return `${ref.stage.stageSlug}/${ref.lesson.slug}`;
}

export function firstLine(text: string, max = 120): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export type { Lesson, Stage, LessonRef };
