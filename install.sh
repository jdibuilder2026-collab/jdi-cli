#!/bin/bash
# JDI 설치 스크립트
# curl -fsSL https://raw.githubusercontent.com/jdibuilder2026-collab/jdi-cli/main/install.sh | bash

set -e

REPO="https://github.com/jdibuilder2026-collab/jdi-cli.git"
INSTALL_DIR="$HOME/.jdi/cli"

echo ""
echo "  🚀 JDI 설치 시작"
echo ""

# Node.js 확인
if ! command -v node &> /dev/null; then
  echo "  ❌ Node.js가 설치되어 있지 않습니다."
  echo "     https://nodejs.org 에서 설치하세요. (18 이상)"
  exit 1
fi

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "  ❌ Node.js 18 이상이 필요합니다. (현재: $(node -v))"
  exit 1
fi
echo "  ✓ Node.js $(node -v)"

# 기존 설치 제거
if [ -d "$INSTALL_DIR" ]; then
  echo "  → 기존 설치 제거 중..."
  cd "$INSTALL_DIR" && npm unlink 2>/dev/null || true
  rm -rf "$INSTALL_DIR"
fi

# 클론
echo "  → 다운로드 중..."
git clone --depth 1 "$REPO" "$INSTALL_DIR" 2>/dev/null

# 설치
echo "  → 설치 중..."
cd "$INSTALL_DIR"
npm install --ignore-scripts 2>/dev/null
npm link 2>/dev/null

# 확인
if command -v jdi &> /dev/null; then
  echo ""
  echo "  ✅ JDI 설치 완료!"
  echo ""
  echo "  다음 단계:"
  echo "    1. Claude Code 설치 (아직 없다면):"
  echo "       npm install -g @anthropic-ai/claude-code"
  echo ""
  echo "    2. JDI 로그인:"
  echo "       jdi login"
  echo ""
  echo "    3. 사용:"
  echo "       cd ~/my-project"
  echo "       jdi"
  echo ""
else
  echo ""
  echo "  ⚠️  설치는 완료되었으나 jdi 명령어가 PATH에 없습니다."
  echo "     터미널을 재시작하거나 아래를 실행하세요:"
  echo "     export PATH=\"\$(npm bin -g):\$PATH\""
  echo ""
fi
