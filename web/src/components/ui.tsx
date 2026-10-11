import type { ReactNode } from 'react';
import { DIFFICULTY_STYLE, STATUS_LABEL, STATUS_STYLE } from '../lib/content';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function DifficultyChip({ difficulty }: { difficulty: string }) {
  return <Chip className={DIFFICULTY_STYLE[difficulty] ?? 'bg-white/5 text-slate-400 ring-white/10'}>{difficulty}</Chip>;
}

export function StatusChip({ status }: { status: string }) {
  return <Chip className={STATUS_STYLE[status] ?? STATUS_STYLE['not-started']}>{STATUS_LABEL[status] ?? status}</Chip>;
}

export function ProgressBar({ percent, className = '' }: { percent: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/8 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="section-title mb-1.5">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'brand' | 'emerald' | 'amber';
}) {
  const toneClass = {
    default: 'text-slate-100',
    brand: 'text-brand-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
  }[tone];
  return (
    <div className="card px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1.5 font-mono text-xl font-semibold ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card grid place-items-center px-6 py-12 text-center">
      <div className="text-sm font-medium text-slate-300">{title}</div>
      {hint ? <div className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">{hint}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionBlock({
  title,
  icon,
  children,
  tone = 'default',
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'brand' | 'amber' | 'emerald';
}) {
  const ring = {
    default: 'border-white/8',
    brand: 'border-brand-500/25',
    amber: 'border-amber-500/25',
    emerald: 'border-emerald-500/25',
  }[tone];
  const labelTone = {
    default: 'text-slate-400',
    brand: 'text-brand-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
  }[tone];
  return (
    <section className={`card ${ring} p-5`}>
      <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${labelTone}`}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}
