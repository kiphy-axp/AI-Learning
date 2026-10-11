import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Clock,
  Flame,
  Play,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHeader, ProgressBar, StatTile, formatDuration } from '../components/ui';
import { LESSON_ORDER, STAGES, STATUS_LABEL, TOTALS } from '../lib/content';
import { useStore } from '../lib/store';

export function Dashboard() {
  const { stats, progress, weakLessons, wrongQuestions, bookmarks } = useStore();

  const nextLesson = LESSON_ORDER.find(({ stage, lesson }) => {
    const status = progress.get(`${stage.stageSlug}/${lesson.slug}`)?.status;
    return status !== 'mastered';
  });
  const continueLesson =
    LESSON_ORDER.find(({ stage, lesson }) => progress.get(`${stage.stageSlug}/${lesson.slug}`)?.status === 'learning') ??
    nextLesson;

  const reviewDue = LESSON_ORDER.filter(
    ({ stage, lesson }) => progress.get(`${stage.stageSlug}/${lesson.slug}`)?.status === 'review',
  ).slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="总览"
        title="今天学哪一节？"
        description={`共 ${TOTALS.stages} 个阶段、${TOTALS.lessons} 个知识点、${TOTALS.quizzes} 道练习题，预计 ${Math.round(
          TOTALS.minutes / 60,
        )} 小时走完一轮。全部数据只存在你本机的 data/learning.db。`}
        actions={
          continueLesson ? (
            <Link
              className="btn-primary"
              to={`/learn/${continueLesson.stage.stageSlug}/${continueLesson.lesson.slug}`}
            >
              <Play className="h-4 w-4" />
              继续学习
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="总进度" value={`${stats.overallPercent}%`} tone="brand" hint={`${stats.mastered} 节已掌握`} />
        <StatTile label="学习中" value={stats.learning} hint="含待复习" />
        <StatTile label="累计时长" value={formatDuration(stats.totalSeconds)} hint={`今日 ${formatDuration(stats.todaySeconds)}`} />
        <StatTile label="连续学习" value={`${stats.streak} 天`} tone="amber" hint="每天满 1 分钟即计入" />
        <StatTile label="答题正确率" value={`${stats.accuracy}%`} tone="emerald" hint={`错题 ${wrongQuestions.length} 道`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-2xl" />
          {continueLesson ? (
            <>
              <div className="section-title mb-2">下一步建议</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{continueLesson.stage.stageEmoji}</span>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">
                    阶段 {continueLesson.stage.stage} · {continueLesson.stage.stageTitle} · {continueLesson.lesson.module}
                  </div>
                  <h2 className="truncate text-lg font-semibold text-slate-100">{continueLesson.lesson.title}</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{continueLesson.lesson.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="btn-primary"
                  to={`/learn/${continueLesson.stage.stageSlug}/${continueLesson.lesson.slug}`}
                >
                  <BookOpenCheck className="h-4 w-4" />
                  开始这一节
                </Link>
                <Link
                  className="btn-ghost"
                  to={`/practice/${continueLesson.stage.stageSlug}/${continueLesson.lesson.slug}`}
                >
                  <Target className="h-4 w-4" />
                  直接做题
                </Link>
              </div>
            </>
          ) : (
            <EmptyState title="全部知识点已掌握 🎉" hint="可以去「面试考点」页做一轮集中复习，或进入实战项目巩固。" />
          )}
        </Card>

        <Card>
          <div className="section-title mb-3">阶段进度</div>
          <div className="space-y-2.5">
            {STAGES.slice(0, 8).map((stage) => {
              const p = stats.stageProgress.get(stage.stageSlug) ?? { done: 0, total: stage.lessons.length, percent: 0 };
              return (
                <Link key={stage.stageSlug} to={`/roadmap?stage=${stage.stageSlug}`} className="block group">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-slate-400 group-hover:text-slate-200">
                      {stage.stageEmoji} {stage.stageTitle}
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-slate-500">
                      {p.done}/{p.total}
                    </span>
                  </div>
                  <ProgressBar percent={p.percent} className="mt-1.5" />
                </Link>
              );
            })}
            <Link to="/roadmap" className="mt-1 inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
              查看全部 {STAGES.length} 个阶段 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="section-title mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> 薄弱知识点
          </div>
          {weakLessons.length ? (
            <ul className="space-y-2.5">
              {weakLessons.map((item) => {
                const ref = LESSON_ORDER.find(
                  (r) => r.stage.stageSlug === item.stageSlug && r.lesson.slug === item.lessonSlug,
                );
                if (!ref) return null;
                return (
                  <li key={item.lessonSlug}>
                    <Link
                      to={`/practice/${item.stageSlug}/${item.lessonSlug}`}
                      className="flex items-center justify-between gap-2 text-sm text-slate-300 hover:text-brand-300"
                    >
                      <span className="truncate">{ref.lesson.title}</span>
                      <span className="shrink-0 font-mono text-xs text-rose-300">{item.accuracy}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              还没有足够数据。做完每节的 3 道题后，正确率低于 70% 的知识点会自动出现在这里。
            </p>
          )}
        </Card>

        <Card>
          <div className="section-title mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> 待复习
          </div>
          {reviewDue.length ? (
            <ul className="space-y-2.5">
              {reviewDue.map(({ stage, lesson }) => (
                <li key={lesson.slug}>
                  <Link
                    to={`/learn/${stage.stageSlug}/${lesson.slug}`}
                    className="flex items-center justify-between gap-2 text-sm text-slate-300 hover:text-brand-300"
                  >
                    <span className="truncate">{lesson.title}</span>
                    <span className="shrink-0 text-xs text-amber-300">{STATUS_LABEL.review}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              在课程页把知识点标成「待复习」，这里就会提醒你回来复习。
            </p>
          )}
          {bookmarks.size ? (
            <div className="mt-3 border-t border-white/8 pt-2.5 text-xs text-slate-500">
              已收藏 <span className="font-mono text-slate-300">{bookmarks.size}</span> 个知识点
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="section-title mb-3 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" /> 求职视角
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            面向 AI 算法开发岗，优先把
            <span className="text-slate-200"> 算法岗核心 </span>
            类别的阶段吃透：
          </p>
          <ul className="mt-3 space-y-2">
            {STAGES.filter((s) => s.category === '算法岗核心').map((stage) => (
              <li key={stage.stageSlug}>
                <Link
                  to={`/roadmap?stage=${stage.stageSlug}`}
                  className="flex items-center gap-2 text-sm text-slate-300 hover:text-brand-300"
                >
                  <span>{stage.stageEmoji}</span>
                  <span className="truncate">{stage.stageTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/interview" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
            <Brain className="h-3.5 w-3.5" /> 打开面试考点总览
          </Link>
        </Card>
      </div>
    </>
  );
}
