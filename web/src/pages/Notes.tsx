import { ExternalLink, NotebookPen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Markdown } from '../components/Markdown';
import { EmptyState, PageHeader } from '../components/ui';
import { findLesson } from '../lib/content';
import { useStore } from '../lib/store';

type Draft = { id?: number; title: string; body: string; tags: string; lessonSlug: string };

const EMPTY_DRAFT: Draft = { title: '', body: '', tags: '', lessonSlug: '' };

export function Notes() {
  const { notes, saveNote, deleteNote } = useStore();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.trim().toLowerCase();
    return notes.filter((n) => `${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(q));
  }, [notes, query]);

  const submit = () => {
    if (!draft.title.trim()) return;
    void saveNote({
      id: draft.id,
      title: draft.title.trim(),
      body: draft.body,
      lessonSlug: draft.lessonSlug || null,
      tags: draft.tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    }).then(() => {
      setDraft(EMPTY_DRAFT);
      setEditing(false);
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="学习笔记"
        title="把想通的东西写下来"
        description="笔记保存在本地数据库，支持 Markdown 与 LaTeX 公式。可以从课程页「随手记一笔」直接关联知识点。"
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                className="field w-[220px] pl-9"
                placeholder="搜索笔记…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setEditing(true);
              }}
            >
              <Plus className="h-4 w-4" />
              新建笔记
            </button>
          </>
        }
      />

      {editing ? (
        <div className="card mb-5 p-5">
          <div className="section-title mb-3">{draft.id ? '编辑笔记' : '新建笔记'}</div>
          <input
            className="field mb-2.5"
            placeholder="标题"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className="field mb-2.5"
            placeholder="标签，用逗号或空格分隔，例如：Transformer 面试"
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
          />
          <input
            className="field mb-2.5"
            placeholder="关联知识点（可留空，格式：stageSlug/lessonSlug，如 dsa/dynamic-programming）"
            value={draft.lessonSlug}
            onChange={(e) => setDraft({ ...draft, lessonSlug: e.target.value })}
          />
          <textarea
            className="field min-h-[200px] resize-y font-mono text-[13px] leading-relaxed"
            placeholder="正文，支持 Markdown 与 $公式$"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <div className="mt-2.5 flex items-center gap-2">
            <button type="button" className="btn-primary" disabled={!draft.title.trim()} onClick={submit}>
              保存
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPreview((p) => !p)}>
              {preview ? '关闭预览' : '预览'}
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setEditing(false);
              }}
            >
              取消
            </button>
          </div>
          {preview ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <Markdown className="text-sm">{draft.body || '（空）'}</Markdown>
            </div>
          ) : null}
        </div>
      ) : null}

      {filtered.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((note) => {
            const linked = note.lesson_slug ? findLesson(...(note.lesson_slug.split('/') as [string, string])) : undefined;
            return (
              <article key={note.id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 text-sm font-semibold text-slate-100">{note.title}</h2>
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
                        setEditing(true);
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

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-2.5 max-h-[220px] flex-1 overflow-hidden">
                  <Markdown className="text-xs">{note.body.slice(0, 600)}</Markdown>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5 text-[11px] text-slate-500">
                  <span>{new Date(note.updated_at).toLocaleString('zh-CN', { hour12: false })}</span>
                  {linked ? (
                    <Link
                      to={`/learn/${linked.stage.stageSlug}/${linked.lesson.slug}`}
                      className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {linked.lesson.title}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={notes.length ? '没有匹配的笔记' : '还没有笔记'}
          hint={
            notes.length
              ? '换个关键词试试。'
              : '在课程页底部「随手记一笔」，或点右上角新建笔记。建议每学完一节写三句话：解决了什么问题、核心机制、工作里怎么用。'
          }
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setEditing(true);
              }}
            >
              <NotebookPen className="h-4 w-4" />
              写第一条笔记
            </button>
          }
        />
      )}
    </>
  );
}
