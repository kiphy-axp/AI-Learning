import { Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, ProgressBar, StatusChip } from '../components/ui';
import { STAGES } from '../lib/content';
import { useStore } from '../lib/store';

export function Practice() {
  const { progress } = useStore();

  return (
    <>
      <PageHeader
        eyebrow="练习测验"
        title="做题才算学会"
        description="每节 3 道题：选择题、简答题、编程题。答完立即给出解析与参考答案，答错的知识点会自动进入错题本和薄弱清单。"
      />

      <div className="space-y-7">
        {STAGES.map((stage) => {
          const rows = stage.lessons.map((lesson) => {
            const row = progress.get(`${stage.stageSlug}/${lesson.slug}`);
            return {
              lesson,
              accuracy: row?.question_count ? Math.round((row.correct_count / row.question_count) * 100) : null,
              answered: row?.question_count ?? 0,
              status: row?.status ?? 'not-started',
            };
          });
          const answeredCount = rows.filter((r) => r.answered > 0).length;
          return (
            <section key={stage.stageSlug}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <span>{stage.stageEmoji}</span>
                  {stage.stageTitle}
                  <span className="text-[11px] font-normal text-slate-500">
                    {answeredCount}/{rows.length} 已练
                  </span>
                </h2>
                <div className="w-32">
                  <ProgressBar percent={rows.length ? (answeredCount / rows.length) * 100 : 0} />
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {rows.map(({ lesson, accuracy, status }) => (
                  <Link
                    key={lesson.slug}
                    to={`/practice/${stage.stageSlug}/${lesson.slug}`}
                    className="card card-hover flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-200">{lesson.title}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusChip status={status} />
                        {accuracy !== null ? (
                          <span className={`font-mono text-[11px] ${accuracy >= 70 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {accuracy}%
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">未作答</span>
                        )}
                      </div>
                    </div>
                    <Target className="h-4 w-4 shrink-0 text-slate-500" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
