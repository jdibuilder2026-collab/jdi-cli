export interface JdiConfig {
    serverUrl: string;
    apiKey: string;
    model?: string;
}
export declare function getConfigPath(): string;
export declare function loadConfig(): JdiConfig | null;
export declare function saveConfig(config: JdiConfig): void;
export declare function getConfig(): JdiConfig;
/**
 * Claude Code CLI의 로그인 화면을 우회하는 .config.json을 생성/갱신한다.
 *
 * Claude Code CLI 소스 내부 동작:
 * - KN(key) = key.slice(-20)  → API 키의 마지막 20자를 해시로 사용
 * - hasCompletedOnboarding: true → 온보딩(로그인 선택) 화면 건너뜀
 * - customApiKeyResponses.approved → 해당 키를 승인된 키로 등록
 * - 설정 파일 경로: ~/.claude/.config.json
 */
export declare function setupClaudeBypass(apiKey: string): void;
/**
 * Claude Code 실행에 필요한 환경변수를 반환한다.
 */
export declare function getClaudeEnv(config: JdiConfig): Record<string, string>;
//# sourceMappingURL=config.d.ts.map