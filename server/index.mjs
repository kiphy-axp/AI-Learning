/**
 * 本地学习站服务：静态站点 + 本地 API（node:sqlite）。
 * 启动：node server/index.mjs   （或双击「启动学习站.command」）
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import {
  PROJECT_ROOT,
  addStudySeconds,
  createNote,
  deleteNote,
  encryptSecret,
  exportAll,
  getSetting,
  listAttempts,
  listBookmarks,
  listNotes,
  listProgress,
  listProjectTasks,
  listStudyDays,
  recordAttempt,
  setLessonStatus,
  setSetting,
  toggleBookmark,
  toggleProjectTask,
  updateNote,
  upsertProgress,
} from './db.mjs';
import { gradeAnswer, offlineAnswer, publicTutorConfig, remoteAnswer, TUTOR_MODES } from './tutor.mjs';

const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? '127.0.0.1';
const DIST = join(PROJECT_ROOT, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function readBody(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('请求体不是合法 JSON');
  }
}

/* ------------------------------------------------------------- API 路由 */

async function handleApi(req, res, pathname) {
  const method = req.method ?? 'GET';

  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'ai-algo-lab', hasDist: existsSync(DIST) });
  }

  if (pathname === '/api/state' && method === 'GET') {
    return sendJson(res, 200, {
      progress: listProgress(),
      attempts: listAttempts(800),
      studyDays: listStudyDays(),
      notesCount: listNotes().length,
      projectTasks: listProjectTasks(),
      bookmarks: listBookmarks(),
      tutor: publicTutorConfig(),
      plan: publicPlan(),
    });
  }

  if (pathname === '/api/progress' && method === 'POST') {
    const body = await readBody(req);
    if (!body.lessonSlug) return sendJson(res, 400, { error: 'lessonSlug 必填' });
    if (body.status && !body.score) {
      setLessonStatus(body.lessonSlug, body.stageSlug, body.status);
      return sendJson(res, 200, { ok: true, progress: listProgress() });
    }
    const row = upsertProgress(body);
    return sendJson(res, 200, { ok: true, row });
  }

  if (pathname === '/api/quiz/attempt' && method === 'POST') {
    const body = await readBody(req);
    if (!body.lessonSlug || !body.questionId) {
      return sendJson(res, 400, { error: 'lessonSlug 与 questionId 必填' });
    }
    recordAttempt({
      lessonSlug: body.lessonSlug,
      questionId: body.questionId,
      questionType: body.questionType,
      correct: Boolean(body.correct),
      answer: typeof body.answer === 'string' ? body.answer.slice(0, 4000) : '',
    });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/notes') {
    if (method === 'GET') return sendJson(res, 200, { notes: listNotes() });
    if (method === 'POST') {
      const body = await readBody(req);
      if (!body.title?.trim()) return sendJson(res, 400, { error: '标题必填' });
      createNote(body);
      return sendJson(res, 200, { ok: true, notes: listNotes() });
    }
  }

  if (pathname.startsWith('/api/notes/')) {
    const id = Number(pathname.split('/').pop());
    if (!Number.isInteger(id)) return sendJson(res, 400, { error: '笔记 id 非法' });
    if (method === 'PUT') {
      const body = await readBody(req);
      updateNote(id, body);
      return sendJson(res, 200, { ok: true, notes: listNotes() });
    }
    if (method === 'DELETE') {
      deleteNote(id);
      return sendJson(res, 200, { ok: true, notes: listNotes() });
    }
  }

  if (pathname === '/api/projects' && method === 'POST') {
    const body = await readBody(req);
    toggleProjectTask(body.projectId, body.taskIndex, body.done);
    return sendJson(res, 200, { ok: true, projectTasks: listProjectTasks() });
  }

  if (pathname === '/api/bookmarks' && method === 'POST') {
    const body = await readBody(req);
    if (!body.lessonSlug) return sendJson(res, 400, { error: 'lessonSlug 必填' });
    const active = toggleBookmark(body.lessonSlug);
    return sendJson(res, 200, { ok: true, active, bookmarks: listBookmarks() });
  }

  if (pathname === '/api/heartbeat' && method === 'POST') {
    const body = await readBody(req);
    addStudySeconds(body.seconds);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/settings') {
    if (method === 'GET') {
      return sendJson(res, 200, { tutor: publicTutorConfig(), plan: publicPlan(), modes: TUTOR_MODES });
    }
    if (method === 'POST') {
      const body = await readBody(req);
      if (typeof body.provider === 'string') setSetting('tutor_provider', body.provider);
      if (typeof body.baseUrl === 'string') setSetting('tutor_base_url', body.baseUrl.trim());
      if (typeof body.model === 'string') setSetting('tutor_model', body.model.trim());
      if (typeof body.apiKey === 'string') {
        if (body.apiKey.trim()) setSetting('tutor_api_key_enc', encryptSecret(body.apiKey.trim()));
        else setSetting('tutor_api_key_enc', '');
      }
      if (body.planWeeklyHours !== undefined) {
        const hours = Math.max(1, Math.min(60, Number(body.planWeeklyHours) || 6));
        setSetting('plan_weekly_hours', String(hours));
      }
      if (typeof body.planStartDate === 'string') setSetting('plan_start_date', body.planStartDate.trim());
      return sendJson(res, 200, { ok: true, tutor: publicTutorConfig(), plan: publicPlan() });
    }
  }

  if (pathname === '/api/tutor' && method === 'POST') {
    const body = await readBody(req);
    const payload = {
      message: typeof body.message === 'string' ? body.message.slice(0, 4000) : '',
      mode: TUTOR_MODES[body.mode] ? body.mode : 'free',
      context: body.context ?? null,
      history: Array.isArray(body.history) ? body.history : [],
    };
    const remote = await remoteAnswer(payload);
    if (remote.ok) {
      return sendJson(res, 200, { ok: true, source: 'model', model: remote.model, content: remote.content });
    }
    const fallback = offlineAnswer(payload);
    return sendJson(res, 200, {
      ok: true,
      source: 'offline',
      reason: remote.reason,
      content: fallback,
    });
  }

  if (pathname === '/api/grade' && method === 'POST') {
    const body = await readBody(req);
    if (!body.answer || String(body.answer).trim().length < 2) {
      return sendJson(res, 400, { error: '回答太短，没法批改' });
    }
    const result = await gradeAnswer({
      prompt: body.prompt,
      reference: body.reference,
      keywords: body.keywords,
      answer: body.answer,
    });
    return sendJson(res, 200, result);
  }

  if (pathname === '/api/export' && method === 'GET') {
    return sendJson(res, 200, exportAll());
  }

  if (pathname === '/api/import' && method === 'POST') {
    const body = await readBody(req, 20 * 1024 * 1024);
    let imported = 0;
    for (const row of body.progress ?? []) {
      if (row.lesson_slug) {
        upsertProgress({
          lessonSlug: row.lesson_slug,
          stageSlug: row.stage_slug,
          status: row.status,
          score: row.best_score,
          seconds: row.seconds_spent,
        });
        imported += 1;
      }
    }
    for (const note of body.notes ?? []) {
      if (note.title) createNote({ title: note.title, body: note.body, lessonSlug: note.lesson_slug, tags: note.tags });
      imported += 1;
    }
    return sendJson(res, 200, { ok: true, imported });
  }

  return sendJson(res, 404, { error: `未知接口：${method} ${pathname}` });
}

