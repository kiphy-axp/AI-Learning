import { CalendarClock, Check, Flag, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACTS, ACT_META, LESSON_ORDER, TOTALS } from '../lib/content';
import { useStore } from '../lib/store';

const HOUR_OPTIONS = [4, 6, 10, 14, 21];

function keyOf(stageSlug: string, lessonSlug: string) {
  return `${stageSlug}/${lessonSlug}`;
}

function addWeeks(weeks: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(0, weeks) * 7);
  return date;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/**
 * 学习计划：按每周可投入小时数，把主线剩余内容换算成时间与里程碑。
 * 支线不计入预计完成时间——先把主线走完，再按目标岗位补支线。
 */
export function StudyPlanCard() {
  const { plan, saveSettings, progress } = useStore();
  const [saving, setSaving] = useState(false);

  const weeklyHours = plan.weeklyHours || 6;

  const model = useMemo(() => {
    const mainRefs = LESSON_ORDER.filter((r) => r.lesson.track === 'main');
    const isMastered = (stageSlug: string, lessonSlug: string) =>
      progress.get(keyOf(stageSlug, lessonSlug))?.status === 'mastered';

    const remaining = mainRefs.filter((r) => !isMastered(r.stage.stageSlug, r.lesson.slug));
    const remainingMinutes = remaining.reduce((sum, r) => sum + (r.lesson.estimatedMinutes || 25), 0);
    const remainingHours = remainingMinutes / 60;
    const weeksLeft = Math.ceil(remainingHours / weeklyHours);

    const doneMainHours =
      mainRefs
        .filter((r) => isMastered(r.stage.stageSlug, r.lesson.slug))
        .reduce((sum, r) => sum + (r.lesson.estimatedMinutes || 25), 0) / 60;

    // 每幕的累计剩余小时 → 预计完成日期
    let cumulativeHours = 0;
    const milestones = ACTS.map((actInfo) => {
      const actMain = actInfo.stages.flatMap((stage) =>
        stage.lessons
          .filter((lesson) => lesson.track === 'main')
          .map((lesson) => ({ stage, lesson })),
      );
      const actRemaining = actMain.filter((r) => !isMastered(r.stage.stageSlug, r.lesson.slug));
      const actRemainingHours =
        actRemaining.reduce((sum, r) => sum + (r.lesson.estimatedMinutes || 25), 0) / 60;
      cumulativeHours += actRemainingHours;
      const done = actMain.length - actRemaining.length;
      return {
        act: actInfo.act,
        name: actInfo.actName,
        accent: ACT_META[actInfo.act]?.accent ?? '#38bdf8',
        total: actMain.length,
        done,
        remainingHours: actRemainingHours,
        finish: addWeeks(Math.ceil(cumulativeHours / weeklyHours)),
        // 整幕都是支线时不算"已完成"，只提示按需补
        hasMain: actMain.length > 0,
        complete: actMain.length > 0 && actRemaining.length === 0,
      };
    });

    // 本周该学：按顺序凑够一周的量
    const weekTargetMinutes = weeklyHours * 60;
    const thisWeek: typeof remaining = [];
    let acc = 0;
    for (const ref of remaining) {
      if (acc >= weekTargetMinutes || thisWeek.length >= 6) break;
      thisWeek.push(ref);
      acc += ref.lesson.estimatedMinutes || 25;
    }

    // 计划执行情况（需要开始日期才有意义）
    let pace: { weeks: number; expected: number; actual: number; delta: number } | null = null;
    if (plan.startDate) {
      const start = new Date(`${plan.startDate}T00:00:00`);
      if (!Number.isNaN(start.getTime())) {
        const weeks = Math.max(0, Math.floor((Date.now() - start.getTime()) / (7 * 24 * 3600 * 1000)));
        const expected = weeks * weeklyHours;
        pace = { weeks, expected, actual: doneMainHours, delta: doneMainHours - expected };
      }
    }

    const sideRemainingHours =
      LESSON_ORDER.filter((r) => r.lesson.track === 'side' && !isMastered(r.stage.stageSlug, r.lesson.slug)).reduce(
        (sum, r) => sum + (r.lesson.estimatedMinutes || 25),
        0,
      ) / 60;

    return { remaining, remainingHours, weeksLeft, milestones, thisWeek, pace, sideRemainingHours, doneMainHours };
  }, [progress, plan.startDate, weeklyHours]);

  const done = TOTALS.main - model.remaining.length;

  return (
    <section className="card relative overflow-hidden p-5">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-500/8 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="section-title mb-1.5 flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> 学习计划
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            {model.remaining.length === 0 ? (
              <span className="text-emerald-300">主线已经全部通关 🎉</span>
            ) : (
              <>
                按每周 <span className="text-brand-300">{weeklyHours}</span> 小时，主线还需{' '}
                <span className="text-brand-300">{Math.ceil(model.remainingHours)}</span> 小时
                <span className="text-slate-400">
                  （约 {model.weeksLeft} 周，预计 {formatDate(addWeeks(model.weeksLeft))} 走完）
                </span>
              </>
            )}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            主线 {TOTALS.main} 节已掌握 {done} 节；支线还有约 {Math.ceil(model.sideRemainingHours)} 小时，
            建议主线走完后再按目标岗位补。
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">每周投入</span>
            {HOUR_OPTIONS.map((hours) => (
              <button
                key={hours}
                type="button"
                disabled={saving}
                onClick={() => {
                  setSaving(true);
                  void saveSettings({ planWeeklyHours: hours }).finally(() => setSaving(false));
                }}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  weeklyHours === hours
                    ? 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-500">
            计划开始日
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-ink-900/80 px-2 py-1 text-xs text-slate-300 outline-none focus:border-brand-500/60"
              value={plan.startDate}
              onChange={(e) => void saveSettings({ planStartDate: e.target.value })}
            />
          </label>
        </div>
      </div>

      {model.pace && model.pace.weeks > 0 ? (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] ring-1 ring-inset ${
            model.pace.delta >= 0
              ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25'
              : 'bg-amber-500/10 text-amber-300 ring-amber-500/25'
          }`}
        >
          {model.pace.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          第 {model.pace.weeks} 周：按计划应学 {Math.round(model.pace.expected)} 小时，实际{' '}
          {model.pace.actual.toFixed(1)} 小时
          {model.pace.delta >= 0 ? `，超前 ${model.pace.delta.toFixed(1)} 小时` : `，落后 ${Math.abs(model.pace.delta).toFixed(1)} 小时`}
        </div>
      ) : null}

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="section-title mb-2.5 flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" /> 里程碑
          </div>
          <ol className="space-y-2">
            {model.milestones.map((milestone) => (
              <li key={milestone.act} className="flex items-center gap-3 text-xs">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-lg font-mono text-[11px]"
                  style={{ background: `${milestone.accent}22`, color: milestone.accent }}
                >
                  {milestone.act}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-300">{milestone.name}</span>
                {!milestone.hasMain ? (
                  <span className="shrink-0 text-slate-500">支线 · 按需</span>
                ) : milestone.complete ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-emerald-300">
                    <Check className="h-3.5 w-3.5" /> 已完成
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-slate-500">
                    {milestone.done}/{milestone.total} · {formatDate(milestone.finish)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="section-title mb-2.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> 这周先学这几节
          </div>
          {model.thisWeek.length ? (
            <ul className="space-y-1.5">
              {model.thisWeek.map(({ stage, lesson }) => (
                <li key={keyOf(stage.stageSlug, lesson.slug)}>
                  <Link
                    to={`/learn/${stage.stageSlug}/${lesson.slug}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 hover:text-brand-300"
                  >
                    <span className="text-slate-500">{stage.stageEmoji}</span>
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {lesson.estimatedMinutes} 分钟
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">主线已完成，去「面试考点」做一轮集中复习吧。</p>
          )}
        </div>
      </div>
    </section>
  );
}
