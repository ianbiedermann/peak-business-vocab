// Repository for app settings
import * as localStorage from '@/lib/localStorage';

export interface AppSettings {
  language?: string;
  learningMode?: string;
  dailyGoal?: number;
  notifications?: boolean;
}

class SettingsRepositoryClass {
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const value = await localStorage.loadSetting(key);
    return value !== undefined ? value : defaultValue;
  }

  async setSetting(key: string, value: any): Promise<void> {
    await localStorage.saveSetting(key, value);
  }

  async getAllSettings(): Promise<AppSettings> {
    return await localStorage.loadAllSettings();
  }

  async getLanguage(): Promise<string> {
    return await this.getSetting('language', 'de');
  }

  async setLanguage(language: string): Promise<void> {
    await this.setSetting('language', language);
  }

  async getDailyGoal(): Promise<number> {
    return await this.getSetting('dailyGoal', 20);
  }

  async setDailyGoal(goal: number): Promise<void> {
    await this.setSetting('dailyGoal', goal);
  }
}

export const SettingsRepository = new SettingsRepositoryClass();
