export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

let currentLogLevel: LogLevel | null = null;

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  public async error(...args: unknown[]): Promise<void> {
    if (await this.isLevelEnabled(LogLevel.ERROR)) {
      console.error(`[${this.context}]`, ...args);
    }
  }

  public async warn(...args: unknown[]): Promise<void> {
    if (await this.isLevelEnabled(LogLevel.WARN)) {
      console.warn(`[${this.context}]`, ...args);
    }
  }

  public async info(...args: unknown[]): Promise<void> {
    if (await this.isLevelEnabled(LogLevel.INFO)) {
      console.info(`[${this.context}]`, ...args);
    }
  }

  public async debug(...args: unknown[]): Promise<void> {
    if (await this.isLevelEnabled(LogLevel.DEBUG)) {
      console.debug(`[${this.context}]`, ...args);
    }
  }

  private async isLevelEnabled(level: LogLevel): Promise<boolean> {
    if (currentLogLevel === null) {
      try {
        const data = await chrome.storage.local.get('logLevel');
        // Default to INFO for development, WARN for production
        // In Chrome extensions, we can detect dev mode by checking if we have unpacked extension
        const isDevMode = chrome.runtime && chrome.runtime.getManifest && 
                          chrome.runtime.getManifest().key === undefined;
        const defaultLevel = isDevMode ? LogLevel.INFO : LogLevel.WARN;
        currentLogLevel = data.logLevel ?? defaultLevel;
      } catch {
        currentLogLevel = LogLevel.WARN;
      }
    }
    return level <= (currentLogLevel ?? LogLevel.WARN);
  }
}

export async function setLogLevel(level: LogLevel): Promise<void> {
  await chrome.storage.local.set({ logLevel: level });
  currentLogLevel = null;
}
