// Launcher — Claude Code CLI를 서브프로세스로 실행
// 환경변수 주입 + 로그인 우회가 적용된 상태로 claude를 spawn

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { getConfig, getClaudeEnv, setupClaudeBypass } from './config.js';
import chalk from 'chalk';

/**
 * Claude Code CLI 바이너리 경로를 찾는다.
 * 1. jdi-cli의 node_modules 안에 설치된 것 (dependency)
 * 2. node_modules 내 cli.mjs 직접 참조
 * 3. 글로벌에 설치된 claude 명령어
 */
function findClaudeBinary(): string | null {
  const dir = new URL('.', import.meta.url).pathname;

  // 1. 로컬 node_modules/.bin/claude
  const localBin = path.resolve(dir, '../../node_modules/.bin/claude');
  if (fs.existsSync(localBin)) return localBin;

  // 2. node_modules 내 cli.mjs 직접 참조
  const cliMjs = path.resolve(dir, '../../node_modules/@anthropic-ai/claude-code/cli.mjs');
  if (fs.existsSync(cliMjs)) return cliMjs;

  // 3. 글로벌 설치된 claude
  try {
    const cmd = process.platform === 'win32' ? 'where claude 2>nul' : 'which claude 2>/dev/null';
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    if (result) return result.split('\n')[0];
  } catch {
    // not found
  }

  return null;
}

/**
 * Claude Code CLI를 실행한다.
 * - 환경변수 (ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY) 자동 주입
 * - 로그인 우회 (.config.json) 자동 설정
 * - 모든 인자를 그대로 claude에 전달
 */
export async function launchClaude(args: string[]): Promise<number> {
  const config = getConfig();

  // 1. 로그인 우회 설정 (매번 보장)
  setupClaudeBypass(config.apiKey);

  // 2. 환경변수 준비
  const claudeEnv = getClaudeEnv(config);

  // 3. Claude 바이너리 찾기
  const claudeBin = findClaudeBinary();

  if (!claudeBin) {
    console.error(chalk.red('\n  Error: Claude Code CLI를 찾을 수 없습니다.\n'));
    console.error(chalk.gray('  Claude Code가 JDI와 함께 설치되어야 합니다.'));
    console.error(chalk.gray('  다시 설치해보세요:\n'));
    console.error(chalk.cyan('    npm install -g github:jdibuilder2026-collab/jdi-cli\n'));
    return 1;
  }

  // 4. 실행 — claude 프로세스에 모든 I/O를 그대로 연결
  const isNodeScript = claudeBin.endsWith('.mjs') || claudeBin.endsWith('.js');
  const command = isNodeScript ? process.execPath : claudeBin;
  const spawnArgs = isNodeScript ? [claudeBin, ...args] : args;

  return new Promise<number>((resolve) => {
    const child = spawn(command, spawnArgs, {
      stdio: 'inherit', // stdin, stdout, stderr 모두 부모 프로세스에 연결
      env: {
        ...process.env,
        ...claudeEnv,
      },
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      resolve(code ?? 0);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`\n  Claude Code 실행 실패: ${err.message}\n`));
      resolve(1);
    });

    // 부모 프로세스 종료 시그널 전달
    const forwardSignal = (signal: NodeJS.Signals) => {
      child.kill(signal);
    };
    process.on('SIGINT', () => forwardSignal('SIGINT'));
    process.on('SIGTERM', () => forwardSignal('SIGTERM'));
  });
}
