import { Check, Crown, Flag, Flame, HelpCircle, Skull, Sword } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lesson, ProgressRow, Stage } from '../lib/types';

export type NodeKind = 'start' | 'battle' | 'elite' | 'unknown' | 'rest' | 'boss';

export type MapNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  floor: number;
  label: string;
  sub?: string;
  status: 'not-started' | 'learning' | 'review' | 'mastered';
  href: string;
  track?: 'main' | 'side';
  current?: boolean;
  synthetic?: boolean;
};

export type StageMap = {
  stage: Stage;
  nodes: MapNode[];
  edges: { from: MapNode; to: MapNode; traveled: boolean }[];
  height: number;
};

/* ---------------------------------------------------------------- 视觉配置 */

export const KIND_STYLE: Record<
  NodeKind,
  { ring: string; glow: string; bg: string; icon: typeof Sword; label: string; hint: string }
> = {
  start: {
    ring: 'ring-emerald-400/70',
    glow: 'shadow-[0_0_18px_-2px_rgba(52,211,153,0.55)]',
    bg: 'from-emerald-500/25 to-emerald-900/40',
    icon: Flag,
    label: '起点',
    hint: '阶段的第一个知识点',
  },
  battle: {
    ring: 'ring-sky-400/60',
    glow: 'shadow-[0_0_16px_-4px_rgba(56,189,248,0.5)]',
    bg: 'from-sky-500/20 to-slate-900/60',
    icon: Sword,
    label: '普通',
    hint: '基础难度知识点',
  },
  elite: {
    ring: 'ring-violet-400/65',
    glow: 'shadow-[0_0_18px_-3px_rgba(167,139,250,0.55)]',
    bg: 'from-violet-500/22 to-slate-900/60',
    icon: Skull,
    label: '精英',
    hint: '进阶难度知识点，面试高频',
  },
  unknown: {
    ring: 'ring-amber-400/65',
    glow: 'shadow-[0_0_18px_-3px_rgba(251,191,36,0.5)]',
    bg: 'from-amber-500/22 to-slate-900/60',
    icon: HelpCircle,
    label: '未知',
    hint: '高阶难度知识点，含推导或工程细节',
  },
  rest: {
    ring: 'ring-orange-400/55',
    glow: 'shadow-[0_0_14px_-4px_rgba(251,146,60,0.45)]',
    bg: 'from-orange-500/18 to-slate-900/60',
    icon: Flame,
    label: '营火',
    hint: '模块之间的休整点：去复习上一模块',
  },
  boss: {
    ring: 'ring-rose-400/75',
    glow: 'shadow-[0_0_26px_-2px_rgba(251,113,133,0.6)]',
    bg: 'from-rose-500/30 to-rose-950/60',
    icon: Crown,
    label: '首领',
    hint: '阶段通关：做完这个阶段的练习检验',
  },
};

const STATUS_RING: Record<string, string> = {
  'not-started': 'opacity-45 saturate-50',
  learning: 'opacity-100',
  review: 'opacity-100',
  mastered: 'opacity-100',
};

/* ---------------------------------------------------------------- 布局算法 */

const MAP_WIDTH = 900;
const SIDE_PAD = 128;
/** 蛇形走位：相邻两行的横向位置必须拉开，才有"路径"的感觉 */
const COL_PATTERN = [0.5, 0.16, 0.84, 0.3, 0.7, 0.12, 0.88, 0.44, 0.24, 0.76];
const ROW_STEP = 88;
const NODE_SIZE = 52;
const BOSS_SIZE = 68;

function kindForLesson(lesson: Lesson, isFirst: boolean): NodeKind {
  if (isFirst) return 'start';
  if (lesson.difficulty === '高阶') return 'unknown';
  if (lesson.difficulty === '进阶') return 'elite';
  return 'battle';
}

function statusOf(row: ProgressRow | undefined): MapNode['status'] {
  const status = row?.status;
  if (status === 'learning' || status === 'review' || status === 'mastered') return status;
  return 'not-started';
}

