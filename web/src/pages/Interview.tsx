import { Brain, RefreshCw, Search, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, PageHeader } from '../components/ui';
import { STAGES, allInterviewPoints } from '../lib/content';
import { useStore } from '../lib/store';

type Drill = { stageSlug: string; lessonSlug: string; lessonTitle: string; point: string };

export function Interview() {
  const { progress } = useStore();
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [onlyCore, setOnlyCore] = useState(true);
  const [drill, setDrill] = useState<Drill | null>(null);

  const all = useMemo(() => allInterviewPoints(), []);

  const filtered = useMemo(
    () =>
      all.filter(({ ref, point }) => {
        if (onlyCore && ref.stage.category !== '算法岗核心') return false;
        if (stageFilter !== 'all' && ref.stage.stageSlug !== stageFilter) return false;
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          if (!`${point} ${ref.lesson.title} ${ref.lesson.summary}`.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [all, onlyCore, query, stageFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { stageSlug: string; stageTitle: string; stageEmoji: string; items: Drill[] }>();
    for (const { ref, point } of filtered) {
      const entry =
        map.get(ref.stage.stageSlug) ??
        {
          stageSlug: ref.stage.stageSlug,
          stageTitle: ref.stage.stageTitle,
          stageEmoji: ref.stage.stageEmoji,
          items: [] as Drill[],
        };
      entry.items.push({
        stageSlug: ref.stage.stageSlug,
        lessonSlug: ref.lesson.slug,
        lessonTitle: ref.lesson.title,
        point,
      });
      map.set(ref.stage.stageSlug, entry);
    }
    return [...map.values()];
  }, [filtered]);

  const roll = () => {
    if (!filtered.length) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setDrill({
      stageSlug: pick.ref.stage.stageSlug,
      lessonSlug: pick.ref.lesson.slug,
      lessonTitle: pick.ref.lesson.title,
      point: pick.point,
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="面试考点"
        title={`${all.length} 条面试考点`}
        description="把每节的面试考点抽出来集中复习。建议用法：先自己口头回答一遍，再点进原节对照讲解；答不上来的直接标记待复习。"
        actions={
          <button type="button" className="btn-primary" onClick={roll}>
            <Shuffle className="h-4 w-4" />
            随机抽一题
          </button>
        }
      />

      {drill ? (
        <div className="card mb-4 border-brand-500/30 p-5">
          <div className="section-title mb-2">模拟面试 · 请先口头回答</div>
          <p className="text-base leading-relaxed text-slate-100">{drill.point}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link className="btn-ghost" to={`/learn/${drill.stageSlug}/${drill.lessonSlug}`}>
              去「{drill.lessonTitle}」复习
            </Link>
            <button type="button" className="btn-ghost" onClick={roll}>
              <RefreshCw className="h-4 w-4" />
              换一题
            </button>
            <button type="button" className="btn-quiet" onClick={() => setDrill(null)}>
              收起
            </button>
          </div>
        </div>
      ) : null}

      <div className="card mb-4 flex flex-wrap items-center gap-2.5 p-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            className="field w-[240px] pl-9"
            placeholder="搜索考点…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="field max-w-[200px]" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">全部阶段</option>
          {STAGES.map((s) => (
            <option key={s.stageSlug} value={s.stageSlug}>
              {s.stage} · {s.stageTitle}
            </option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-sky-500"
            checked={onlyCore}
            onChange={(e) => setOnlyCore(e.target.checked)}
          />
          只看「算法岗核心」
        </label>
        <span className="ml-auto text-[11px] text-slate-500">共 {filtered.length} 条</span>
      </div>

      <div className="space-y-5">
        {grouped.map(({ stageSlug, stageTitle, stageEmoji, items }) => (
          <section key={stageSlug}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-lg">{stageEmoji}</span>
              <h2 className="text-sm font-semibold text-slate-200">{stageTitle}</h2>
              <Chip className="bg-white/5 text-slate-400 ring-white/10">{items.length} 条</Chip>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => {
                const row = progress.get(`${item.stageSlug}/${item.lessonSlug}`);
                return (
                  <div key={`${item.lessonSlug}-${i}`} className="card flex items-start gap-3 px-4 py-3">
                    <Brain className="mt-0.5 h-4 w-4 shrink-0 text-brand-400/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-slate-300">{item.point}</p>
                      <Link
                        to={`/learn/${item.stageSlug}/${item.lessonSlug}`}
                        className="mt-1 inline-block text-[11px] text-slate-500 hover:text-brand-300"
                      >
                        {item.lessonTitle}
                        {row?.status === 'mastered' ? ' · 已掌握' : ''}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {!grouped.length ? (
          <div className="card px-4 py-10 text-center text-sm text-slate-500">
            没有匹配的考点。关掉「只看算法岗核心」可以看到全部阶段的考点。
          </div>
        ) : null}
      </div>
    </>
  );
}
