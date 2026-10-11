#!/bin/bash
# 双击这个文件即可启动本地学习站（macOS）
cd "$(dirname "$0")" || exit 1
chmod +x ./start.sh 2>/dev/null || true
./start.sh
echo ""
echo "按回车键关闭这个窗口。"
read -r _
