// Config — ~/.jdi/config.json 관리

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface JdiConfig {
  serverUrl: string;
  apiKey: string;
  model?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.jdi');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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
