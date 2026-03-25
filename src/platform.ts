// Platform — 플랫폼 서버 API 연동 (크레딧, 사용량, 상태)

import { getConfig } from './config.js';
import chalk from 'chalk';

async function apiFetch(path: string): Promise<unknown> {
  const config = getConfig();
  const baseUrl = config.serverUrl.replace(/\/proxy\/?$/, '').replace(/\/+$/, '');
  const url = `${baseUrl}/api${path}`;

  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API 요청 실패 (${resp.status}): ${text}`);
  }

  return resp.json();
}

export async function showCredits(): Promise<void> {
  try {
    const data = await apiFetch('/credits/balance') as Array<{ tokenBalance: number; totalPurchased: number; totalConsumed: number }>;
    const total = data.reduce((sum, c) => sum + c.tokenBalance, 0);
    const purchased = data.reduce((sum, c) => sum + c.totalPurchased, 0);
    const consumed = data.reduce((sum, c) => sum + c.totalConsumed, 0);

    console.log('');
    console.log(chalk.bold('  💰 크레딧'));
    console.log(`     잔액:   ${chalk.green.bold(formatTokens(total))} tokens`);
    console.log(`     충전:   ${chalk.gray(formatTokens(purchased))}`);
    console.log(`     사용:   ${chalk.gray(formatTokens(consumed))}`);
    console.log('');
  } catch (err) {
    console.error(chalk.red(`크레딧 조회 실패: ${(err as Error).message}`));
  }
}

export async function showUsage(): Promise<void> {
  try {
    const data = await apiFetch('/usage/overview?days=30') as {
      totalRequests: number;
      totalTokens: number;
      activeApiKeys: number;
      avgResponseTimeMs: number;
    };

    console.log('');
    console.log(chalk.bold('  📊 사용량 (최근 30일)'));
    console.log(`     총 요청: ${chalk.cyan(data.totalRequests.toLocaleString())}회`);
    console.log(`     총 토큰: ${chalk.cyan(formatTokens(data.totalTokens))}`);
    console.log(`     활성 API Key: ${chalk.cyan(String(data.activeApiKeys))}개`);
    console.log(`     평균 응답: ${chalk.cyan(formatMs(data.avgResponseTimeMs))}`);
    console.log('');
  } catch (err) {
    console.error(chalk.red(`사용량 조회 실패: ${(err as Error).message}`));
  }
}

export async function showStatus(): Promise<void> {
  const config = getConfig();
  const baseUrl = config.serverUrl.replace(/\/proxy\/?$/, '').replace(/\/+$/, '');

  console.log('');
  console.log(chalk.bold('  🔌 서버 상태'));
  console.log(chalk.gray(`     서버: ${baseUrl}`));
  console.log(chalk.gray(`     API Key: ${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}`));

  // Health check
  try {
    const resp = await fetch(`${baseUrl}/actuator/health`);
    if (resp.ok) {
      console.log(`     상태: ${chalk.green('✓ 정상')}`);
    } else {
      console.log(`     상태: ${chalk.yellow(`⚠ HTTP ${resp.status}`)}`);
    }
  } catch {
    console.log(`     상태: ${chalk.red('✗ 연결 불가')}`);
  }

  // API Key 유효성 체크
  try {
    await apiFetch('/credits/balance');
    console.log(`     인증: ${chalk.green('✓ API Key 유효')}`);
  } catch {
    console.log(`     인증: ${chalk.red('✗ API Key 무효 또는 만료')}`);
  }

  console.log('');
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatMs(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return Math.round(ms) + 'ms';
}
