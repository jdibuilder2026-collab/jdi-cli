// Config — ~/.jdi/config.json 관리 + Claude Code 로그인 우회 설정

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export interface JdiConfig {
  serverUrl: string;
  apiKey: string;
  model?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.jdi');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_CONFIG_FILE = path.join(CLAUDE_DIR, '.config.json');

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): JdiConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as JdiConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: JdiConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getConfig(): JdiConfig {
  const config = loadConfig();
  if (!config) {
    throw new Error(
      'JDI가 설정되지 않았습니다. `jdi login` 을 먼저 실행하세요.'
    );
  }
  return config;
}

/**
 * Claude Code CLI의 로그인 화면을 우회하는 .config.json을 생성/갱신한다.
 *
 * Claude Code CLI 소스 내부 동작:
 * - KN(key) = key.slice(-20)  → API 키의 마지막 20자를 해시로 사용
 * - hasCompletedOnboarding: true → 온보딩(로그인 선택) 화면 건너뜀
 * - customApiKeyResponses.approved → 해당 키를 승인된 키로 등록
 * - 설정 파일 경로: ~/.claude/.config.json
 */
export function setupClaudeBypass(apiKey: string): void {
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  // API Key의 마지막 20자 = Claude Code가 인식하는 key hash
  const keyHash = apiKey.slice(-20);

  // 기존 .config.json이 있으면 읽어서 병합
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(CLAUDE_CONFIG_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_FILE, 'utf-8'));
    } catch {
      existing = {};
    }
  }

  // approved 목록에 현재 키 해시 추가 (중복 방지)
  const customApiKeyResponses = (existing.customApiKeyResponses as Record<string, string[]>) || {
    approved: [],
    rejected: [],
  };

  if (!customApiKeyResponses.approved) {
    customApiKeyResponses.approved = [];
  }
  if (!customApiKeyResponses.approved.includes(keyHash)) {
    customApiKeyResponses.approved.push(keyHash);
  }

  const configData = {
    ...existing,
    hasCompletedOnboarding: true,
    theme: existing.theme || 'dark',
    customApiKeyResponses,
  };

  fs.writeFileSync(CLAUDE_CONFIG_FILE, JSON.stringify(configData, null, 2), { mode: 0o600 });
}

/**
 * Claude Code 실행에 필요한 환경변수를 반환한다.
 */
export function getClaudeEnv(config: JdiConfig): Record<string, string> {
  // serverUrl에서 /proxy 경로 구성
  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  const proxyUrl = baseUrl.includes('/proxy') ? baseUrl : `${baseUrl}/proxy`;

  return {
    ANTHROPIC_BASE_URL: proxyUrl,
    ANTHROPIC_API_KEY: config.apiKey,
    // Claude Code가 사용할 설정 디렉터리 (기본값 = ~/.claude)
    // 별도로 지정하지 않아도 setupClaudeBypass가 ~/.claude에 설정을 씀
  };
}
