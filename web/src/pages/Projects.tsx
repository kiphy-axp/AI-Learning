import { CheckSquare, Square } from 'lucide-react';
import { PageHeader, ProgressBar } from '../components/ui';
import { useStore } from '../lib/store';

/** 六级实战路线：从数据处理一路做到完整 LLM 项目 */
const PROJECTS = [
  {
    id: 'p1',
    level: 1,
    title: 'Python 数据分析项目',
    goal: '用 Pandas 分析一份真实数据集，产出可读报告与图表。',
    tech: ['Python', 'Pandas', 'Matplotlib'],
    tasks: ['读入并清洗数据集（缺失值、异常值、类型转换）', '完成 5 项统计指标', '绘制 3 张可视化图', '输出 Markdown 分析报告'],
    deliverable: '一份带图表的 report.md + 可复现脚本',
  },
  {
    id: 'p2',
    level: 2,
    title: '经典机器学习预测模型',
    goal: '用 scikit-learn 训练分类/回归模型，做完整的评估与调参对比。',
    tech: ['scikit-learn', 'Pandas', 'Matplotlib'],
    tasks: ['划分训练/验证/测试集并防止数据泄漏', '训练 3 种模型（线性、树、集成）', '用 PR/AUC/F1 评估并对比', '做一次网格或贝叶斯调参', '保存最佳模型并写出推理脚本'],
    deliverable: '模型对比表 + 最佳模型 + 推理脚本',
  },
  {
    id: 'p3',
    level: 3,
    title: 'PyTorch 图像分类',
    goal: '在 CIFAR-10 上实现并训练一个 CNN，理解训练循环的每个环节。',
    tech: ['PyTorch', 'CNN'],
    tasks: ['搭建 CNN 网络（含 BatchNorm）', '实现完整训练/验证循环', '可视化训练曲线与混淆矩阵', '达到 70%+ 测试准确率', '用 torch profiler 看一次耗时分布'],
    deliverable: '训练脚本 + 曲线图 + 准确率记录',
  },
  {
    id: 'p4',
    level: 4,
    title: '从零实现 Transformer 与语言模型',
    goal: '不用 nn.Transformer，自己实现注意力与 Transformer Block，并训练一个字符级语言模型。',
    tech: ['PyTorch', 'Transformer'],
    tasks: ['实现 Scaled Dot-Product Attention', '实现 Multi-Head Attention 与因果掩码', '实现完整 Transformer Block（含 LayerNorm、残差、FFN）', '训练字符级语言模型并采样生成', '对比有无位置编码的效果'],
    deliverable: '可训练代码 + 生成样例 + 实验对比记录',
  },
  {
    id: 'p5',
    level: 5,
    title: 'LoRA 微调 + 量化推理',
    goal: '在一个开源小模型上做 LoRA 微调，并用量化方式部署推理服务。',
    tech: ['transformers', 'peft', 'bitsandbytes'],
    tasks: ['准备指令数据集并划分训练/验证', '用 LoRA 微调（记录可训练参数占比）', '对比微调前后在验证集上的表现', '用 4bit 量化加载并测量显存占用', '写出可复用的推理接口'],
    deliverable: '微调脚本 + 显存/效果对比表 + 推理 demo',
  },
  {
    id: 'p6',
    level: 6,
    title: '论文复现 + 性能优化',
    goal: '选一篇近两年的论文，复现其核心改进，并做一次性能剖析与优化。',
    tech: ['PyTorch', 'CUDA', 'Profiling'],
    tasks: ['精读论文并写出关键点摘要', '找到官方或第三方实现并对齐 baseline', '复现核心改进并在同一数据集上对比', '用 profiler 找出瓶颈算子', '做一次 kernel 级或显存级优化并记录提升'],
    deliverable: '复现报告（含 baseline 对比与优化前后数据）',
  },
];

export function Projects() {
  const { projectTasks, toggleProjectTask } = useStore();

  const doneCount = (projectId: string, total: number) =>
    Array.from({ length: total }, (_, i) =>
      projectTasks.find((t) => t.project_id === projectId && t.task_index === i)?.done ? 1 : 0,
    ).reduce((a: number, b) => a + b, 0);

  const totalTasks = PROJECTS.reduce((sum, p) => sum + p.tasks.length, 0);
  const totalDone = PROJECTS.reduce((sum, p) => sum + doneCount(p.id, p.tasks.length), 0);

  return (
    <>
      <PageHeader
        eyebrow="实战项目"
        title="六级项目路线"
        description="知识点学完必须落到项目上。按顺序做，每个项目的产出都能直接写进简历。勾选状态保存在本地数据库。"
        actions={
          <div className="w-48">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
              <span>总体完成</span>
              <span className="font-mono">
                {totalDone}/{totalTasks}
              </span>
            </div>
            <ProgressBar percent={totalTasks ? (totalDone / totalTasks) * 100 : 0} />
          </div>
        }
      />

      <div className="space-y-4">
        {PROJECTS.map((project) => {
          const done = doneCount(project.id, project.tasks.length);
          const percent = (done / project.tasks.length) * 100;
          return (
            <section key={project.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500/25 to-accent-500/25 font-mono text-xs text-brand-200">
                      L{project.level}
                    </span>
                    <h2 className="text-base font-semibold text-slate-100">{project.title}</h2>
                    <span className="font-mono text-xs text-slate-500">
                      {done}/{project.tasks.length}
                    </span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{project.goal}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {project.tech.map((t) => (
                      <span key={t} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-40">
                  <ProgressBar percent={percent} />
                </div>
              </div>

              <ul className="mt-4 space-y-1.5">
                {project.tasks.map((task, index) => {
                  const isDone = Boolean(
                    projectTasks.find((t) => t.project_id === project.id && t.task_index === index)?.done,
                  );
                  return (
                    <li key={index}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white/5"
                        onClick={() => void toggleProjectTask(project.id, index, !isDone)}
                      >
                        {isDone ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        )}
                        <span className={isDone ? 'text-slate-500 line-through' : 'text-slate-300'}>{task}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-400">
                <span className="text-slate-500">交付物：</span>
                {project.deliverable}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
