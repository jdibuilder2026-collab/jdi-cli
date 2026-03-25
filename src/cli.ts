// CLI — login + 플랫폼 명령어 + Claude Code 래핑

import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { loadConfig, saveConfig, getConfig, setupClaudeBypass, type JdiConfig } from './config.js';
import { launchClaude } from './launcher.js';
import { showCredits, showUsage, showStatus } from './platform.js';

// =====================
// Login
// =====================
export async function login(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const ask = (q: string): Promise<string> =>
    new Promise(r => rl.question(q, r));

  console.error(chalk.bold.blue('\n  JDI 로그인 설정\n'));

  const existing = loadConfig();

  const serverUrl = await ask(
    `  서버 URL${existing?.serverUrl ? ` (${chalk.gray(existing.serverUrl)})` : ''}: `,
  );
  const apiKey = await ask('  API Key (cpk_...): ');

  if (apiKey && !apiKey.startsWith('cpk_')) {
    console.error(chalk.yellow('\n  경고: API Key는 보통 cpk_ 로 시작합니다.'));
  }

  const config: JdiConfig = {
    serverUrl: serverUrl || existing?.serverUrl || '',
    apiKey: apiKey || existing?.apiKey || '',
    model: existing?.model,
  };

  if (!config.serverUrl || !config.apiKey) {
    console.error(chalk.red('\n  서버 URL과 API Key를 모두 입력해야 합니다.'));
    rl.close();
    process.exit(1);
  }

  // 1. JDI 설정 저장
  saveConfig(config);
  console.error(chalk.green('\n  ✓ JDI 설정 저장 완료'));
  console.error(chalk.gray(`    ~/.jdi/config.json`));

  // 2. Claude Code 로그인 우회 설정
  setupClaudeBypass(config.apiKey);
  console.error(chalk.green('  ✓ Claude Code 로그인 우회 설정 완료'));
  console.error(chalk.gray('    ~/.claude/.config.json'));

  // 3. 서버 연결 테스트
  console.error(chalk.gray('\n  서버 연결 테스트 중...'));
  const baseUrl = config.serverUrl.replace(/\/proxy\/?$/, '').replace(/\/+$/, '');

  try {
    const resp = await fetch(`${baseUrl}/actuator/health`);
    if (resp.ok) {
      console.error(chalk.green('  ✓ 서버 연결 성공'));
    } else {
      console.error(chalk.yellow(`  ⚠ 서버 응답: ${resp.status}`));
    }
  } catch {
    console.error(chalk.yellow('  ⚠ 서버 연결을 확인할 수 없습니다.'));
  }

  // 4. API Key 유효성 체크
  try {
    const resp = await fetch(`${baseUrl}/api/credits/balance`, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
    });
    if (resp.ok) {
      const data = await resp.json() as Array<{ tokenBalance: number }>;
      const total = data.reduce((sum: number, c: { tokenBalance: number }) => sum + c.tokenBalance, 0);
      console.error(chalk.green(`  ✓ API Key 인증 성공 (잔액: ${total.toLocaleString()} tokens)`));
    } else {
      console.error(chalk.yellow('  ⚠ API Key 인증 실패 — 키를 확인하세요'));
    }
  } catch {
    // skip
  }

  console.error(chalk.gray('\n  설정 완료! 이제 아래 명령어로 사용하세요:'));
  console.error(chalk.cyan('    cd ~/my-project'));
  console.error(chalk.cyan('    jdi'));
  console.error('');

  rl.close();
}

// =====================
// Launch Claude Code
// =====================
export async function launch(args: string[]): Promise<void> {
  const config = getConfig();

  // 매 실행마다 로그인 우회 설정을 보장
  setupClaudeBypass(config.apiKey);

  const exitCode = await launchClaude(args);
  process.exit(exitCode);
}

// =====================
// Platform Commands
// =====================
export { showCredits, showUsage, showStatus };
