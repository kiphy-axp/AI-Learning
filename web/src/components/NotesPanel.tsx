import { ExternalLink, NotebookPen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findLesson } from '../lib/content';
import { useStore } from '../lib/store';
import { Markdown } from './Markdown';

type Draft = { id?: number; title: string; body: string; tags: string; lessonSlug: string };

const EMPTY_DRAFT: Draft = { title: '', body: '', tags: '', lessonSlug: '' };

/**
 * 笔记面板：右侧抽屉里用 compact 模式，独立页面用完整模式。
 * 两种模式共用同一套增删改逻辑，避免出现两套笔记实现。
 */
export function NotesPanel({ compact = false }: { compact?: boolean }) {
  const { notes, saveNote, deleteNote } = useStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.trim().toLowerCase();
    return notes.filter((n) => `${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(q));
  }, [notes, query]);

  const submit = () => {
    if (!draft?.title.trim()) return;
    void saveNote({
      id: draft.id,
      title: draft.title.trim(),
      body: draft.body,
      lessonSlug: draft.lessonSlug || null,
      tags: draft.tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    }).then(() => setDraft(null));
  };

  const startNew = () => {
    setDraft({ ...EMPTY_DRAFT });
    setPreview(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/8 px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            className="field !py-1.5 pl-8 text-xs"
            placeholder="搜索笔记…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="button" className="btn-primary shrink-0 !px-2.5 !py-1.5 text-xs" onClick={startNew}>
          <Plus className="h-3.5 w-3.5" />
          新建
        </button>
      </div>

      {draft ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
          <input
            className="field !py-1.5 text-xs"
            placeholder="标题"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className="field !py-1.5 text-xs"
            placeholder="标签，逗号或空格分隔"
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
          />
          <input
            className="field !py-1.5 text-xs"
            placeholder="关联知识点（可留空，如 dsa/dynamic-programming）"
            value={draft.lessonSlug}
            onChange={(e) => setDraft({ ...draft, lessonSlug: e.target.value })}
          />
          <textarea
            className="field min-h-[160px] resize-y font-mono text-[12px] leading-relaxed"
            placeholder="正文，支持 Markdown 与 $公式$"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary !py-1.5 text-xs" disabled={!draft.title.trim()} onClick={submit}>
              保存
            </button>
            <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={() => setPreview((p) => !p)}>
              {preview ? '关闭预览' : '预览'}
            </button>
            <button type="button" className="btn-quiet !py-1.5 text-xs" onClick={() => setDraft(null)}>
              取消
            </button>
          </div>
          {preview ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <Markdown className="text-xs">{draft.body || '（空）'}</Markdown>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {filtered.length ? (
            <div className={compact ? 'space-y-2' : 'grid gap-3 md:grid-cols-2'}>
              {filtered.map((note) => {
                const linked = note.lesson_slug
                  ? findLesson(...(note.lesson_slug.split('/') as [string, string]))
                  : undefined;
                return (
                  <article key={note.id} className="card flex flex-col p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-100">{note.title}</h3>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="btn-quiet !px-1.5 !py-1"
                          title="编辑"
                          onClick={() => {
                            setDraft({
                              id: note.id,
                              title: note.title,
                              body: note.body,
                              tags: note.tags.join(' '),
                              lessonSlug: note.lesson_slug ?? '',
                            });
                            setPreview(false);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn-quiet !px-1.5 !py-1"
                          title="删除"
                          onClick={() => void deleteNote(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {note.tags.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {note.tags.map((tag) => (
                          <span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className={`mt-2 overflow-hidden ${compact ? 'max-h-[150px]' : 'max-h-[220px] flex-1'}`}>
                      <Markdown className="text-xs">{note.body.slice(0, compact ? 400 : 600)}</Markdown>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-white/8 pt-2 text-[10px] text-slate-500">
                      <span>{new Date(note.updated_at).toLocaleString('zh-CN', { hour12: false })}</span>
                      {linked ? (
                        <Link
                          to={`/learn/${linked.stage.stageSlug}/${linked.lesson.slug}`}
                          className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="max-w-[120px] truncate">{linked.lesson.title}</span>
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid place-items-center px-4 py-12 text-center">
              <NotebookPen className="h-6 w-6 text-slate-600" />
              <p className="mt-2 text-sm text-slate-400">{notes.length ? '没有匹配的笔记' : '还没有笔记'}</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                {notes.length
                  ? '换个关键词试试。'
                  : '建议每学完一节写三句话：解决了什么问题、核心机制、工作里怎么用。讲义页底部也能一键保存到笔记。'}
              </p>
              <button type="button" className="btn-primary mt-3 !py-1.5 text-xs" onClick={startNew}>
                <Plus className="h-3.5 w-3.5" />
                写第一条
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
