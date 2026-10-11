import {
  BookMarked,
  BookOpenCheck,
  Brain,
  CalendarCheck,
  Compass,
  GraduationCap,
  ListChecks,
  MessageSquareCode,
  NotebookPen,
  Route as RouteIcon,
  Settings as SettingsIcon,
  Sparkles,
  Target,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { TOTALS } from '../lib/content';
import { useStore } from '../lib/store';

const NAV = [
  { to: '/', label: '总览', icon: Compass },
  { to: '/roadmap', label: '学习路线', icon: RouteIcon },
  { to: '/checklist', label: '知识点清单', icon: ListChecks },
  { to: '/learn', label: '课程学习', icon: BookOpenCheck },
  { to: '/practice', label: '练习测验', icon: Target },
  { to: '/projects', label: '实战项目', icon: CalendarCheck },
  { to: '/interview', label: '面试考点', icon: Brain },
  { to: '/wrong', label: '错题本', icon: BookMarked },
  { to: '/notes', label: '学习笔记', icon: NotebookPen },
  { to: '/tutor', label: 'AI 导师', icon: MessageSquareCode },
  { to: '/settings', label: '设置', icon: SettingsIcon },
];

export function Sidebar() {
  const { stats, tutor } = useStore();

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-white/8 bg-ink-900/60 px-4 py-5 backdrop-blur lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-ink-950">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">AI 算法实验室</div>
          <div className="text-[11px] text-slate-500">本地学习站 · 离线可用</div>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-brand-500/12 text-brand-300 ring-1 ring-inset ring-brand-500/25'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5" />
            总进度
          </span>
          <span className="font-mono text-slate-300">{stats.overallPercent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
            style={{ width: `${stats.overallPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
          <div>
            <div className="font-mono text-sm text-slate-200">{TOTALS.stages}</div>
            阶段
          </div>
          <div>
            <div className="font-mono text-sm text-slate-200">{TOTALS.lessons}</div>
            知识点
          </div>
          <div>
            <div className="font-mono text-sm text-emerald-300">{stats.mastered}</div>
            已掌握
          </div>
          <div>
            <div className="font-mono text-sm text-amber-300">{stats.streak}</div>
            连续天数
          </div>
        </div>
        <div className="border-t border-white/8 pt-2 text-[11px] text-slate-500">
          AI 导师：
          {tutor.hasKey ? (
            <span className="text-emerald-300">已接入 {tutor.model || '自定义模型'}</span>
          ) : (
            <span className="text-amber-300">离线模式</span>
          )}
        </div>
      </div>
    </aside>
  );
}
