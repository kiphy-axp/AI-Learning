import { AlertTriangle, ChevronDown, Loader2, Play, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type RunResult = {
  ok: boolean;
  error?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  timedOut?: boolean;
  outputTruncated?: boolean;
  runtimeLabel?: string;
};

/** 运行时可用性只查一次，页面里多个代码块共用 */
let runtimesPromise: Promise<Record<string, { available: boolean; label: string; version: string }>> | null = null;
function loadRuntimes() {
  runtimesPromise ??= api
    .runtimes()
    .then((r) => r.runtimes)
    .catch(() => ({}));
  return runtimesPromise;
}

const RUNNABLE = new Set(['python', 'bash']);

/** 编程题没有 lang 字段，从代码内容推断该用哪个运行时 */
export function inferRunLang(code: string): string {
  const text = code ?? '';
  if (/__global__|#include\s*<cuda|cudaMalloc|<<<|torch\.cuda/.test(text)) return 'cuda';
  if (/^#!\/bin\/(ba)?sh|\bnsys\b|\bncu\b|\bnvcc\b|^\s*(apt|brew|pip|conda)\s/m.test(text)) return 'bash';
  return 'python';
}

/**
 * 代码运行面板：把网页里的代码在本机跑一遍，直接看输出。
 * 只负责工具栏与输出，代码编辑区由调用方提供。
 */
export function CodeRunner({
  code,
  lang,
  className = '',
  runSignal = 0,
  onResult,
}: {
  code: string;
  lang: string;
  className?: string;
  /** 递增这个值即触发一次运行（用于 Ctrl/Cmd+Enter 等外部触发） */
  runSignal?: number;
  /** 把每次运行结果回传给调用方（练习页用它参与判分） */
  onResult?: (result: RunResult) => void;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [runtimeLabel, setRuntimeLabel] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);

  const normalized = (lang || '').toLowerCase();
  const runnable = RUNNABLE.has(normalized);

  useEffect(() => {
    if (!runnable) return;
    let alive = true;
    void loadRuntimes().then((runtimes) => {
      if (!alive) return;
      setAvailable(Boolean(runtimes[normalized]?.available));
      setRuntimeLabel(runtimes[normalized]?.version || runtimes[normalized]?.label || '');
    });
    return () => {
      alive = false;
    };
  }, [normalized, runnable]);

  const run = async () => {
    if (!runnable || running) return;
    setRunning(true);
    try {
      const res = await api.run({ lang: normalized, code, stdin, timeoutMs: 8000 });
      setResult(res);
      onResult?.(res);
    } catch (err) {
      const failed = { ok: false, error: String((err as Error).message), stderr: String((err as Error).message) };
      setResult(failed);
      onResult?.(failed);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (runSignal > 0 && runnable && available) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  if (!runnable) {
    return (
      <div className={`text-[11px] text-slate-500 ${className}`}>
        这段是 {lang || '文本'}，本机没有对应的运行环境（网页里可运行 Python 与 Bash；CUDA 需要 NVIDIA 显卡 + nvcc）。
      </div>
    );
  }

  const hasOutput = Boolean(result?.stdout || result?.stderr || result?.error);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary !py-1.5 text-xs"
          disabled={running || available === false}
          onClick={() => void run()}
          title={available === false ? '本机没有找到对应的解释器' : '在你本机运行这段代码'}
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? '运行中…' : '运行代码'}
        </button>
        <button
          type="button"
          className="btn-quiet !py-1.5 text-xs"
          onClick={() => setShowStdin((v) => !v)}
        >
          <Terminal className="h-3.5 w-3.5" />
          程序输入
          <ChevronDown className={`h-3 w-3 transition ${showStdin ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-[11px] text-slate-500">
          {available === false
            ? '本机未检测到运行环境'
            : runtimeLabel
              ? `${runtimeLabel} · 在你本机执行，8 秒超时`
              : '在你本机执行，8 秒超时'}
        </span>
      </div>

      {showStdin ? (
        <textarea
          className="field mt-2 min-h-[60px] resize-y font-mono text-xs"
          placeholder="如果程序需要 input()，把要输入的内容写在这里（每行一个）"
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
        />
      ) : null}

      {result ? (
        <div className="mt-2.5 overflow-hidden rounded-xl border border-white/10">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${
              result.ok
                ? 'bg-emerald-500/10 text-emerald-300'
                : result.timedOut
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'bg-rose-500/10 text-rose-300'
            }`}
          >
            {result.ok ? (
              <Play className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            <span>
              {result.ok
                ? '运行成功'
                : result.timedOut
                  ? '运行超时，已终止'
                  : `运行结束（退出码 ${result.exitCode ?? '?'}）`}
            </span>
            {result.durationMs !== undefined ? (
              <span className="text-slate-500">{(result.durationMs / 1000).toFixed(2)}s</span>
            ) : null}
            {result.outputTruncated ? <span className="text-slate-500">输出已截断</span> : null}
          </div>

          {result.error ? <pre className="code-block m-0 rounded-none border-0">{result.error}</pre> : null}

          {result.stdout ? (
            <pre className="code-block m-0 rounded-none border-0 border-t border-white/5">{result.stdout}</pre>
          ) : null}

          {result.stderr ? (
            <pre className="code-block m-0 rounded-none border-0 border-t border-white/5 text-rose-200">
              {result.stderr}
            </pre>
          ) : null}

          {!hasOutput ? (
            <pre className="code-block m-0 rounded-none border-0 text-slate-500">
              {'（这段代码没有任何输出——只定义函数是不会自己运行的，可以在下面加几行调用并 print 看看结果）'}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
