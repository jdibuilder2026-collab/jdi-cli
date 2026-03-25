#!/usr/bin/env node

// JDI — Claude Code 내장 AI 코딩 에이전트
// 로그인 한 번으로 Claude Code의 전체 기능을 사용

import { login, launch, showCredits, showUsage, showStatus } from '../cli.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  // === JDI 전용 명령어 ===

  // jdi login
  if (command === 'login') {
    await login();
    return;
  }

  // jdi credits — 크레딧 잔액 조회
  if (command === 'credits') {
    await showCredits();
    return;
  }

  // jdi usage — 사용량 조회
  if (command === 'usage') {
    await showUsage();
    return;
  }

  // jdi status — 서버 상태 + 인증 확인
  if (command === 'status') {
    await showStatus();
    return;
  }

  // jdi --help / jdi -h
  if (command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  // jdi --version / jdi -v
  if (command === '--version' || command === '-v') {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const pkg = require('../../package.json');
    console.log(`jdi v${pkg.version} (Claude Code wrapper)`);
    return;
  }

  // === 나머지는 전부 Claude Code에 전달 ===
  // jdi                    → claude (대화형 모드)
  // jdi "분석해줘"          → claude "분석해줘" (원샷)
  // jdi --model opus ...   → claude --model opus ... (모든 플래그 그대로)
  await launch(args);
}

function printUsage() {
  console.log(`
${'\x1b[1m\x1b[34m'}JDI${'\x1b[0m'} — Claude Code 내장 AI 코딩 에이전트

${'사용법:'}
  jdi                      Claude Code 대화형 모드
  jdi "프롬프트"            단일 프롬프트 실행
  jdi login                서버 URL & API Key 설정 (최초 1회)

${'플랫폼 명령어:'}
  jdi credits              크레딧 잔액 조회
  jdi usage                사용량 조회 (최근 30일)
  jdi status               서버 연결 + 인증 상태 확인

${'옵션:'}
  -h, --help               도움말
  -v, --version            버전 표시

${'Claude Code 플래그 (그대로 전달):'}
  jdi --model opus         모델 지정
  jdi --verbose            상세 로그
  jdi -p "프롬프트"         프롬프트 지정
  jdi --help               Claude Code 도움말 (-- 없이)

${'동작 방식:'}
  1. jdi login 으로 서버 URL + API Key 설정 (1회)
  2. 이후 jdi 실행 시 자동으로:
     - ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY 환경변수 주입
     - Claude Code 로그인 우회 (.config.json 자동 설정)
     - Claude Code CLI 실행 (전체 기능 사용 가능)

${'예시:'}
  jdi login
  cd ~/my-project
  jdi "이 프로젝트의 버그를 찾아줘"
  jdi
`);
}

main().catch((err) => {
  console.error(`Error: ${err.message || err}`);
  process.exit(1);
});
