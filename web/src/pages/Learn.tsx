import { BookOpen, Search, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DifficultyChip, PageHeader, ProgressBar, StatusChip } from '../components/ui';
import { STAGES } from '../lib/content';
import { useStore } from '../lib/store';

export function Learn() {
  const [params, setParams] = useSearchParams();
  const activeStage = params.get('stage') ?? STAGES[0]?.stageSlug ?? '';
  const [query, setQuery] = useState('');
  const { progress } = useStore();

  const stage = STAGES.find((s) => s.stageSlug === activeStage) ?? STAGES[0];

  const lessons = useMemo(() => {
    if (!stage) return [];
    if (!query.trim()) return stage.lessons;
    const q = query.trim().toLowerCase();
    return stage.lessons.filter((l) =>
      `${l.title} ${l.summary} ${l.module}`.toLowerCase().includes(q),
    );
  }, [stage, query]);

  const globalMatches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return STAGES.flatMap((s) =>
      s.lessons
        .filter((l) => `${l.title} ${l.summary}`.toLowerCase().includes(q))
        .map((l) => ({ stage: s, lesson: l })),
    ).slice(0, 12);
  }, [query]);

  if (!stage) return null;

  const modules = [...new Set(lessons.map((l) => l.module))];
  const stageDone = stage.lessons.filter(
    (l) => progress.get(`${stage.stageSlug}/${l.slug}`)?.status === 'mastered',
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="课程学习"
        title="课程内容"
        description="每节包含：直觉解释、严谨定义、核心公式、与 AI 算法开发的联系、可运行代码、常见错误、面试考点。读完直接做题检验。"
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              className="field w-[240px] pl-9"
              placeholder="搜索全部知识点…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      />

      {globalMatches.length ? (
        <div className="card mb-5 p-4">
          <div className="section-title mb-2.5">全局搜索结果</div>
          <div className="flex flex-wrap gap-2">
            {globalMatches.map(({ stage: s, lesson }) => (
              <Link
                key={`${s.stageSlug}/${lesson.slug}`}
                to={`/learn/${s.stageSlug}/${lesson.slug}`}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:border-brand-500/40 hover:text-brand-300"
              >
                {s.stageEmoji} {lesson.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {STAGES.map((s) => {
          const p = progress;
          const done = s.lessons.filter((l) => p.get(`${s.stageSlug}/${l.slug}`)?.status === 'mastered').length;
          return (
            <button
              key={s.stageSlug}
              type="button"
              onClick={() => setParams({ stage: s.stageSlug })}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${
                s.stageSlug === stage.stageSlug
                  ? 'border-brand-500/50 bg-brand-500/10 text-brand-200'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{s.stageEmoji}</span>
                <span className="font-medium">{s.stageTitle}</span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                {done}/{s.lessons.length}
              </div>
            </button>
          );
        })}
      </div>

      <div className="card mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              阶段 {stage.stage} · {stage.category}
            </div>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-100">
              <span>{stage.stageEmoji}</span>
              {stage.stageTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{stage.stageDesc}</p>
          </div>
          <div className="w-full max-w-[220px]">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
              <span>阶段进度</span>
              <span className="font-mono">
                {stageDone}/{stage.lessons.length}
              </span>
            </div>
            <ProgressBar percent={stage.lessons.length ? (stageDone / stage.lessons.length) * 100 : 0} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {modules.map((module) => (
          <section key={module}>
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <span className="h-1 w-1 rounded-full bg-brand-500" />
              {module}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {lessons
                .filter((l) => l.module === module)
                .map((lesson) => {
                  const row = progress.get(`${stage.stageSlug}/${lesson.slug}`);
                  const status = row?.status ?? 'not-started';
                  return (
                    <div key={lesson.slug} className="card card-hover flex flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/learn/${stage.stageSlug}/${lesson.slug}`}
                          className="min-w-0 flex-1 text-sm font-medium text-slate-100 hover:text-brand-300"
                        >
                          {lesson.order}. {lesson.title}
                        </Link>
                        <StatusChip status={status} />
                      </div>
                      <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-400">{lesson.summary}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <DifficultyChip difficulty={lesson.difficulty} />
                          <span className="text-[11px] text-slate-500">{lesson.estimatedMinutes} 分钟</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            className="btn-quiet !px-2 !py-1 text-xs"
                            to={`/learn/${stage.stageSlug}/${lesson.slug}`}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            学
                          </Link>
                          <Link
                            className="btn-quiet !px-2 !py-1 text-xs"
                            to={`/practice/${stage.stageSlug}/${lesson.slug}`}
                          >
                            <Target className="h-3.5 w-3.5" />
                            练
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
        {!lessons.length ? (
          <div className="card px-4 py-10 text-center text-sm text-slate-500">该阶段没有匹配的知识点。</div>
        ) : null}
      </div>
    </>
  );
}