/** 学习计划设置：每周可投入小时数 + 起始日期 */
function publicPlan() {
  return {
    weeklyHours: Number(getSetting('plan_weekly_hours', '6')) || 6,
    startDate: getSetting('plan_start_date', ''),
  };
}

/* ------------------------------------------------------------ 静态文件 */

function serveStatic(req, res, pathname) {
  if (!existsSync(DIST)) {
    res.writeHead(503, { 'content-type': 'text/html; charset=utf-8' });
    res.end(
      `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:40px;line-height:1.8">
       <h1>还没有构建前端</h1>
       <p>请先在项目目录执行：</p>
       <pre style="background:#f4f4f5;padding:12px;border-radius:8px">npm run build</pre>
       <p>然后再刷新本页；或直接双击「启动学习站.command」，它会自动完成构建。</p>
       </body>`,
    );
    return;
  }

  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST, safePath);
  if (!filePath.startsWith(DIST)) filePath = join(DIST, 'index.html');
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, 'index.html');
  }

  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  createReadStream(filePath).pipe(res);
}

/* ---------------------------------------------------------------- 启动 */

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${HOST}:${PORT}`}`);
  const pathname = url.pathname;

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: '仅支持 GET' });
    }
    serveStatic(req, res, pathname);
  } catch (err) {
    console.error('[api error]', pathname, err);
    if (!res.headersSent) sendJson(res, 500, { error: String(err?.message ?? err) });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`\n  AI 算法实验室 · 本地学习站`);
  console.log(`  ${url}`);
  console.log(`  数据文件：${join(PROJECT_ROOT, 'data', 'learning.db')}`);
  console.log(`  停止服务：Ctrl+C\n`);
  if (process.env.OPEN_BROWSER === '1') {
    import('node:child_process').then(({ spawn }) => {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    });
  }
});

process.on('SIGINT', () => {
  console.log('\n已停止服务，学习数据已保存在本地。');
  process.exit(0);
});
