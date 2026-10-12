import assert from 'node:assert/strict';
import test from 'node:test';
import { detectRuntimes, runCode, runtimeStatus } from '../server/runner.mjs';

const runtimes = detectRuntimes();
const hasPython = runtimes.python.available;

test('运行时探测结果结构正确', () => {
  const status = runtimeStatus();
  for (const key of ['python', 'bash', 'cuda']) {
    assert.equal(typeof status[key]?.available, 'boolean', `${key} 缺少 available`);
    assert.ok(status[key].label, `${key} 缺少 label`);
  }
});

test('Python：正常运行并拿到输出', { skip: !hasPython }, async () => {
  const res = await runCode({ lang: 'python', code: 'print("你好")\nprint(1 + 1)' });
  assert.equal(res.ok, true, res.stderr);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /你好/);
  assert.match(res.stdout, /2/);
});

test('Python：支持程序输入', { skip: !hasPython }, async () => {
  const res = await runCode({ lang: 'python', code: 'name = input()\nprint("hi", name)', stdin: '小明' });
  assert.equal(res.ok, true, res.stderr);
  assert.match(res.stdout, /hi 小明/);
});

test('Python：语法错误能被捕获', { skip: !hasPython }, async () => {
  const res = await runCode({ lang: 'python', code: 'print("没关引号' });
  assert.equal(res.ok, false);
  assert.notEqual(res.exitCode, 0);
  assert.match(res.stderr, /SyntaxError/);
});

test('Python：死循环会被超时终止', { skip: !hasPython }, async () => {
  const res = await runCode({ lang: 'python', code: 'while True:\n    pass', timeoutMs: 1200 });
  assert.equal(res.timedOut, true);
  assert.equal(res.ok, false);
  assert.match(res.stderr, /已超时/);
});

test('等输入但没给内容时给出提示', { skip: !hasPython }, async () => {
  const res = await runCode({ lang: 'python', code: 'input()' });
  assert.equal(res.ok, false);
  assert.match(res.stderr, /程序输入/);
});

test('每次运行都在独立临时目录，不污染项目', { skip: !hasPython }, async () => {
  const res = await runCode({ lang: 'python', code: 'import os\nprint(os.getcwd())' });
  assert.equal(res.ok, true);
  assert.match(res.stdout, /ai-algo-lab-run-/);
});

test('不支持的运行语言给出明确错误', async () => {
  const res = await runCode({ lang: 'cuda', code: 'int main() {}' });
  assert.equal(res.ok, false);
  assert.match(res.error, /只支持 Python 与 Bash/);
});
