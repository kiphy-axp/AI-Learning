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
  lessons: LESSONS.length,
  minutes: LESSONS.reduce((sum, r) => sum + (r.lesson.estimatedMinutes || 25), 0),
  quizzes: LESSONS.reduce((sum, r) => sum + (r.lesson.quiz?.length ?? 0), 0),
  codeExamples: LESSONS.filter((r) => r.lesson.codeExample?.code?.trim()).length,
  interviewPoints: LESSONS.reduce((sum, r) => sum + (r.lesson.interviewPoints?.length ?? 0), 0),
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
