import { List, Map as MapIcon, Search, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChecklistTable } from '../components/ChecklistTable';
import { KIND_STYLE, SpireStage, useStageMaps } from '../components/SpireMap';
import { Chip, PageHeader } from '../components/ui';
import { ACT_META, ACTS, LESSON_ORDER, STAGES, TOTALS } from '../lib/content';
import { useStore } from '../lib/store';

const LEGEND_KINDS = ['start', 'battle', 'elite', 'unknown', 'rest', 'boss'] as const;
const TRACK_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'main', label: '主线' },
  { id: 'side', label: '支线' },
] as const;

export function Roadmap() {
  const { progress, stats } = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const stageParam = params.get('stage') ?? '';
  const view: 'map' | 'list' = params.get('view') === 'list' ? 'list' : 'map';
  const trackFilter = (params.get('track') as 'all' | 'main' | 'side') ?? 'all';

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  /** 当前位置：优先取显式标记「学习中」的知识点，否则取主线里第一个还没掌握的 */
  const currentKey = useMemo(() => {
    const learning = LESSON_ORDER.find(
      ({ stage, lesson }) => progress.get(`${stage.stageSlug}/${lesson.slug}`)?.status === 'learning',
    );
    const target =
      learning ??
      LESSON_ORDER.find(
        ({ stage, lesson }) =>
          lesson.track === 'main' && progress.get(`${stage.stageSlug}/${lesson.slug}`)?.status !== 'mastered',
      );
    return target ? `${target.stage.stageSlug}/${target.lesson.slug}` : null;
  }, [progress]);

  const maps = useStageMaps(STAGES, progress, currentKey);

  useEffect(() => {
    if (!stageParam) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`stage-${stageParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [stageParam]);

  const currentRef = currentKey
    ? LESSON_ORDER.find((r) => `${r.stage.stageSlug}/${r.lesson.slug}` === currentKey)
    : undefined;

  const mainPercent = TOTALS.main
    ? Math.round(
        (LESSON_ORDER.filter(
          ({ stage, lesson }) =>
            lesson.track === 'main' && progress.get(`${stage.stageSlug}/${lesson.slug}`)?.status === 'mastered',
        ).length /
          TOTALS.main) *
          100,
      )
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="学习路线"
        title="闯关地图"
        description={`${TOTALS.acts} 幕 ${TOTALS.stages} 个阶段、${TOTALS.lessons} 个知识点铺成一张地图：从零基础起步，顺着节点往下走。主线 ${TOTALS.main} 节（打地基到能独立训练模型），支线 ${TOTALS.side} 节（面向算法岗的专项深化）。节点图标代表难度，外圈代表掌握状态，虚线是还没走通的路。`}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                className="field w-[200px] pl-9"
                placeholder="在地图上找知识点…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  patchParams({ view: null });
                }}
              />
            </div>
            <div className="flex overflow-hidden rounded-xl border border-white/10">
              {TRACK_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => patchParams({ track: id === 'all' ? null : id })}
                  className={`px-3 py-2 text-sm transition ${
                    trackFilter === id
                      ? 'bg-brand-500/15 text-brand-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex overflow-hidden rounded-xl border border-white/10">
              {[
                { id: 'map' as const, label: '地图', icon: MapIcon },
                { id: 'list' as const, label: '列表', icon: List },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => patchParams({ view: id === 'list' ? 'list' : null })}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm transition ${
                    view === id
                      ? 'bg-brand-500/15 text-brand-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </>
        }
      />

      {view === 'list' ? (
        <ChecklistTable initialStage={stageParam || 'all'} trackFilter={trackFilter} />
      ) : (
        <>
          <div className="card mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            <div className="min-w-[160px] flex-1">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                <span>总进度</span>
                <span className="font-mono text-slate-300">{stats.overallPercent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                  style={{ width: `${stats.overallPercent}%` }}
                />
              </div>
            </div>

            <div className="min-w-[160px] flex-1">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                <span>主线进度</span>
                <span className="font-mono text-slate-300">{mainPercent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-brand-400 transition-all"
                  style={{ width: `${mainPercent}%` }}
                />
              </div>
            </div>

            {currentRef ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">当前位置</span>
                <Link
                  to={`/learn/${currentRef.stage.stageSlug}/${currentRef.lesson.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/12 px-2.5 py-1 text-brand-300 ring-1 ring-inset ring-brand-500/25 hover:bg-brand-500/20"
                >
                  {currentRef.stage.stageEmoji} {currentRef.lesson.title}
                </Link>
              </div>
            ) : (
              <div className="text-xs text-emerald-300">主线已全部通关 🎉</div>
            )}

            <Link className="btn-primary !py-1.5 text-xs" to="/practice">
              <Target className="h-3.5 w-3.5" />
              去练习
            </Link>
          </div>

          <div className="card mb-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 p-3.5 text-[11px] text-slate-400">
            <span className="text-slate-500">节点</span>
            {LEGEND_KINDS.map((kind) => {
              const style = KIND_STYLE[kind];
              const Icon = style.icon;
              return (
                <span key={kind} className="inline-flex items-center gap-1.5" title={style.hint}>
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full bg-gradient-to-b ${style.bg} ring-1 ${style.ring}`}
                  >
                    <Icon className="h-3 w-3 text-slate-100" />
                  </span>
                  {style.label}
                </span>
              );
            })}
            <span className="ml-2 text-slate-500">状态</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-600 opacity-50" />
              未开始
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-brand-400" />
              学习中
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              待复习
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              已掌握
            </span>
            {trackFilter !== 'all' ? (
              <span className="text-brand-300">
                · 已按「{trackFilter === 'main' ? '主线' : '支线'}」淡化其他节点
              </span>
            ) : null}
          </div>

          {/* 阶段跳转栏：地图很长，吸顶方便直接跳转 */}
          <div className="sticky top-0 z-20 -mx-2 mb-5 flex gap-1.5 overflow-x-auto bg-ink-950/85 px-2 py-2 backdrop-blur">
            {STAGES.map((stage) => {
              const sp = stats.stageProgress.get(stage.stageSlug);
              const done = sp?.done ?? 0;
              const percent = sp?.percent ?? 0;
              const meta = ACT_META[stage.act];
              return (
                <button
                  key={stage.stageSlug}
                  type="button"
                  onClick={() =>
                    document.getElementById(`stage-${stage.stageSlug}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                  }
                  className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-left text-[11px] transition ${
                    stageParam === stage.stageSlug
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                  title={`第${stage.act}幕 ${stage.stageTitle} — ${done}/${stage.lessons.length} 已掌握`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{stage.stageEmoji}</span>
                    <span className="font-mono">{stage.stage}</span>
                    <span className="max-w-[92px] truncate">{stage.stageTitle}</span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{ width: `${percent}%`, background: meta?.accent ?? '#38bdf8' }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-10">
            {ACTS.map((actInfo) => {
              const meta = ACT_META[actInfo.act];
              const actDone = actInfo.stages.reduce(
                (sum, s) => sum + (stats.stageProgress.get(s.stageSlug)?.done ?? 0),
                0,
              );

              return (
                <section
                  key={actInfo.act}
                  className="relative overflow-hidden rounded-3xl border border-white/8 px-4 py-6 lg:px-6"
                >
                  <div className="spire-board pointer-events-none absolute inset-0" />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(900px 420px at 50% -5%, ${meta?.accent ?? '#38bdf8'}14, transparent 70%)`,
                    }}
                  />
                  <div className="relative">
                    <header className="mb-5 flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span
                            className="h-6 w-1.5 rounded-full"
                            style={{ background: meta?.accent, boxShadow: `0 0 14px ${meta?.accent}` }}
                          />
                          <h2 className="text-lg font-semibold tracking-tight text-slate-100">{actInfo.actName}</h2>
                          <Chip className="bg-white/5 text-slate-400 ring-white/10">
                            {actInfo.stages.length} 个阶段 · {actInfo.lessons} 节 · 约{' '}
                            {Math.round(actInfo.minutes / 60)} 小时
                          </Chip>
                          <Chip className="bg-brand-500/12 text-brand-300 ring-brand-500/30">
                            主线 {actInfo.mainLessons}
                          </Chip>
                          {actInfo.sideLessons ? (
                            <Chip className="bg-white/5 text-slate-400 ring-white/10">支线 {actInfo.sideLessons}</Chip>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                          {meta?.desc ?? actInfo.stages[0]?.stageDesc}
                        </p>
                      </div>
                      <div className="w-40">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
                          <span>本幕进度</span>
                          <span className="font-mono text-slate-300">
                            {actDone}/{actInfo.lessons}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${actInfo.lessons ? (actDone / actInfo.lessons) * 100 : 0}%`,
                              background: meta?.accent,
                            }}
                          />
                        </div>
                      </div>
                    </header>

                    <div className="space-y-8">
                      {actInfo.stages.map((stage) => {
                        const map = maps.find((m) => m.stage.stageSlug === stage.stageSlug);
                        if (!map) return null;
                        const sp = stats.stageProgress.get(stage.stageSlug) ?? {
                          done: 0,
                          total: stage.lessons.length,
                          percent: 0,
                        };
                        return (
                          <div
                            key={stage.stageSlug}
                            id={`stage-${stage.stageSlug}`}
                            className={`scroll-mt-6 rounded-2xl transition ${
                              stageParam === stage.stageSlug ? 'ring-1 ring-brand-500/40' : ''
                            }`}
                          >
                            <SpireStage
                              map={map}
                              accent={meta?.accent ?? '#38bdf8'}
                              query={query}
                              stageProgress={sp}
                              trackFilter={trackFilter}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-500">
            七幕按「起步 → 编程入门 → 计算机科学基础 → 数学 → 数据与经典机器学习 → 深度学习与大模型 → 算法岗进阶」推进。
            建议先把主线走完，再按目标岗位补支线；点击任意节点进入该知识点的讲义。
          </p>
        </>
      )}
    </>
  );
}
