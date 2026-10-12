import { ArrowLeft, Bot, Check, CheckCircle2, RotateCcw, Target, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Markdown } from '../components/Markdown';
import { PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { findLesson } from '../lib/content';
import { gradeShort } from '../lib/grading';
import { useStore } from '../lib/store';
import type { QuizQuestion } from '../lib/types';

type Verdict = {
  correct: boolean;
  detail: string;
  reference?: string;
  /** auto = 自动判分，self = 自己改判，ai = 模型批改 */
  source?: 'auto' | 'self' | 'ai';
  confidence?: 'high' | 'low';
  hits?: string[];
  missed?: string[];
};

function scoreCode(question: Extract<QuizQuestion, { type: 'code' }>, answer: string): Verdict {
  const text = answer.trim();
  const hits = question.checks.filter((c) => text.includes(c));
  const correct = text.length > 0 && hits.length === question.checks.length;
  return {
    correct,
    detail: `关键片段 ${hits.length}/${question.checks.length}：${hits.join('  |  ') || '无'}`,
    reference: question.solution,
    source: 'auto',
  };
}

export function PracticePage() {
  const { stageSlug, lessonSlug } = useParams();
  const ref = findLesson(stageSlug, lessonSlug);
  const { submitAnswer, setStatus, tutor } = useStore();

  const [choicePick, setChoicePick] = useState<number | null>(null);
  const [shortText, setShortText] = useState('');
  const [codeText, setCodeText] = useState('');
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [grading, setGrading] = useState<string | null>(null);

  const questions = useMemo(() => ref?.lesson.quiz ?? [], [ref]);

  if (!ref) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-400">找不到这个知识点。</p>
        <Link className="btn-ghost mt-4" to="/practice">
          返回练习列表
        </Link>
      </div>
    );
  }

  const { stage, lesson } = ref;
  const key = `${stage.stageSlug}/${lesson.slug}`;
  const answered = Object.keys(verdicts).length;
  const allDone = answered === questions.length && questions.length > 0;
  const correctCount = Object.values(verdicts).filter((v) => v.correct).length;

  const record = (question: QuizQuestion, verdict: Verdict, answerText: string) => {
    setVerdicts((prev) => ({ ...prev, [question.id]: verdict }));
    void submitAnswer({
      lessonSlug: key,
      questionId: question.id,
      questionType: question.type,
      correct: verdict.correct,
      answer: answerText.slice(0, 2000),
    });
  };

  /** 自己改判：意思对就算过，不跟关键词较劲 */
  const override = (question: QuizQuestion, verdict: Verdict, correct: boolean) => {
    record(
      question,
      {
        ...verdict,
        correct,
        source: 'self',
        detail: correct ? '已按你的判断记为答对' : '已记为没答对，回头再看一遍',
      },
      shortText || '(自我改判)',
    );
  };

  /** 让模型按「意思对了就算过」批改 */
  const askAi = async (question: Extract<QuizQuestion, { type: 'short' }>, verdict: Verdict) => {
    setGrading(question.id);
    try {
      const res = await api.grade({
        prompt: question.prompt,
        reference: question.answer,
        keywords: question.keywords,
        answer: shortText,
      });
      if (res.ok) {
        record(
          question,
          {
            ...verdict,
            correct: Boolean(res.correct),
            source: 'ai',
            confidence: 'high',
            detail: `${res.correct ? 'AI 判定：意思答到了' : 'AI 判定：还没答到'}${res.score !== null && res.score !== undefined ? `（${res.score} 分）` : ''}${res.feedback ? ` —— ${res.feedback}` : ''}`,
          },
          shortText,
        );
      } else {
        setVerdicts((prev) => ({
          ...prev,
          [question.id]: { ...verdict, detail: `${verdict.detail}｜AI 批改不可用（${res.reason ?? '未配置模型'}）` },
        }));
      }
    } finally {
      setGrading(null);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link to="/practice" className="hover:text-slate-300">
          练习测验
        </Link>
        <span>/</span>
        <Link to={`/learn/${stage.stageSlug}/${lesson.slug}`} className="hover:text-slate-300">
          {lesson.title}
        </Link>
      </div>

      <PageHeader
        eyebrow={`${stage.stageEmoji} ${stage.stageTitle} · ${lesson.module}`}
        title={`${lesson.title} · 练习`}
        description={lesson.summary}
        actions={
          <>
            <Link className="btn-ghost" to={`/learn/${stage.stageSlug}/${lesson.slug}`}>
              <ArrowLeft className="h-4 w-4" />
              回到课程
            </Link>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setVerdicts({});
                setChoicePick(null);
                setShortText('');
                setCodeText(questions.find((q) => q.type === 'code')?.starterCode ?? '');
              }}
            >
              <RotateCcw className="h-4 w-4" />
              重做
            </button>
          </>
        }
      />

      {allDone ? (
        <div
          className={`card mb-4 flex items-center justify-between gap-4 p-4 ${
            correctCount === questions.length ? 'border-emerald-500/30' : 'border-amber-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            {correctCount === questions.length ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Target className="h-5 w-5 text-amber-400" />
            )}
            <div>
              <div className="text-sm font-medium text-slate-100">
                本轮 {correctCount}/{questions.length} 通过
              </div>
              <div className="text-xs text-slate-500">
                简答题按「意思到了」判：命中一个要点就算过，判错了可以自己改。
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void setStatus(lesson.slug, stage.stageSlug, 'review')}
            >
              标记待复习
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void setStatus(lesson.slug, stage.stageSlug, 'mastered')}
            >
              标记已掌握
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {questions.map((question, index) => {
          const verdict = verdicts[question.id];
          return (
            <section key={question.id} className="card p-5">
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/8 font-mono text-xs text-slate-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    {question.type === 'choice' ? '选择题' : question.type === 'short' ? '简答题' : '编程题'}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-200">{question.prompt}</p>
                </div>
                {verdict ? (
                  <span
                    className={`chip ${
                      verdict.correct
                        ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30'
                        : 'bg-rose-500/12 text-rose-300 ring-rose-500/30'
                    }`}
                  >
                    {verdict.correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {verdict.correct ? '通过' : '需复习'}
                    {verdict.source === 'ai' ? ' · AI' : verdict.source === 'self' ? ' · 自判' : ''}
                  </span>
                ) : null}
              </div>

              {question.type === 'choice' ? (
                <div className="space-y-2 pl-9">
                  {question.options.map((option, oi) => {
                    const picked = choicePick === oi;
                    const isAnswer = question.answerIndex === oi;
                    const showState = Boolean(verdict);
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={showState}
                        onClick={() => setChoicePick(oi)}
                        className={`flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                          showState && isAnswer
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : showState && picked
                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                              : picked
                                ? 'border-brand-500/50 bg-brand-500/10 text-slate-100'
                                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <span className="mt-0.5 font-mono text-xs text-slate-500">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{option}</span>
                      </button>
                    );
                  })}
                  {!verdict ? (
                    <button
                      type="button"
                      className="btn-primary mt-1"
                      disabled={choicePick === null}
                      onClick={() =>
                        record(
                          question,
                          {
                            correct: choicePick === question.answerIndex,
                            detail: choicePick === question.answerIndex ? '选择正确' : '选择错误',
                            reference: question.explanation,
                            source: 'auto',
                          },
                          String.fromCharCode(65 + (choicePick ?? 0)),
                        )
                      }
                    >
                      提交答案
                    </button>
                  ) : null}
                </div>
              ) : null}

              {question.type === 'short' ? (
                <div className="pl-9">
                  <textarea
                    className="field min-h-[110px] resize-y"
                    placeholder="用自己的话讲一遍就行，不用跟参考答案对词。"
                    value={shortText}
                    disabled={Boolean(verdict)}
                    onChange={(e) => setShortText(e.target.value)}
                  />
                  {!verdict ? (
                    <button
                      type="button"
                      className="btn-primary mt-2.5"
                      disabled={shortText.trim().length < 5}
                      onClick={() => record(question, gradeShort(question, shortText), shortText)}
                    >
                      提交答案
                    </button>
                  ) : null}
                </div>
              ) : null}

              {question.type === 'code' ? (
                <div className="pl-9">
                  <textarea
                    className="field min-h-[180px] resize-y font-mono text-[13px] leading-relaxed"
                    value={codeText || question.starterCode}
                    disabled={Boolean(verdict)}
                    onChange={(e) => setCodeText(e.target.value)}
                    spellCheck={false}
                  />
                  {!verdict ? (
                    <button
                      type="button"
                      className="btn-primary mt-2.5"
                      onClick={() =>
                        record(question, scoreCode(question, codeText || question.starterCode), codeText || question.starterCode)
                      }
                    >
                      提交代码
                    </button>
                  ) : null}
                </div>
              ) : null}

              {verdict ? (
                <div className="mt-4 space-y-2.5 border-t border-white/8 pt-3.5 pl-9">
                  <div className={`text-xs ${verdict.correct ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {verdict.detail}
                  </div>

                  {question.type === 'short' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-ghost !py-1.5 text-xs"
                        onClick={() => override(question, verdict, true)}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        我答对了
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !py-1.5 text-xs"
                        onClick={() => override(question, verdict, false)}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        其实没答对
                      </button>
                      {tutor.hasKey ? (
                        <button
                          type="button"
                          className="btn-ghost !py-1.5 text-xs"
                          disabled={grading === question.id}
                          onClick={() => void askAi(question, verdict)}
                        >
                          <Bot className="h-3.5 w-3.5" />
                          {grading === question.id ? 'AI 批改中…' : '让 AI 判一下'}
                        </button>
                      ) : null}
                      <span className="text-[11px] text-slate-500">
                        判分只看意思，判错了直接改，不影响你的掌握度统计口径
                      </span>
                    </div>
                  ) : null}

                  {verdict.reference ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <div className="section-title mb-1.5">参考答案</div>
                      <Markdown className="text-sm">
                        {verdict.reference.includes('```')
                          ? verdict.reference
                          : `\`\`\`${question.type === 'code' ? 'python' : 'text'}\n${verdict.reference}\n\`\`\``}
                      </Markdown>
                    </div>
                  ) : null}
                  {question.type === 'code' ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <div className="section-title mb-1.5">参考实现</div>
                      <Markdown className="text-sm">{`\`\`\`python\n${question.solution}\n\`\`\``}</Markdown>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
