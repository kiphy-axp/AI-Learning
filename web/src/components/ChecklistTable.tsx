import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DifficultyChip, StatusChip } from './ui';
import { STAGES, STATUS_LABEL, TRACK_LABEL, TRACK_STYLE } from '../lib/content';
import { useStore } from '../lib/store';

const STATUS_OPTIONS = ['not-started', 'learning', 'review', 'mastered'] as const;

/** 列表视图：沿用原「知识点清单」的批量筛选与状态编辑能力 */
export function ChecklistTable({
  initialStage = 'all',
  trackFilter = 'all',
}: {
  initialStage?: string;
  trackFilter?: 'all' | 'main' | 'side';
}) {
  const { progress, setStatus, bookmarks } = useStore();
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [trackLocal, setTrackLocal] = useState<'all' | 'main' | 'side'>('all');
  const [query, setQuery] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const rows = useMemo(
    () =>
      STAGES.filter((s) => stageFilter === 'all' || s.stageSlug === stageFilter).flatMap((stage) =>
        stage.lessons.map((lesson) => {
          const row = progress.get(`${stage.stageSlug}/${lesson.slug}`);
          return {
            stage,
            lesson,
            status: row?.status ?? 'not-started',
            accuracy: row?.question_count ? Math.round((row.correct_count / row.question_count) * 100) : null,
            key: `${stage.stageSlug}/${lesson.slug}`,
          };
        }),
      ),
    [progress, stageFilter],
  );

  const effectiveTrack = trackFilter !== 'all' ? trackFilter : trackLocal;

  const filtered = rows.filter((row) => {
    if (effectiveTrack !== 'all' && row.lesson.track !== effectiveTrack) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (difficultyFilter !== 'all' && row.lesson.difficulty !== difficultyFilter) return false;
    if (onlyBookmarked && !bookmarks.has(row.key)) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const haystack = `${row.lesson.title} ${row.lesson.summary} ${row.stage.stageTitle} ${row.lesson.module}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const counts = STATUS_OPTIONS.map((status) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
  }));

  return (
    <>
      <div className="card mb-4 flex flex-wrap items-center gap-2.5 p-3.5">
        <input
          className="field max-w-[240px]"
          placeholder="搜索知识点、模块…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="field max-w-[180px]" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">全部阶段</option>
          {STAGES.map((s) => (
            <option key={s.stageSlug} value={s.stageSlug}>
              {s.stage} · {s.stageTitle}
            </option>
          ))}
        </select>
        <select className="field max-w-[150px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">全部状态</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="field max-w-[130px]"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="all">全部难度</option>
          <option value="基础">基础</option>
          <option value="进阶">进阶</option>
          <option value="高阶">高阶</option>
        </select>
        {trackFilter === 'all' ? (
          <select
            className="field max-w-[120px]"
            value={trackLocal}
            onChange={(e) => setTrackLocal(e.target.value as 'all' | 'main' | 'side')}
          >
            <option value="all">主线 + 支线</option>
            <option value="main">只看主线</option>
            <option value="side">只看支线</option>
          </select>
        ) : null}
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-sky-500"
            checked={onlyBookmarked}
            onChange={(e) => setOnlyBookmarked(e.target.checked)}
          />
          只看收藏
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {counts.map(({ status, count }) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <StatusChip status={status} />
              <span className="font-mono text-slate-400">{count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">知识点</th>
              <th className="hidden px-3 py-2.5 text-left font-medium md:table-cell">模块</th>
              <th className="hidden px-3 py-2.5 text-left font-medium sm:table-cell">难度</th>
              <th className="hidden px-3 py-2.5 text-left font-medium xl:table-cell">主线</th>
              <th className="hidden px-3 py-2.5 text-left font-medium lg:table-cell">正确率</th>
              <th className="px-3 py-2.5 text-left font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ stage, lesson, status, accuracy, key }) => (
              <tr key={key} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <Link to={`/learn/${stage.stageSlug}/${lesson.slug}`} className="group block min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">{stage.stageEmoji}</span>
                      <span className="truncate text-slate-200 group-hover:text-brand-300">{lesson.title}</span>
                    </div>
                    <div className="truncate text-[11px] text-slate-500">{stage.stageTitle}</div>
                  </Link>
                </td>
                <td className="hidden px-3 py-2.5 text-xs text-slate-400 md:table-cell">{lesson.module}</td>
                <td className="hidden px-3 py-2.5 sm:table-cell">
                  <DifficultyChip difficulty={lesson.difficulty} />
                </td>
                <td className="hidden px-3 py-2.5 xl:table-cell">
                  <span className={`chip ${TRACK_STYLE[lesson.track]}`}>{TRACK_LABEL[lesson.track]}</span>
                </td>
                <td className="hidden px-3 py-2.5 font-mono text-xs lg:table-cell">
                  {accuracy === null ? (
                    <span className="text-slate-600">—</span>
                  ) : (
                    <span className={accuracy >= 70 ? 'text-emerald-300' : 'text-rose-300'}>{accuracy}%</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <select
                    className="rounded-lg border border-white/10 bg-ink-900/80 px-2 py-1 text-xs text-slate-300 outline-none focus:border-brand-500/60"
                    value={status}
                    onChange={(e) => void setStatus(lesson.slug, stage.stageSlug, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">没有符合条件的知识点，试试放宽筛选。</div>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        共 {filtered.length} / {rows.length} 个知识点
      </p>
    </>
  );
}
