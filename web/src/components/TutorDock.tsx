import { Maximize2, PanelRightClose, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTutorDock } from '../lib/tutor-dock';
import { useStore } from '../lib/store';
import { TutorPanel } from './TutorPanel';

/**
 * 右侧 AI 导师抽屉：
 * - 收起时只留一条贴边标签，需要时点开
 * - 打开后自动带上当前知识点（讲义页 / 练习页）作为上下文
 * - 展开状态记在 localStorage，刷新后保持
 */
export function TutorDock() {
  const { open, setOpen, context, contextKey, contextLabel } = useTutorDock();
  const { tutor } = useStore();
  const location = useLocation();

  // 独立整页 /tutor 已经是一整个导师面板，抽屉就不再重复出现
  if (location.pathname === '/tutor') return null;

  return (
    <>
      {/* 收起状态：贴边标签 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="展开 AI 导师"
        className={`fixed right-0 top-[38%] z-30 flex flex-col items-center gap-2 rounded-l-xl border border-r-0 border-white/10 bg-ink-900/90 px-2 py-3 text-slate-300 backdrop-blur transition-all hover:bg-ink-800 hover:text-brand-300 ${
          open ? 'pointer-events-none translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <Sparkles className="h-4 w-4 text-brand-400" />
        <span className="text-[11px] tracking-wider [writing-mode:vertical-rl]">AI 导师</span>
        {tutor.hasKey ? (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="已接入模型" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="离线模式" />
        )}
      </button>

      {/* 展开状态：右侧抽屉 */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-[392px] max-w-[92vw] flex-col border-l border-white/10 bg-ink-950/95 shadow-[-16px_0_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-white/8 px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">AI 导师</span>
              <span
                className={`chip ${
                  tutor.hasKey
                    ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30'
                    : 'bg-amber-500/12 text-amber-300 ring-amber-500/30'
                }`}
              >
                {tutor.hasKey ? tutor.model || '已接入' : '离线模式'}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-500" title={contextLabel}>
              上下文：{contextLabel}
            </div>
          </div>
          <Link to="/tutor" className="btn-quiet !px-2 !py-1" title="展开到整页（可切换知识点）">
            <Maximize2 className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-quiet !px-2 !py-1"
            title="收起（内容区会恢复全宽）"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </header>

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
      </aside>
    </>
  );
}
