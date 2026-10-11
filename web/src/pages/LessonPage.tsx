import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Brain,
  CheckCircle2,
  Code2,
  ExternalLink,
  FlaskConical,
  Lightbulb,
  Link2,
  NotebookPen,
  Sigma,
  Sparkles,
  Target,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Markdown } from '../components/Markdown';
import { DifficultyChip, PageHeader, SectionBlock, StatusChip } from '../components/ui';
import { findLesson, neighbours } from '../lib/content';
import { useStore } from '../lib/store';
import { useTutorDock } from '../lib/tutor-dock';

export function LessonPage() {
  const { stageSlug, lessonSlug } = useParams();
  const ref = findLesson(stageSlug, lessonSlug);
  const { progress, setStatus, bookmarks, toggleBookmark, saveNote } = useStore();
  const { setOpen } = useTutorDock();
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  if (!ref) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-400">找不到这个知识点。</p>
        <Link className="btn-ghost mt-4" to="/roadmap">
          返回闯关地图
        </Link>
      </div>
    );
  }

  const { stage, lesson } = ref;
  const key = `${stage.stageSlug}/${lesson.slug}`;
  const row = progress.get(key);
  const status = row?.status ?? 'not-started';
  const isBookmarked = bookmarks.has(key);
  const { prev, next } = neighbours(ref);

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link to="/roadmap" className="hover:text-slate-300">
          学习路线
        </Link>
        <span>/</span>
        <Link to={`/roadmap?stage=${stage.stageSlug}`} className="hover:text-slate-300">
          {stage.stageEmoji} {stage.stageTitle}
        </Link>
        <span>/</span>
        <span className="text-slate-400">{lesson.module}</span>
      </div>

      <PageHeader
        eyebrow={`阶段 ${stage.stage} · 第 ${lesson.order} 节`}
        title={lesson.title}
        description={lesson.summary}
        actions={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen(true)}
              title="在右侧展开 AI 导师（会自动带上本节内容）"
            >
              <Sparkles className="h-4 w-4 text-brand-400" />
              问 AI 导师
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void toggleBookmark(key)}
              title={isBookmarked ? '取消收藏' : '收藏'}
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-brand-400" /> : <Bookmark className="h-4 w-4" />}
              {isBookmarked ? '已收藏' : '收藏'}
            </button>
            <Link className="btn-primary" to={`/practice/${stage.stageSlug}/${lesson.slug}`}>
              <Target className="h-4 w-4" />
              做本节练习
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusChip status={status} />
        <DifficultyChip difficulty={lesson.difficulty} />
        <span className="chip bg-white/5 text-slate-400 ring-white/10">约 {lesson.estimatedMinutes} 分钟</span>
        <span className="chip bg-white/5 text-slate-400 ring-white/10">{lesson.module}</span>
        {row?.question_count ? (
          <span className="chip bg-white/5 text-slate-400 ring-white/10">
            正确率 {Math.round((row.correct_count / row.question_count) * 100)}%
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {[
            { value: 'learning', label: '开始学习' },
            { value: 'review', label: '标记待复习' },
            { value: 'mastered', label: '已掌握' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => void setStatus(lesson.slug, stage.stageSlug, item.value)}
              className={`rounded-lg px-2.5 py-1 text-xs transition ${
                status === item.value
                  ? 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-4">
          <SectionBlock title="直觉解释" icon={<Lightbulb className="h-4 w-4" />} tone="brand">
            <p className="text-sm leading-[1.95] text-slate-300">{lesson.intuition}</p>
          </SectionBlock>

          <SectionBlock title="严谨定义" icon={<FlaskConical className="h-4 w-4" />}>
            <Markdown className="lesson-body text-sm">{lesson.formal}</Markdown>
          </SectionBlock>

          {lesson.formula ? (
            <SectionBlock title="核心公式" icon={<Sigma className="h-4 w-4" />} tone="brand">
              <Markdown className="text-sm">{`$$${lesson.formula}$$`}</Markdown>
            </SectionBlock>
          ) : null}

          <SectionBlock title="与 AI 算法开发的联系" icon={<Brain className="h-4 w-4" />} tone="emerald">
            <p className="text-sm leading-[1.95] text-slate-300">{lesson.aiConnection}</p>
          </SectionBlock>

          {lesson.codeExample?.code ? (
            <SectionBlock title={`示例代码${lesson.codeExample.filename ? ` · ${lesson.codeExample.filename}` : ''}`} icon={<Code2 className="h-4 w-4" />}>
              <Markdown className="text-sm">{`\`\`\`${lesson.codeExample.lang ?? 'text'}\n${lesson.codeExample.code}\n\`\`\``}</Markdown>
            </SectionBlock>
          ) : null}

          {lesson.mistakes?.length ? (
            <SectionBlock title="常见错误" icon={<AlertTriangle className="h-4 w-4" />} tone="amber">
              <ul className="space-y-2">
                {lesson.mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          ) : null}

          {lesson.interviewPoints?.length ? (
            <SectionBlock title="面试考点" icon={<CheckCircle2 className="h-4 w-4" />} tone="brand">
              <ul className="space-y-2">
                {lesson.interviewPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                    <span className="mt-0.5 font-mono text-xs text-brand-400">Q{i + 1}</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          ) : null}

          {lesson.resources?.length ? (
            <SectionBlock title="延伸资源" icon={<Link2 className="h-4 w-4" />}>
              <ul className="space-y-2">
                {lesson.resources.map((r, i) => (
                  <li key={i}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          ) : null}

          <SectionBlock title="随手记一笔" icon={<NotebookPen className="h-4 w-4" />}>
            <textarea
              className="field min-h-[90px] resize-y"
              placeholder="这一节你卡在哪、想通了什么？保存后会出现在「学习笔记」里并关联本节。"
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value);
                setNoteSaved(false);
              }}
            />
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={!noteText.trim()}
                onClick={() => {
                  void saveNote({
                    title: `${lesson.title} · 笔记`,
                    body: noteText.trim(),
                    lessonSlug: key,
                    tags: [stage.stageTitle, lesson.module],
                  }).then(() => {
                    setNoteText('');
                    setNoteSaved(true);
                  });
                }}
              >
                保存笔记
              </button>
              {noteSaved ? <span className="text-xs text-emerald-300">已保存到学习笔记</span> : null}
            </div>
          </SectionBlock>

          <div className="flex items-center justify-between gap-3 pt-1">
            {prev ? (
              <Link
                to={`/learn/${prev.stage.stageSlug}/${prev.lesson.slug}`}
                className="btn-ghost min-w-0 flex-1 !justify-start"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">{prev.lesson.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to={`/learn/${next.stage.stageSlug}/${next.lesson.slug}`}
                className="btn-ghost min-w-0 flex-1 !justify-end"
              >
                <span className="truncate">{next.lesson.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