export function buildStageMap(
  stage: Stage,
  progress: Map<string, ProgressRow>,
  currentKey: string | null,
): StageMap {
  const nodes: MapNode[] = [];
  const usable = MAP_WIDTH - SIDE_PAD * 2;
  let y = 56;
  let row = 0;
  let lastModule: string | null = null;
  let prevLesson: Lesson | null = null;

  const pushNode = (node: Omit<MapNode, 'x' | 'y' | 'floor'>) => {
    const x = SIDE_PAD + usable * COL_PATTERN[row % COL_PATTERN.length];
    nodes.push({ ...node, x, y, floor: row + 1 });
    y += ROW_STEP;
    row += 1;
  };

  stage.lessons.forEach((lesson, index) => {
    // 模块切换处插一个营火节点：既是节奏休息，也是回练入口
    if (lastModule && lesson.module !== lastModule && prevLesson) {
      pushNode({
        id: `${stage.stageSlug}::rest::${index}`,
        kind: 'rest',
        label: `休整 · ${lastModule}`,
        sub: '去练一遍上一模块',
        status: 'not-started',
        href: `/practice/${stage.stageSlug}/${prevLesson.slug}`,
        synthetic: true,
      });
    }

    const key = `${stage.stageSlug}/${lesson.slug}`;
    pushNode({
      id: key,
      kind: kindForLesson(lesson, index === 0),
      label: lesson.title,
      sub: `${lesson.module} · ${lesson.estimatedMinutes} 分钟`,
      status: statusOf(progress.get(key)),
      href: `/learn/${stage.stageSlug}/${lesson.slug}`,
      track: lesson.track,
      current: key === currentKey,
    });

    lastModule = lesson.module;
    prevLesson = lesson;
  });

  // 阶段首领：通关检验
  const lastLesson = stage.lessons[stage.lessons.length - 1];
  pushNode({
    id: `${stage.stageSlug}::boss`,
    kind: 'boss',
    label: `${stage.stageTitle} · 通关检验`,
    sub: `${stage.lessons.length} 个知识点全部过一遍`,
    status: 'not-started',
    href: `/practice/${stage.stageSlug}/${lastLesson.slug}`,
    synthetic: true,
  });

  const edges = nodes.slice(0, -1).map((from, i) => {
    const to = nodes[i + 1];
    const traveled = from.status === 'mastered' && !from.synthetic;
    return { from, to, traveled };
  });

  return { stage, nodes, edges, height: y + 40 };
}

/* ---------------------------------------------------------------- 组件 */

function NodeView({ node, highlight, dim }: { node: MapNode; highlight: boolean; dim?: boolean }) {
  const style = KIND_STYLE[node.kind];
  const Icon = style.icon;
  const isBoss = node.kind === 'boss';
  const size = isBoss ? BOSS_SIZE : NODE_SIZE;
  // 节点在右半边时标签放左侧，避免越界
  const labelOnLeft = node.x > MAP_WIDTH / 2;

  return (
    <Link
      to={node.href}
      title={`${node.label}${node.sub ? ` — ${node.sub}` : ''}`}
      className={`group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none transition-opacity ${
        dim ? 'opacity-20' : 'opacity-100'
      }`}
      style={{ left: node.x, top: node.y, width: size, height: size }}
    >
      <span
        className={`relative grid h-full w-full place-items-center rounded-full bg-gradient-to-b ${style.bg} ring-2 ${style.ring} ${style.glow} ${STATUS_RING[node.status]} transition duration-200 group-hover:scale-110 group-focus-visible:scale-110 ${
          node.current ? 'spire-current' : ''
        } ${highlight ? 'scale-110 ring-4' : ''}`}
      >
        <Icon className={`${isBoss ? 'h-7 w-7' : 'h-5 w-5'} text-slate-100`} strokeWidth={1.9} />
        {node.status === 'mastered' ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-ink-950 ring-2 ring-ink-950">
            <Check className="h-2.5 w-2.5" strokeWidth={3.4} />
          </span>
        ) : null}
        {node.status === 'review' ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-ink-950" />
        ) : null}
      </span>

      {node.current ? (
        <span className="pointer-events-none absolute left-1/2 top-[-22px] -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-ink-950">
          你在这里
        </span>
      ) : null}

      <span
        className={
          isBoss
            ? 'pointer-events-none absolute left-1/2 top-[calc(100%+8px)] w-[220px] -translate-x-1/2 text-center'
            : `pointer-events-none absolute top-1/2 w-[164px] -translate-y-1/2 ${
                labelOnLeft ? 'right-[calc(100%+10px)] text-right' : 'left-[calc(100%+10px)] text-left'
              }`
        }
      >
        <span
          className={`line-clamp-2 block text-[11.5px] leading-tight ${
            node.status === 'not-started' ? 'text-slate-500' : 'text-slate-300'
          } group-hover:text-brand-300`}
        >
          {node.label}
        </span>
        {node.sub && !isBoss ? (
          <span className="mt-0.5 block truncate text-[10px] text-slate-600">{node.sub}</span>
        ) : null}
      </span>
    </Link>
  );
}

