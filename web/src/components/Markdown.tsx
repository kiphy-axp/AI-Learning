import katex from 'katex';
import { Fragment, useMemo, useState, type ReactNode } from 'react';

/**
 * 轻量 Markdown 渲染器：支持标题、粗体、行内代码、代码块、列表、引用、链接
 * 以及 KaTeX 行内 $...$ 与独立 $$...$$ 公式。
 * 不引入 react-markdown，避免额外依赖。
 */

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 行内格式：`code`、**bold**、*italic*、[text](url)，其余转义 */
function inlineToHtml(text: string): string {
  const slots: string[] = [];
  const stash = (html: string) => {
    slots.push(html);
    return `\u0000${slots.length - 1}\u0000`;
  };

  let out = text
    .replace(/\$\$([^$]+)\$\$/g, (_m, tex) => stash(renderMath(String(tex).trim(), true)))
    .replace(/\$([^$\n]+)\$/g, (_m, tex) => stash(renderMath(String(tex).trim(), false)))
    .replace(/`([^`]+)`/g, (_m, code) => stash(`<code class="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em]">${escapeHtml(String(code))}</code>`))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label, href) =>
      stash(
        `<a class="text-brand-400 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-300" href="${escapeHtml(
          String(href),
        )}" target="_blank" rel="noreferrer">${escapeHtml(String(label))}</a>`,
      ),
    );

  out = escapeHtml(out);
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => slots[Number(i)] ?? '');
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative my-3">
      <div className="absolute right-2 top-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
        {lang ? <span className="text-[11px] uppercase tracking-wide text-slate-500">{lang}</span> : null}
        <button
          type="button"
          className="rounded-md border border-white/10 bg-ink-900/90 px-2 py-1 text-[11px] text-slate-300 hover:bg-ink-800"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            });
          }}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderBlocks(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  let listBuffer: string[] = [];
  let listOrdered = false;
  let key = 0;

  const flushList = () => {
    if (!listBuffer.length) return;
    const Tag = listOrdered ? 'ol' : 'ul';
    nodes.push(
      <Tag
        key={`list-${key++}`}
        className={`my-3 space-y-1.5 pl-5 ${listOrdered ? 'list-decimal' : 'list-disc'} marker:text-slate-500`}
      >
        {listBuffer.map((item, idx) => (
          <li key={idx} className="leading-[1.85] text-slate-300" dangerouslySetInnerHTML={{ __html: inlineToHtml(item) }} />
        ))}
      </Tag>,
    );
    listBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (line.trimStart().startsWith('```')) {
      flushList();
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      nodes.push(<CodeBlock key={`code-${key++}`} code={buf.join('\n')} lang={lang} />);
      continue;
    }

    // 独立公式
    if (line.trim().startsWith('$$')) {
      flushList();
      const trimmed = line.trim();
      if (trimmed.length > 4 && trimmed.endsWith('$$')) {
        nodes.push(
          <div
            key={`math-${key++}`}
            dangerouslySetInnerHTML={{ __html: renderMath(trimmed.slice(2, -2).trim(), true) }}
          />,
        );
        i += 1;
        continue;
      }
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      nodes.push(
        <div key={`math-${key++}`} dangerouslySetInnerHTML={{ __html: renderMath(buf.join('\n').trim(), true) }} />,
      );
      continue;
    }

    // 标题
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const cls =
        level <= 2
          ? 'mt-5 mb-2 text-lg font-semibold text-slate-100'
          : 'mt-4 mb-1.5 text-base font-semibold text-slate-100';
      nodes.push(
        <div key={`h-${key++}`} className={cls} dangerouslySetInnerHTML={{ __html: inlineToHtml(heading[2]) }} />,
      );
      i += 1;
      continue;
    }

    // 引用
    if (line.trimStart().startsWith('>')) {
      flushList();
      const buf: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      nodes.push(
        <blockquote
          key={`q-${key++}`}
          className="my-3 rounded-r-xl border-l-2 border-brand-500/50 bg-brand-500/5 py-2 pl-4 pr-3 text-sm text-slate-300"
          dangerouslySetInnerHTML={{ __html: inlineToHtml(buf.join(' ')) }}
        />,
      );
      continue;
    }

    // 列表
    const bullet = /^\s*([-*+])\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      if (listBuffer.length && listOrdered !== Boolean(ordered)) flushList();
      listOrdered = Boolean(ordered);
      listBuffer.push(bullet ? bullet[2] : ordered![1]);
      i += 1;
      continue;
    }

    // 空行
    if (!line.trim()) {
      flushList();
      i += 1;
      continue;
    }

    // 段落
    flushList();
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith('```') &&
      !lines[i].trim().startsWith('$$') &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*([-*+])\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trimStart().startsWith('>')
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p
        key={`p-${key++}`}
        className="my-3 leading-[1.9] text-slate-300"
        dangerouslySetInnerHTML={{ __html: inlineToHtml(buf.join('\n')).replace(/\n/g, '<br/>') }}
      />,
    );
  }

  flushList();
  return nodes;
}

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  const nodes = useMemo(() => renderBlocks(children ?? ''), [children]);
  return <div className={className}>{nodes}</div>;
}

export function InlineMarkdown({ children }: { children: string }) {
  return <span dangerouslySetInnerHTML={{ __html: inlineToHtml(children ?? '') }} />;
}

export { CodeBlock, inlineToHtml };
