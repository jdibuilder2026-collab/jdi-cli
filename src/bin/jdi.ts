#!/usr/bin/env node

// JDI — AI Coding Agent CLI

import { login, repl, oneshot } from '../cli.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  // jdi login
  if (command === 'login') {
    await login();
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
    console.log(pkg.version);
    return;
  }

  // jdi "프롬프트" — one-shot mode
  if (args.length > 0 && !command?.startsWith('-')) {
    const prompt = args.join(' ');
    await oneshot(prompt);
    return;
  }

  // jdi — interactive REPL
  await repl();
}

function printUsage() {
  console.log(`
JDI — AI Coding Agent

사용법:
  jdi                      대화형 모드 (REPL)
  jdi "프롬프트"            단일 프롬프트 실행
  jdi login                서버 URL & API Key 설정

옵션:
  -h, --help               도움말
  -v, --version            버전 표시

대화형 명령어:
  /help                    도움말
  /clear                   대화 기록 초기화
  /model                   현재 모델 표시
  /config                  설정 정보 표시
  /exit                    종료

예시:
  jdi login
  cd ~/my-project
  jdi "이 프로젝트를 분석해줘"
  jdi
`);
}

main().catch((err) => {
  console.error(`Error: ${err.message || err}`);
  process.exit(1);
});