function StageMapView({
  map,
  accent,
  query,
  trackFilter = 'all',
}: {
  map: StageMap;
  accent: string;
  query: string;
  trackFilter?: 'all' | 'main' | 'side';
}) {
  const q = query.trim().toLowerCase();

  return (
    <div className="relative overflow-x-auto">
      <div className="relative mx-auto" style={{ width: MAP_WIDTH, height: map.height }}>
        <svg
          className="absolute inset-0"
          width={MAP_WIDTH}
          height={map.height}
          viewBox={`0 0 ${MAP_WIDTH} ${map.height}`}
          aria-hidden
        >
          {map.edges.map((edge, i) => {
            const { from, to } = edge;
            const mid = (to.y - from.y) * 0.5;
            const d = `M ${from.x} ${from.y} C ${from.x} ${from.y + mid}, ${to.x} ${to.y - mid}, ${to.x} ${to.y}`;
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={edge.traveled ? accent : 'rgba(148,163,184,0.22)'}
                  strokeWidth={edge.traveled ? 3 : 2.5}
                  strokeDasharray={edge.traveled ? undefined : '7 7'}
                  strokeLinecap="round"
                  opacity={edge.traveled ? 0.85 : 0.9}
                />
              </g>
            );
          })}
        </svg>

        {/* 楼层编号 */}
        {map.nodes.map((node) => (
          <span
            key={`floor-${node.id}`}
            className="absolute -translate-y-1/2 select-none font-mono text-[10px] text-slate-600"
            style={{ left: 24, top: node.y }}
          >
            {String(node.floor).padStart(2, '0')}
          </span>
        ))}

        {map.nodes.map((node) => (
          <NodeView
            key={node.id}
            node={node}
            highlight={Boolean(q) && `${node.label} ${node.sub ?? ''}`.toLowerCase().includes(q)}
            dim={trackFilter !== 'all' && Boolean(node.track) && node.track !== trackFilter}
          />
        ))}
      </div>
    </div>
  );
}

export function SpireStage({
  map,
  accent,
  query,
  stageProgress,
  trackFilter = 'all',
}: {
  map: StageMap;
  accent: string;
  query: string;
  stageProgress: { done: number; total: number; percent: number };
  trackFilter?: 'all' | 'main' | 'side';
}) {
  const { stage } = map;
  const minutes = stage.lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 25), 0);

  return (
    <section className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
        <span className="text-2xl">{stage.stageEmoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-100">{stage.stageTitle}</h3>
            <span className="font-mono text-[11px] text-slate-500">阶段 {stage.stage}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">{stage.stageDesc}</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span>
            {stage.lessons.length} 节 · 约 {Math.round(minutes / 60)} 小时
          </span>
          <span className="font-mono text-slate-300">
            {stageProgress.done}/{stageProgress.total}
          </span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${stageProgress.percent}%`, background: accent }}
            />
          </div>
        </div>
      </div>

      <StageMapView map={map} accent={accent} query={query} trackFilter={trackFilter} />
    </section>
  );
}

export function useStageMaps(
  stages: Stage[],
  progress: Map<string, ProgressRow>,
  currentKey: string | null,
): StageMap[] {
  return useMemo(
    () => stages.map((stage) => buildStageMap(stage, progress, currentKey)),
    [stages, progress, currentKey],
  );
}
