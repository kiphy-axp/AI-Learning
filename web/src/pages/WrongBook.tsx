import { BookMarked, RotateCcw, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageHeader, StatTile } from '../components/ui';
import { LESSON_ORDER } from '../lib/content';
import { useStore } from '../lib/store';
import type { QuizQuestion } from '../lib/types';

export function WrongBook() {
  const { wrongQuestions, attempts, stats } = useStore();

  const questionMap = useMemo(() => {
    const map = new Map<string, { question: QuizQuestion; stageSlug: string; lessonSlug: string; title: string }>();
    for (const { stage, lesson } of LESSON_ORDER) {
      for (const question of lesson.quiz ?? []) {
        map.set(question.id, {
          question,
          stageSlug: stage.stageSlug,
          lessonSlug: lesson.slug,
          title: lesson.title,
        });
      }
    }
    return map;
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof wrongQuestions>();
    for (const item of wrongQuestions) {
      const list = map.get(item.lessonSlug) ?? [];
      list.push(item);
      map.set(item.lessonSlug, list);
    }
    return [...map.entries()];
  }, [wrongQuestions]);

  return (
    <>
      <PageHeader
        eyebrow="错题本"
        title="错过的题，就是该补的洞"
        description="这里汇总最近一次答错、且还没答对的题目。建议隔天重做一遍：点「重做本节」回到练习页。"
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="未订正错题" value={wrongQuestions.length} tone="amber" />
        <StatTile label="累计答题" value={attempts.length} />
        <StatTile label="总正确率" value={`${stats.accuracy}%`} tone="emerald" />
        <StatTile label="已掌握知识点" value={stats.mastered} tone="brand" />
      </div>

      {grouped.length ? (
        <div className="space-y-4">
          {grouped.map(([lessonSlug, items]) => {
            const first = questionMap.get(items[0].questionId);
            if (!first) return null;
            return (
              <section key={lessonSlug} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-slate-100">{first.title}</h2>
                    <span className="text-[11px] text-slate-500">{items.length} 道待订正</span>
                  </div>
                  <div className="flex gap-2">
                    <Link className="btn-ghost !py-1.5 text-xs" to={`/learn/${first.stageSlug}/${first.lessonSlug}`}>
                      回看讲解
                    </Link>
                    <Link className="btn-primary !py-1.5 text-xs" to={`/practice/${first.stageSlug}/${first.lessonSlug}`}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      重做本节
                    </Link>
                  </div>
                </div>

                <ul className="mt-3.5 space-y-3">
                  {items.map((item) => {
                    const entry = questionMap.get(item.questionId);
                    if (!entry) return null;
                    return (
                      <li key={item.questionId} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-relaxed text-slate-300">{entry.question.prompt}</p>
                          <span className="chip shrink-0 bg-rose-500/12 text-rose-300 ring-rose-500/30">
                            错 {item.attempts} 次
                          </span>
                        </div>
                        {entry.question.type === 'choice' ? (
                          <div className="mt-2.5 text-xs text-emerald-300">
                            正确答案：{entry.question.options[entry.question.answerIndex]}
                          </div>
                        ) : null}
                        {entry.question.type === 'short' ? (
                          <div className="mt-2.5 text-xs leading-relaxed text-slate-400">
                            关键词：{entry.question.keywords.join('、')}
                          </div>
                        ) : null}
                        {item.lastAnswer ? (
                          <div className="mt-2 text-[11px] text-slate-500">
                            你上次的答案：{item.lastAnswer.slice(0, 120)}
                            {item.lastAnswer.length > 120 ? '…' : ''}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="目前没有未订正的错题"
          hint="做完练习后，答错的题会自动出现在这里。答对同一道题后会自动移出。"
          action={
            <Link className="btn-primary" to="/practice">
              <Target className="h-4 w-4" />
              去做练习
            </Link>
          }
        />
      )}
    </>
  );
}
