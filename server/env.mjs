/**
 * 极简 .env 加载器（零依赖）。
 * 只在进程启动时读取项目根目录的 .env，已存在的环境变量优先。
 * .env 已被 .gitignore 忽略，API Key 不会进入 Git。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnv(file = join(PROJECT_ROOT, '.env')) {
  if (!existsSync(file)) return { loaded: false, keys: [] };
  const keys = [];
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
    keys.push(key);
  }
  return { loaded: true, keys };
}

const result = loadEnv();
if (result.loaded) {
  console.log(`  已加载 .env（${result.keys.length} 项配置）`);
}
