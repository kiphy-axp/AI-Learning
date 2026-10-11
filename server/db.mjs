/**
 * 本地数据层：Node 内置 node:sqlite，零原生依赖。
 * 数据库文件：data/learning.db
 * 密钥文件：  data/.secret（0600，用于加密保存在本地的模型 API Key）
 */
import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(here, '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');

mkdirSync(DATA_DIR, { recursive: true });

/* ---------------------------------------------------------------- 数据库 */

export const db = new DatabaseSync(join(DATA_DIR, 'learning.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS lesson_progress (
    lesson_slug    TEXT PRIMARY KEY,
    stage_slug     TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'not-started',
    attempts       INTEGER NOT NULL DEFAULT 0,
    correct_count  INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    best_score     INTEGER NOT NULL DEFAULT 0,
    seconds_spent  INTEGER NOT NULL DEFAULT 0,
    visited_at     TEXT,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_slug   TEXT NOT NULL,
    question_id   TEXT NOT NULL,
    question_type TEXT,
    correct       INTEGER NOT NULL,
    answer        TEXT,
    answered_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_quiz_lesson ON quiz_attempts (lesson_slug);

  CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    lesson_slug TEXT,
    tags        TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_tasks (
    project_id  TEXT NOT NULL,
    task_index  INTEGER NOT NULL,
    done        INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (project_id, task_index)
  );

  CREATE TABLE IF NOT EXISTS study_days (
    day        TEXT PRIMARY KEY,
    seconds    INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    lesson_slug TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const now = () => new Date().toISOString();

/* ------------------------------------------------------------ 密钥与加密 */

const SECRET_FILE = join(DATA_DIR, '.secret');

function loadSecret() {
  if (existsSync(SECRET_FILE)) {
    const raw = readFileSync(SECRET_FILE);
    if (raw.length === 32) return raw;
  }
  const key = randomBytes(32);
  writeFileSync(SECRET_FILE, key);
  try {
    chmodSync(SECRET_FILE, 0o600);
  } catch {
    /* 忽略：部分文件系统不支持 chmod */
  }
  return key;
}

const secret = loadSecret();

export function encryptSecret(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(payload) {
  try {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    const decipher = createDecipheriv('aes-256-gcm', secret, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

/* ---------------------------------------------------------------- 设置 */

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, String(value));
}

export function deleteSetting(key) {
  db.prepare('DELETE FROM settings WHERE key = ?').run(key);
}

/* ------------------------------------------------------------ 学习进度 */

const STATUSES = ['not-started', 'learning', 'review', 'mastered'];

export function upsertProgress({ lessonSlug, stageSlug, status, score, seconds }) {
  const existing = db.prepare('SELECT * FROM lesson_progress WHERE lesson_slug = ?').get(lessonSlug);
  const nextStatus = STATUSES.includes(status) ? status : existing?.status ?? 'learning';
  const bestScore = Math.max(existing?.best_score ?? 0, Number(score) || 0);
  db.prepare(
    `INSERT INTO lesson_progress
       (lesson_slug, stage_slug, status, attempts, correct_count, question_count, best_score, seconds_spent, visited_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(lesson_slug) DO UPDATE SET
       stage_slug     = excluded.stage_slug,
       status         = excluded.status,
       attempts       = excluded.attempts,
       correct_count  = excluded.correct_count,
       question_count = excluded.question_count,
       best_score     = excluded.best_score,
       seconds_spent  = excluded.seconds_spent,
       visited_at     = COALESCE(excluded.visited_at, lesson_progress.visited_at),
       updated_at     = excluded.updated_at`,
  ).run(
    lessonSlug,
    stageSlug ?? existing?.stage_slug ?? '',
    nextStatus,
    existing?.attempts ?? 0,
    existing?.correct_count ?? 0,
    existing?.question_count ?? 0,
    bestScore,
    (existing?.seconds_spent ?? 0) + (Number(seconds) || 0),
    now(),
    now(),
  );
  return db.prepare('SELECT * FROM lesson_progress WHERE lesson_slug = ?').get(lessonSlug);
}

export function listProgress() {
  return db.prepare('SELECT * FROM lesson_progress').all();
}

export function recordAttempt({ lessonSlug, questionId, questionType, correct, answer }) {
  db.prepare(
    'INSERT INTO quiz_attempts (lesson_slug, question_id, question_type, correct, answer, answered_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(lessonSlug, questionId, questionType ?? '', correct ? 1 : 0, answer ?? '', now());

  const row = db.prepare('SELECT * FROM lesson_progress WHERE lesson_slug = ?').get(lessonSlug);
  const stageSlug = row?.stage_slug || String(lessonSlug).split('/')[0] || '';
  const attempts = (row?.attempts ?? 0) + 1;
  const correctCount = (row?.correct_count ?? 0) + (correct ? 1 : 0);
  db.prepare(
    `INSERT INTO lesson_progress
       (lesson_slug, stage_slug, status, attempts, correct_count, question_count, best_score, seconds_spent, visited_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(lesson_slug) DO UPDATE SET
       status        = CASE WHEN lesson_progress.status = 'not-started' THEN 'learning' ELSE lesson_progress.status END,
       attempts      = excluded.attempts,
       correct_count = excluded.correct_count,
       question_count = excluded.question_count,
       best_score    = excluded.best_score,
       visited_at    = excluded.visited_at,
       updated_at    = excluded.updated_at`,
  ).run(
    lessonSlug,
    stageSlug,
    row?.status && row.status !== 'not-started' ? row.status : 'learning',
    attempts,
    correctCount,
    (row?.question_count ?? 0) + 1,
    Math.round((correctCount / attempts) * 100),
    now(),
    now(),
  );
}

export function listAttempts(limit = 500) {
  return db.prepare('SELECT * FROM quiz_attempts ORDER BY answered_at DESC LIMIT ?').all(limit);
}

export function setLessonStatus(lessonSlug, stageSlug, status) {
  if (!STATUSES.includes(status)) throw new Error(`非法状态：${status}`);
  upsertProgress({ lessonSlug, stageSlug, status });
}

/* ---------------------------------------------------------------- 笔记 */

export function listNotes() {
  return db
    .prepare('SELECT * FROM notes ORDER BY updated_at DESC')
    .all()
    .map((n) => ({ ...n, tags: safeParse(n.tags, []) }));
}

export function createNote({ title, body, lessonSlug, tags }) {
  const info = db
    .prepare('INSERT INTO notes (title, body, lesson_slug, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(title, body ?? '', lessonSlug ?? null, JSON.stringify(tags ?? []), now(), now());
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);
}

export function updateNote(id, { title, body, tags, lessonSlug }) {
  db.prepare('UPDATE notes SET title = ?, body = ?, tags = ?, lesson_slug = ?, updated_at = ? WHERE id = ?').run(
    title,
    body ?? '',
    JSON.stringify(tags ?? []),
    lessonSlug ?? null,
    now(),
    id,
  );
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}

export function deleteNote(id) {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
}

/* ------------------------------------------------------------ 项目任务 */

export function listProjectTasks() {
  return db.prepare('SELECT * FROM project_tasks').all();
}

export function toggleProjectTask(projectId, taskIndex, done) {
  db.prepare(
    `INSERT INTO project_tasks (project_id, task_index, done, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(project_id, task_index) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at`,
  ).run(projectId, taskIndex, done ? 1 : 0, now());
}

/* ------------------------------------------------------------ 学习时长 */

export function addStudySeconds(seconds) {
  const value = Math.max(0, Math.min(3600, Math.round(Number(seconds) || 0)));
  if (!value) return;
  const day = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO study_days (day, seconds, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET seconds = study_days.seconds + excluded.seconds, updated_at = excluded.updated_at`,
  ).run(day, value, now());
}

export function listStudyDays() {
  return db.prepare('SELECT * FROM study_days ORDER BY day DESC LIMIT 120').all();
}

/* ------------------------------------------------------------ 收藏 */

export function listBookmarks() {
  return db.prepare('SELECT lesson_slug FROM bookmarks ORDER BY created_at DESC').all().map((r) => r.lesson_slug);
}

export function toggleBookmark(lessonSlug) {
  const exists = db.prepare('SELECT 1 FROM bookmarks WHERE lesson_slug = ?').get(lessonSlug);
  if (exists) {
    db.prepare('DELETE FROM bookmarks WHERE lesson_slug = ?').run(lessonSlug);
    return false;
  }
  db.prepare('INSERT INTO bookmarks (lesson_slug, created_at) VALUES (?, ?)').run(lessonSlug, now());
  return true;
}

/* ------------------------------------------------------------ 备份导出 */

export function exportAll() {
  return {
    exportedAt: now(),
    version: 1,
    progress: listProgress(),
    attempts: listAttempts(100000),
    notes: listNotes(),
    projectTasks: listProjectTasks(),
    studyDays: listStudyDays(),
    bookmarks: listBookmarks(),
    settings: {
      tutorProvider: getSetting('tutor_provider', ''),
      tutorBaseUrl: getSetting('tutor_base_url', ''),
      tutorModel: getSetting('tutor_model', ''),
    },
  };
}

function safeParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
