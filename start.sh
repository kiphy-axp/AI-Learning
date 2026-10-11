#!/bin/bash
# AI 算法实验室 · 本地学习站 —— 一键启动
# 用法：./start.sh [端口]
set -uo pipefail

cd "$(dirname "$0")" || exit 1
PORT="${1:-4173}"
PROJECT_DIR="$(pwd)"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
info() { printf "  %s\n" "$1"; }
warn() { printf "\033[33m  %s\033[0m\n" "$1"; }
fail() { printf "\033[31m  %s\033[0m\n" "$1"; }

bold ""
bold "  AI 算法实验室 · 本地学习站"
bold "  ────────────────────────────────────────"

# 1. 检查 Node
if ! command -v node >/dev/null 2>&1; then
  fail "没有找到 node。请先安装 Node.js 22.5 或更高版本：https://nodejs.org"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]')"
if [ "$NODE_MAJOR" -lt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 5 ]; }; then
  fail "当前 Node 版本是 $(node -v)，需要 22.5 以上（本项目使用内置 node:sqlite）。"
  exit 1
fi
info "Node $(node -v) ✓"

# 2. 安装依赖（仅首次）
if [ ! -d node_modules ]; then
  bold ""
  bold "  首次运行，正在安装依赖（约 1 分钟）…"
  if ! npm install --no-audit --no-fund; then
    fail "依赖安装失败，请检查网络后重试。"
    exit 1
  fi
fi

# 3. 构建前端（dist 缺失或内容有更新时）
NEEDS_BUILD=0
if [ ! -f dist/index.html ]; then
  NEEDS_BUILD=1
elif [ -n "$(find content web/src web/index.html -newer dist/index.html 2>/dev/null | head -1)" ]; then
  NEEDS_BUILD=1
fi

if [ "$NEEDS_BUILD" -eq 1 ]; then
  bold ""
  bold "  正在构建前端页面…"
  if ! npm run build; then
    fail "前端构建失败。可运行 npm run build 查看详细报错。"
    exit 1
  fi
  info "构建完成 ✓"
fi

# 4. 端口占用时自动换端口
is_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
if is_busy "$PORT"; then
  warn "端口 $PORT 已被占用，尝试 $((PORT + 1)) …"
  PORT=$((PORT + 1))
  if is_busy "$PORT"; then
    fail "端口 $PORT 也被占用。请手动指定：./start.sh 5000"
    exit 1
  fi
fi

# 5. 启动服务并打开浏览器
bold ""
bold "  启动中… 浏览器会自动打开 http://127.0.0.1:$PORT"
bold "  停止服务：在这个窗口按 Ctrl+C"
bold ""

(
  sleep 2
  if [ "${NO_OPEN:-0}" != "1" ]; then
    open "http://127.0.0.1:$PORT" >/dev/null 2>&1 || true
  fi
) &

PORT="$PORT" HOST=127.0.0.1 node server/index.mjs
STATUS=$?

bold ""
if [ "$STATUS" -eq 0 ]; then
  info "服务已停止，学习数据保存在 $PROJECT_DIR/data/learning.db"
else
  fail "服务异常退出（退出码 $STATUS）。"
fi
