import { Eraser, Play, RotateCcw, Terminal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { CodeRunner, type RunResult } from './CodeRunner';

const SAMPLES: Record<string, string> = {
  python: `# 代码试验场：随便写点什么，点「运行代码」或按 ⌘/Ctrl + Enter
# 代码会在你本机执行，8 秒超时；常用的库（numpy / pandas / torch）都装好了

import numpy as np

print("你好，AI 算法实验室")

a = np.arange(12).reshape(3, 4)
print("矩阵：")
print(a)
print("按列求和：", a.sum(axis=0))

# 试试把下面这行的注释去掉，看会报什么错
# print(1 / 0)
`,
  bash: `# 代码试验场（Bash）：点「运行代码」或按 ⌘/Ctrl + Enter

echo "当前目录：$(pwd)"
echo "Python 版本：$(python3 --version 2>&1)"
echo "文件数：$(ls -a | wc -l | tr -d ' ')"
`,
};

const STORAGE_PREFIX = 'playground-code-';

/**
 * 代码试验场：不绑题目的自由编辑 + 运行。
 * 代码按语言分别存在 localStorage，切换语言/刷新都不丢。
 */
export function PlaygroundPanel({ expanded = false }: { expanded?: boolean }) {
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState('');
  const [runSignal, setRunSignal] = useState(0);
  const [runtimes, setRuntimes] = useState<Record<string, { available: boolean; label: string; version: string }>>({});
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const loadedLangRef = useRef<string | null>(null);

  useEffect(() => {
    void api
      .runtimes()
      .then((r) => setRuntimes(r.runtimes))
      .catch(() => undefined);
  }, []);

  // 切换语言时换出该语言上次的代码（没有就用示例）
  useEffect(() => {
    if (loadedLangRef.current === lang) return;
    loadedLangRef.current = lang;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(`${STORAGE_PREFIX}${lang}`);
    } catch {
      /* 隐私模式 */
    }
    setCode(saved ?? SAMPLES[lang] ?? '');
  }, [lang]);

  useEffect(() => {
    if (loadedLangRef.current !== lang) return;
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${lang}`, code);
    } catch {
      /* 隐私模式 */
    }
  }, [code, lang]);

  const languages = useMemo(
    () =>
      [
        { id: 'python', label: 'Python 3' },
        { id: 'bash', label: 'Bash' },
      ].map((l) => ({ ...l, available: runtimes[l.id]?.available !== false, version: runtimes[l.id]?.version ?? '' })),
    [runtimes],
  );

  const onResult = (_result: RunResult) => {
    /* 试验场不需要额外处理，输出由 CodeRunner 自己渲染 */
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      setRunSignal((n) => n + 1);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const area = event.currentTarget;
      const start = area.selectionStart;
      const end = area.selectionEnd;
      const next = `${code.slice(0, start)}    ${code.slice(end)}`;
      setCode(next);
      window.requestAnimationFrame(() => {
        area.selectionStart = area.selectionEnd = start + 4;
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/8 px-3 py-2">
        <select
          className="field max-w-[130px] !py-1.5 text-xs"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          {languages.map((l) => (
            <option key={l.id} value={l.id} disabled={!l.available}>
              {l.label}
              {l.available ? '' : '（本机没有）'}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn-quiet !px-2 !py-1.5 text-xs"
          title="恢复成示例代码"
          onClick={() => setCode(SAMPLES[lang] ?? '')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          示例
        </button>
        <button
          type="button"
          className="btn-quiet !px-2 !py-1.5 text-xs"
          title="清空"
          onClick={() => setCode('')}
        >
          <Eraser className="h-3.5 w-3.5" />
          清空
        </button>

        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Terminal className="h-3 w-3" />
          ⌘/Ctrl + Enter 运行
        </span>
      </div>

      <textarea
        ref={areaRef}
        className={`w-full shrink-0 resize-none border-b border-white/8 bg-ink-950/70 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-slate-200 outline-none ${
          expanded ? 'h-[46vh] min-h-[240px]' : 'h-[30vh] min-h-[140px]'
        }`}
        spellCheck={false}
        placeholder={SAMPLES[lang] ?? '在这里写点代码…'}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <CodeRunner code={code} lang={lang} runSignal={runSignal} onResult={onResult} />
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
          代码在你本机执行：独立临时目录、8 秒超时、输出截断。需要输入时点上面的「程序输入」。
          {lang === 'python' ? ' numpy / pandas / torch 等都可用。' : ''}
        </p>
      </div>
    </div>
  );
}

/** 整页版：给需要写长代码的时候用 */
export function PlaygroundHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <Play className="h-3 w-3" />
      写长代码可以点右上角展开到整页
    </span>
  );
}
