import { Bot, Send, Sparkles, Trash2, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Markdown } from './Markdown';

export type TutorContext = {
  title?: string;
  stageTitle?: string;
  summary?: string;
  intuition?: string;
  formal?: string;
  formula?: string;
  code?: string;
  mistakes?: string[];
  weakTopics?: string[];
} | null;

const MODES = [
  { id: 'simple', label: '简单解释' },
  { id: 'deep', label: '深入解释' },
  { id: 'example', label: '举例说明' },
  { id: 'practice', label: '练习模式' },
  { id: 'socratic', label: '苏格拉底式' },
  { id: 'free', label: '自由提问' },
];

type Message = { role: 'user' | 'assistant'; content: string; source?: 'model' | 'offline' };

export function TutorPanel({
  context,
  storageKey = 'tutor-history',
  className = '',
  intro,
  hideHeader = false,
}: {
  context: TutorContext;
  storageKey?: string;
  className?: string;
  intro?: string;
  /** 嵌在右侧抽屉里时，标题栏由抽屉提供，这里只保留清空按钮 */
  hideHeader?: boolean;
}) {
  const { tutor, weakLessons } = useStore();
  const [mode, setMode] = useState('deep');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw) as Message[]);
    } catch {
      /* 忽略损坏的历史 */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {
      /* 忽略写入失败 */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string, overrideMode?: string) => {
      const question = text.trim();
      const useMode = overrideMode ?? mode;
      if (busy) return;
      setBusy(true);
      setMessages((prev) => [...prev, { role: 'user', content: question || `请用「${MODES.find((m) => m.id === useMode)?.label}」方式讲解本节内容` }]);
      setInput('');
      try {
        const res = await api.tutor({
          message: question,
          mode: useMode,
          context: {
            ...context,
            weakTopics: weakLessons.map((w) => w.lessonSlug),
          },
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        });
        setMessages((prev) => [...prev, { role: 'assistant', content: res.content, source: res.source }]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `请求失败：${String((err as Error).message)}`, source: 'offline' },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, context, messages, mode, weakLessons],
  );

  return (
    <div className={`card flex min-h-0 flex-col ${className}`}>
      {hideHeader ? (
        messages.length ? (
          <div className="flex justify-end border-b border-white/8 px-3 py-1.5">
            <button type="button" className="btn-quiet !px-2 !py-1" onClick={() => setMessages([])} title="清空对话">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null
      ) : (
        <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-semibold text-slate-200">AI 导师</span>
            <span
              className={`chip ${
                tutor.hasKey
                  ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30'
                  : 'bg-amber-500/12 text-amber-300 ring-amber-500/30'
              }`}
            >
              {tutor.hasKey ? `已接入 ${tutor.model || '模型'}` : '离线模式'}
            </span>
          </div>
          {messages.length ? (
            <button type="button" className="btn-quiet !px-2 !py-1" onClick={() => setMessages([])} title="清空对话">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-3 py-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              mode === m.id
                ? 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-[160px] flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!messages.length ? (
          <p className="text-xs leading-relaxed text-slate-500">
            {intro ??
              '选一个模式直接提问。导师会自动带上当前课程内容、公式、示例代码和你的薄弱知识点。未配置模型接口时使用基于课程内容的离线讲解。'}
          </p>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className="flex gap-2.5">
            <div
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg ${
                m.role === 'user' ? 'bg-white/8 text-slate-300' : 'bg-brand-500/15 text-brand-300'
              }`}
            >
              {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <Markdown className="text-sm">{m.content}</Markdown>
              {m.role === 'assistant' && m.source === 'offline' ? (
                <div className="mt-1 text-[11px] text-amber-300/80">离线讲解</div>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? <div className="pl-9 text-xs text-slate-500">导师思考中…</div> : null}
      </div>

      <form
        className="flex items-end gap-2 border-t border-white/8 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          className="field min-h-[42px] resize-none"
          rows={2}
          placeholder="问点什么，比如「这节的知识点面试会怎么问？」"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={busy}>
          <Send className="h-4 w-4" />
          发送
        </button>
      </form>
    </div>
  );
}
