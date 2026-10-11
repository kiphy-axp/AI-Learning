import { Link } from 'react-router-dom';
import { Chip, PageHeader, ProgressBar } from '../components/ui';
import { CATEGORY_ORDER, STAGES, TOTALS } from '../lib/content';
import { useStore } from '../lib/store';

const CATEGORY_STYLE: Record<string, string> = {
  基础: 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30',
  进阶: 'bg-sky-500/12 text-sky-300 ring-sky-500/30',
  算法岗核心: 'bg-fuchsia-500/12 text-fuchsia-300 ring-fuchsia-500/30',
};

const CATEGORY_HINT: Record<string, string> = {
  基础: '计算机、Python、Linux、数学与数据处理 —— 这些是所有后续内容的底座，不求快，求不留死角。',
  进阶: '经典机器学习、深度学习、Transformer、LLM 应用与 Agent —— 建立完整的模型认知。',
  算法岗核心: '数据结构与算法、数学进阶、训练调参、LLM 训练推理、GPU 优化、论文复现 —— 面试与工作的正面战场。',
};

export function Roadmap() {
  const { stats } = useStore();

  return (
    <>
      <PageHeader
        eyebrow="学习路线"
        title={`${TOTALS.stages} 个阶段 · ${TOTALS.lessons} 个知识点`}
        description="按顺序推进即可；每个阶段内部的模块也建议按顺序学，因为后面的内容会复用前面的概念。点击阶段卡片进入该阶段的课程列表。"
      />

      <div className="space-y-8">
        {CATEGORY_ORDER.map((category) => {
          const stages = STAGES.filter((s) => s.category === category);
          if (!stages.length) return null;
          return (
            <section key={category}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Chip className={CATEGORY_STYLE[category]}>{category}</Chip>
                <span className="text-xs text-slate-500">{CATEGORY_HINT[category]}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {stages.map((stage) => {
                  const p = stats.stageProgress.get(stage.stageSlug) ?? {
                    done: 0,
                    total: stage.lessons.length,
                    percent: 0,
                  };
                  const modules = [...new Set(stage.lessons.map((l) => l.module))];
                  const minutes = stage.lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 25), 0);
                  return (
                    <Link
                      key={stage.stageSlug}
                      to={`/learn?stage=${stage.stageSlug}`}
                      className="card card-hover group flex flex-col p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{stage.stageEmoji}</span>
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-slate-500">阶段 {stage.stage}</div>
                            <h3 className="text-base font-semibold text-slate-100 group-hover:text-brand-300">
                              {stage.stageTitle}
                            </h3>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-slate-500">{p.percent}%</span>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-slate-400">{stage.stageDesc}</p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {modules.map((m) => (
                          <span key={m} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">
                            {m}
                          </span>
                        ))}
                      </div>

                      <ProgressBar percent={p.percent} className="mt-4" />

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {stage.lessons.length} 节 · 约 {Math.round(minutes / 60)} 小时
                        </span>
                        <span>
                          {p.done}/{p.total} 已掌握
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
