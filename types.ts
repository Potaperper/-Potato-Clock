
export enum TimerMode {
  WORK = 'WORK',
  SHORT_BREAK = 'SHORT_BREAK',
  MICRO_BREAK = 'MICRO_BREAK'
}

export interface Column {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  columnId: string; // New: Supports Kanban board
}

export interface DailyLog {
  date: string; // ISO Date string YYYY-MM-DD
  secondsWorked: number;
}

export type SoundType = 'workEnd' | 'breakEnd' | 'breakBg' | 'microBreakBg';

export interface Settings {
  workDuration: number; // minutes
  breakDuration: number; // minutes
  microBreakDuration: number; // seconds
  microBreakMinInterval: number; // minutes
  microBreakMaxInterval: number; // minutes
  enableMicroBreaks: boolean;
  autoStartBreak: boolean;
  autoStartWork: boolean;
  
  // Volume Settings (Split)
  volumeNotification: number; // 0-100
  volumeBreak: number;        // 0-100
  volumeMicroBreak: number;   // 0-100

  themeColorWork: string;
  themeColorBreak: string;
  darkMode: boolean;
  uiScale: number; // New: UI Scaling (0.8 - 1.2)
  
  // Store local file paths for Electron environment
  soundPaths: Record<SoundType, string | null>;
}

export const DEFAULT_SETTINGS: Settings = {
  workDuration: 30,
  breakDuration: 10,
  microBreakDuration: 10,
  microBreakMinInterval: 3,
  microBreakMaxInterval: 5,
  enableMicroBreaks: true,
  autoStartBreak: true,
  autoStartWork: false,
  
  // Default volumes
  volumeNotification: 70,
  volumeBreak: 50,
  volumeMicroBreak: 40,

  themeColorWork: '#ec4141', // NetEase Red
  themeColorBreak: '#10b981', // Emerald-500
  darkMode: false,
  uiScale: 0.75, // Scaled down by default as requested
  soundPaths: {
    workEnd: null,
    breakEnd: null,
    breakBg: null,
    microBreakBg: null
  }
};
