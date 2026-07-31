#!/bin/bash
# N자동화 실행 스크립트
cd "$(dirname "$0")"
unset NODE_OPTIONS
echo "=================================="
echo "  N자동화 v1.0.0 시작"
echo "  http://localhost:8000"
echo "=================================="
node server/index.js
