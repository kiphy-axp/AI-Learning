import { BookOpen, MessageSquareCode } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TutorPanel } from '../components/TutorPanel';
import { PageHeader } from '../components/ui';
import { LESSON_ORDER, STAGES } from '../lib/content';
import { useStore } from '../lib/store';

export function Tutor() {
  const [params, setParams] = useSearchParams();
  const { weakLessons, tutor } = useStore();
  const [stageFilter, setStageFilter] = useState(STAGES[0]?.stageSlug ?? '');

  const selectedKey = params.get('lesson') ?? '';
  const selected = useMemo(
    () => LESSON_ORDER.find((r) => `${r.stage.stageSlug}/${r.lesson.slug}` === selectedKey),
    [selectedKey],
  );

  const stage = STAGES.find((s) => s.stageSlug === (selected?.stage.stageSlug ?? stageFilter)) ?? STAGES[0];

  return (
    <>
      <PageHeader
        eyebrow="AI 导师"
        title="随时提问的本地导师"
        description="先选一个知识点作为上下文，再用不同模式提问：简单解释、深入解释、举例、出练习题、苏格拉底式引导。导师会自动带上本节内容和你的薄弱知识点。"
      />

      {!tutor.hasKey ? (
        <div className="card mb-4 border-amber-500/25 p-4 text-sm text-amber-200">
          当前是<strong>离线讲解模式</strong>：导师会基于课程内容拼装回答。想获得更灵活的回答，去
          <Link to="/settings" className="mx-1 underline decoration-amber-400/50 underline-offset-2">
            设置
          </Link>
          填入任意 OpenAI 兼容接口（DeepSeek / OpenRouter / 本地 Ollama 均可）。
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="card flex max-h-[70vh] flex-col overflow-hidden">
          <div className="border-b border-white/8 px-4 py-3">
            <div className="section-title mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              选择上下文知识点
            </div>
            <select className="field" value={stage?.stageSlug} onChange={(e) => setStageFilter(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s.stageSlug} value={s.stageSlug}>
                  {s.stage} · {s.stageTitle}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => setParams({})}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                !selected ? 'bg-brand-500/12 text-brand-300' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <MessageSquareCode className="mr-1.5 inline h-3.5 w-3.5" />
              不指定知识点（自由提问）
            </button>
            {stage?.lessons.map((lesson) => {
              const key = `${stage.stageSlug}/${lesson.slug}`;
              const active = key === selectedKey;
              return (
                <button
                  key={lesson.slug}
                  type="button"
                  onClick={() => setParams({ lesson: key })}
                  className={`mb-0.5 w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    active ? 'bg-brand-500/12 text-brand-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="line-clamp-2">{lesson.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <TutorPanel
          className="h-[70vh]"
          storageKey={selected ? `tutor-${selected.stage.stageSlug}/${selected.lesson.slug}` : 'tutor-free'}
          context={
            selected
              ? {
                  title: selected.lesson.title,
                  stageTitle: selected.stage.stageTitle,
                  summary: selected.lesson.summary,
                  intuition: selected.lesson.intuition,
                  formal: selected.lesson.formal,
                  formula: selected.lesson.formula,
                  code: selected.lesson.codeExample?.code,
                  mistakes: selected.lesson.mistakes,
                }
              : null
          }
          intro={
            selected
              ? `当前上下文：${selected.stage.stageTitle} · ${selected.lesson.title}`
              : weakLessons.length
                ? `未指定知识点。你的薄弱项：${weakLessons
                    .slice(0, 4)
                    .map((w) => w.lessonSlug)
                    .join('、')}，也可以直接问它们。`
                : '未指定知识点，可以直接提问任何计算机与 AI 算法相关问题。'
          }
        />
      </div>
    </>
  );
}
