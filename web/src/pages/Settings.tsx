import { Check, Database, Download, HardDrive, KeyRound, Play, Save, ShieldCheck, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageHeader, SectionBlock } from '../components/ui';
import { TOTALS } from '../lib/content';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

const PRESETS = [
  { id: 'opencode-go', label: 'OpenCode Go', baseUrl: 'https://opencode.ai/zen/go/v1', model: 'deepseek-v4-flash' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet' },
  { id: 'ollama', label: '本地 Ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:14b' },
  { id: 'custom', label: '自定义', baseUrl: '', model: '' },
];

export function Settings() {
  const { tutor, saveSettings, stats } = useStore();
  const [provider, setProvider] = useState(tutor.provider || 'opencode-go');
  const [baseUrl, setBaseUrl] = useState(tutor.baseUrl || PRESETS[0].baseUrl);
  const [model, setModel] = useState(tutor.model || PRESETS[0].model);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [runtimes, setRuntimes] = useState<Record<string, { available: boolean; label: string; version: string }>>({});
  const [backups, setBackups] = useState<{ file: string; size: number; mtime: string }[]>([]);
  const [backupMsg, setBackupMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api
      .runtimes()
      .then((r) => setRuntimes(r.runtimes))
      .catch(() => undefined);
    void api
      .backups()
      .then((r) => setBackups(r.backups))
      .catch(() => undefined);
  }, []);

  // 配置是异步从本地服务读取的，读到后同步到表单，避免显示成无关的默认值
  useEffect(() => {
    if (tutor.baseUrl) setBaseUrl(tutor.baseUrl);
    if (tutor.model) setModel(tutor.model);
    if (tutor.provider) setProvider(tutor.provider);
  }, [tutor.baseUrl, tutor.model, tutor.provider]);

  const applyPreset = (id: string) => {
    setProvider(id);
    const preset = PRESETS.find((p) => p.id === id);
    if (preset && id !== 'custom') {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="设置"
        title="模型接口与本地数据"
        description="所有配置和数据都只保存在本机 data/learning.db。API Key 使用 AES-256-GCM 加密后落盘，密钥文件为 data/.secret（仅本人可读）。"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBlock title="AI 导师模型接口" icon={<KeyRound className="h-4 w-4" />} tone="brand">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">服务商预设</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      provider === p.id
                        ? 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-500">Base URL（OpenAI 兼容）</label>
              <input className="field" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/v1" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-500">模型名</label>
              <input className="field" value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-500">
                API Key {tutor.hasKey ? <span className="text-emerald-400">（已保存，留空则保持不变）</span> : null}
              </label>
              <input
                className="field"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={tutor.hasKey ? '••••••••••••' : 'sk-...'}
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs leading-relaxed text-slate-400">
              当前状态：
              {tutor.hasKey ? (
                <>
                  <span className="text-emerald-300">
                    已接入 {tutor.model || '自定义模型'}
                  </span>
                  {tutor.source === 'env' ? (
                    <span className="text-slate-500">（来自项目根目录 .env，已被 Git 忽略）</span>
                  ) : (
                    <span className="text-slate-500">（来自本页保存的加密配置）</span>
                  )}
                </>
              ) : (
                <span className="text-amber-300">离线讲解模式（未配置模型接口）</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void saveSettings({ provider, baseUrl, model, apiKey }).then(() => {
                    setApiKey('');
                    setSaved(true);
                    window.setTimeout(() => setSaved(false), 2200);
                  });
                }}
              >
                <Save className="h-4 w-4" />
                保存配置
              </button>
              {tutor.hasKey ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void saveSettings({ apiKey: '' }).then(() => setSaved(true))}
                >
                  清除 Key（回到离线模式）
                </button>
              ) : null}
              {saved ? <span className="text-xs text-emerald-300">已保存</span> : null}
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500">
              两种配置方式任选其一：<br />
              ① 在项目根目录建 <code className="text-slate-300">.env</code>（复制{' '}
              <code className="text-slate-300">.env.example</code>），填{' '}
              <code className="text-slate-300">TUTOR_API_KEY / TUTOR_BASE_URL / TUTOR_MODEL</code>——推荐，
              .env 已被 Git 忽略，重启服务即生效；<br />
              ② 直接在本页填写，Key 用 AES-256-GCM 加密后存本地数据库，本页优先级高于 .env。<br />
              Key 只用于本地服务向你指定的接口发请求，不会上传到任何第三方。本地 Ollama 可不填 Key。
            </p>
          </div>
        </SectionBlock>

        <div className="space-y-4">
          <SectionBlock title="本地数据" icon={<Database className="h-4 w-4" />}>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">数据库</dt>
                <dd className="font-mono text-xs text-slate-300">data/learning.db</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">已掌握知识点</dt>
                <dd className="font-mono text-slate-300">
                  {stats.mastered} / {TOTALS.lessons}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">累计答题</dt>
                <dd className="font-mono text-slate-300">{stats.accuracy}% 正确率</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">连续学习</dt>
                <dd className="font-mono text-slate-300">{stats.streak} 天</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                自动备份
                <span className="text-slate-500">每天一份，保留 14 天；服务启动时与每隔 30 分钟刷新</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost !py-1.5 text-xs"
                  onClick={() =>
                    void api.backupNow().then((r) => {
                      setBackups(r.backups);
                      setBackupMsg(r.ok ? '已备份' : '备份失败');
                      window.setTimeout(() => setBackupMsg(''), 2000);
                    })
                  }
                >
                  立即备份
                </button>
                {backups.length ? (
                  <span className="font-mono text-[11px] text-slate-500">
                    最近：{backups[0].file}（{Math.round(backups[0].size / 1024)} KB）
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">还没有备份</span>
                )}
                {backupMsg ? <span className="text-[11px] text-emerald-300">{backupMsg}</span> : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn-ghost" href="/api/export" download="ai-algo-lab-backup.json">
                <Download className="h-4 w-4" />
                导出备份
              </a>
              <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                导入备份
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void file.text().then(async (text) => {
                    try {
                      const res = await fetch('/api/import', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: text,
                      });
                      const data = await res.json();
                      setImportMsg(`已导入 ${data.imported ?? 0} 条记录，刷新页面生效`);
                      window.location.reload();
                    } catch (err) {
                      setImportMsg(`导入失败：${String((err as Error).message)}`);
                    }
                  });
                }}
              />
            </div>
            {importMsg ? <p className="mt-2 text-xs text-slate-400">{importMsg}</p> : null}
          </SectionBlock>

          <SectionBlock title="代码运行环境" icon={<Play className="h-4 w-4" />} tone="brand">
            <p className="mb-3 text-xs leading-relaxed text-slate-400">
              练习里的编程题和讲义里的代码块可以直接点「运行代码」，代码会**在你本机**跑一遍并显示真实输出。
              每次运行使用独立临时目录、8 秒超时、输出截断，不继承你的环境变量。
            </p>
            <ul className="space-y-2 text-xs">
              {Object.entries(runtimes).map(([key, info]) => (
                <li key={key} className="flex items-center gap-2">
                  {info.available ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  )}
                  <span className={info.available ? 'text-slate-200' : 'text-slate-500'}>{info.label}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-500">
                    {info.version || (info.available ? '' : '未检测到')}
                  </span>
                </li>
              ))}
            </ul>
            {!runtimes.cuda?.available ? (
              <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
                CUDA 需要 NVIDIA 显卡与 nvcc，本机没有，所以 GPU 阶段的代码只能阅读、不能运行。
              </p>
            ) : null}
          </SectionBlock>

          <SectionBlock title="关于这个学习站" icon={<HardDrive className="h-4 w-4" />}>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
              <li>· 课程与界面都在本机：前端资源、课程内容、学习数据全部打包/保存在本地，不依赖任何在线服务。</li>
              <li>· 只有你主动使用 AI 导师时，才会向你配置的模型接口发起请求；不配也能用基于课程内容的离线讲解。</li>
              <li>· 数据不出本机：进度、错题、笔记、学习时长全部写入本地 SQLite。</li>
              <li>
                · 课程规模：{TOTALS.stages} 个阶段 / {TOTALS.lessons} 个知识点 / {TOTALS.quizzes} 道练习题 /{' '}
                {TOTALS.interviewPoints} 条面试考点。
              </li>
              <li>
                · 重新生成内容索引或校验内容：<code className="text-slate-300">npm run validate</code>
              </li>
              <li>
                · 备份数据库：直接复制 <code className="text-slate-300">data/learning.db</code> 即可。
              </li>
            </ul>
          </SectionBlock>
        </div>
      </div>
    </>
  );
}
