import { Maximize2, NotebookPen, PanelRightClose, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSideDock, type DockTab } from '../lib/side-dock';
import { useStore } from '../lib/store';
import { NotesPanel } from './NotesPanel';
import { TutorPanel } from './TutorPanel';

const TABS: { id: DockTab; label: string; icon: typeof Sparkles }[] = [
  { id: 'tutor', label: 'AI 导师', icon: Sparkles },
  { id: 'notes', label: '学习笔记', icon: NotebookPen },
];

/**
 * 右侧面板：AI 导师与学习笔记共用同一个抽屉，默认收起为贴边标签。
 * - 收起时只留两个竖排按钮，需要哪个点哪个
 * - 展开状态与上次使用的面板记在 localStorage
 */
export function SideDock() {
  const { open, tab, openTab, setOpen, context, contextKey, contextLabel } = useSideDock();
  const { tutor, notes } = useStore();
  const location = useLocation();

  // 独立整页 /tutor 与 /notes 已经是一整屏，抽屉不再重复出现
  if (location.pathname === '/tutor' || location.pathname === '/notes') return null;

  const fullPageHref = tab === 'tutor' ? '/tutor' : '/notes';
  const fullPageTitle = tab === 'tutor' ? '展开到整页（可切换知识点）' : '展开到整页';

  return (
    <>
      {/* 收起状态：右缘贴边按钮 */}
      <div
        className={`fixed right-0 top-[34%] z-30 flex flex-col gap-2 transition-all duration-300 ${
          open ? 'pointer-events-none translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => openTab(id)}
            title={`展开「${label}」`}
            className="flex flex-col items-center gap-2 rounded-l-xl border border-r-0 border-white/10 bg-ink-900/90 px-2 py-3 text-slate-300 backdrop-blur transition hover:bg-ink-800 hover:text-brand-300"
          >
            <Icon className={`h-4 w-4 ${id === 'tutor' ? 'text-brand-400' : 'text-accent-400'}`} />
            <span className="text-[11px] tracking-wider [writing-mode:vertical-rl]">{label}</span>
            {id === 'tutor' ? (
              <span
                className={`h-1.5 w-1.5 rounded-full ${tutor.hasKey ? 'bg-emerald-400' : 'bg-amber-400'}`}
                title={tutor.hasKey ? '已接入模型' : '离线模式'}
              />
            ) : notes.length ? (
              <span className="font-mono text-[10px] text-slate-500">{notes.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* 展开状态：右侧抽屉 */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-[392px] max-w-[92vw] flex-col border-l border-white/10 bg-ink-950/95 shadow-[-16px_0_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <header className="shrink-0 border-b border-white/8 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openTab(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    tab === id
                      ? 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {id === 'notes' && notes.length ? (
                    <span className="font-mono text-[10px] text-slate-500">{notes.length}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <Link to={fullPageHref} className="btn-quiet !px-2 !py-1" title={fullPageTitle}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="btn-quiet !px-2 !py-1" title="收起面板">
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>

          {tab === 'tutor' ? (
            <div className="mt-1.5 flex items-center gap-2 px-1">
              <span
                className={`chip ${
                  tutor.hasKey
                    ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30'
                    : 'bg-amber-500/12 text-amber-300 ring-amber-500/30'
                }`}
              >
                {tutor.hasKey ? tutor.model || '已接入' : '离线模式'}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500" title={contextLabel}>
                上下文：{contextLabel}
              </span>
            </div>
          ) : (
            <div className="mt-1.5 px-1 text-[11px] text-slate-500">
              笔记保存在本地数据库，支持 Markdown 与 $公式$
            </div>
          )}
        </header>

        {tab === 'tutor' ? (
          <TutorPanel
            className="min-h-0 flex-1 !rounded-none !border-0 bg-transparent"
            storageKey={contextKey}
            context={context}
            hideHeader
            intro={
              context
                ? `正在看「${context.title}」。选个模式提问，导师会自动带上这一节的定义、公式、代码和你的薄弱项。`
                : '当前没有指定知识点。可以自由提问计算机与 AI 算法相关的问题；进入任意讲义或练习页后，导师会自动带上那一节的内容。'
            }
          />
        ) : (
          <NotesPanel compact />
        )}
      </aside>
    </>
  );
}
