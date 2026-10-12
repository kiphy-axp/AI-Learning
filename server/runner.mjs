/**
 * 本机代码运行器：把网页里写的代码落到临时目录里真跑一遍。
 *
 * 定位：这是给**你自己**用的本地学习工具，代码在你的机器上执行，
 * 和你在终端里敲 `python3 xxx.py` 没有区别。隔离手段只是防手滑：
 *   - 每次运行一个独立临时目录，作为工作目录与 HOME
 *   - CPU 时间上限（ulimit -t）+ 墙钟超时（到点杀整个进程组）
 *   - stdout / stderr 各截断到 64KB
 *   - 不继承你的环境变量（只给 PATH / LANG 等最小集合）
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAX_OUTPUT = 64 * 1024;
const MAX_CODE = 20_000;

const RUNTIMES = {
  python: { label: 'Python 3', cmd: 'python3', ext: 'py' },
  bash: { label: 'Bash', cmd: 'bash', ext: 'sh' },
};

/** 启动时探测一次，决定界面上哪些语言显示「运行」按钮 */
export function detectRuntimes() {
  const result = {};
  for (const [key, runtime] of Object.entries(RUNTIMES)) {
    const probe = spawnSync(runtime.cmd, ['--version'], { encoding: 'utf8', timeout: 4000 });
    result[key] = {
      available: probe.status === 0,
      label: runtime.label,
      version: (probe.stdout || probe.stderr || '').trim().split('\n')[0] || '',
    };
  }
  // CUDA 需要 nvcc + NVIDIA 显卡，macOS 上一般没有
  const nvcc = spawnSync('nvcc', ['--version'], { encoding: 'utf8', timeout: 4000 });
  result.cuda = { available: nvcc.status === 0, label: 'CUDA (nvcc)', version: '' };
  return result;
}

const RUNTIME_INFO = detectRuntimes();

export function runtimeStatus() {
  return RUNTIME_INFO;
}

function truncate(text) {
  if (text.length <= MAX_OUTPUT) return { text, truncated: false };
  return { text: `${text.slice(0, MAX_OUTPUT)}\n…（输出过长，已截断）`, truncated: true };
}

export async function runCode({ lang = 'python', code, stdin = '', timeoutMs = 8000 }) {
  const runtime = RUNTIMES[lang];
  if (!runtime) return { ok: false, error: `不支持在网页里运行 ${lang}，目前只支持 Python 与 Bash。` };
  if (!RUNTIME_INFO[lang]?.available) {
    return { ok: false, error: `本机没有找到 ${runtime.cmd}，无法运行。` };
  }
  if (typeof code !== 'string' || !code.trim()) return { ok: false, error: '代码是空的。' };
  if (code.length > MAX_CODE) return { ok: false, error: `代码太长（上限 ${MAX_CODE} 字符）。` };

  const dir = await mkdtemp(join(tmpdir(), 'ai-algo-lab-run-'));
  const file = join(dir, `main.${runtime.ext}`);
  await writeFile(file, code, 'utf8');

  const wallMs = Math.max(1000, Math.min(30_000, Number(timeoutMs) || 8000));
  const cpuSeconds = Math.max(1, Math.ceil(wallMs / 1000));
  // 用 bash 包一层以设置 CPU 上限；exec 让信号直接作用到目标进程
  const command = `ulimit -t ${cpuSeconds} 2>/dev/null; exec ${runtime.cmd} ${JSON.stringify(file)}`;

  const startedAt = Date.now();
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let outputTruncated = false;

  const child = spawn('/bin/bash', ['-c', command], {
    cwd: dir,
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
      HOME: dir,
      TMPDIR: dir,
      LANG: process.env.LANG ?? 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL ?? '',
      PYTHONIOENCODING: 'utf-8',
      PYTHONDONTWRITEBYTECODE: '1',
      PYTHONUNBUFFERED: '1',
    },
  });

  const killTree = (signal = 'SIGKILL') => {
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {
        /* 已经退出 */
      }
    }
  };

  const timer = setTimeout(() => {
    timedOut = true;
    killTree();
  }, wallMs);

  child.stdout.on('data', (chunk) => {
    const { text, truncated } = truncate(stdout + chunk.toString('utf8'));
    stdout = text;
    outputTruncated = outputTruncated || truncated;
  });
  child.stderr.on('data', (chunk) => {
    const { text, truncated } = truncate(stderr + chunk.toString('utf8'));
    stderr = text;
    outputTruncated = outputTruncated || truncated;
  });

  if (stdin) child.stdin.write(String(stdin).slice(0, 20_000));
  child.stdin.end();

  const exitCode = await new Promise((resolve) => {
    child.on('error', (err) => {
      stderr += `\n[运行器错误] ${err.message}`;
      resolve(-1);
    });
    child.on('close', (code, signal) => resolve(signal ? -1 : (code ?? -1)));
  });

  clearTimeout(timer);
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);

  const durationMs = Date.now() - startedAt;
  const hints = [];
  if (timedOut) {
    hints.push(
      `[已超时] 运行超过 ${(wallMs / 1000).toFixed(1)} 秒，进程已被终止。多半是死循环；如果程序在等输入，请点「程序输入」把内容填进去。`,
    );
  } else if (/EOFError|EOF when reading|input\(\)/i.test(stderr)) {
    hints.push('[提示] 程序在等输入（input），但没拿到内容。点「程序输入」填入后再运行一次。');
  }
  const timedOutNote = hints.length ? `\n\n${hints.join('\n')}` : '';

  return {
    ok: !timedOut && exitCode === 0,
    exitCode,
    stdout: stdout || '',
    stderr: stderr + timedOutNote,
    durationMs,
    timedOut,
    outputTruncated,
    runtime: lang,
    runtimeLabel: runtime.label,
  };
}
