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
  columnId: string; // Supports Kanban board
}

// Historical task record for archive/statistics
export interface HistoricalTask {
  id: string;
  text: string;
  completed: boolean;
  columnTitle: string;
  completedAt?: number;
}

// Daily snapshot for archive
export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  tasks: HistoricalTask[];
  focusMinutes: number;
}

export interface DailyLog {
  date: string; // ISO Date string YYYY-MM-DD
  secondsWorked: number;
  // New: Store completed task count for statistics
  tasksCompleted?: number;
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
  uiScale: number; // UI Scaling (0.5 - 1.0)
  
  // Store local file paths for Electron environment
  soundPaths: Record<SoundType, string | null>;

  // New: Markdown export folder path
  markdownExportPath: string | null;
  // New: Enable auto-export
  enableMarkdownExport: boolean;
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
  uiScale: 0.75,
  soundPaths: {
    workEnd: null,
    breakEnd: null,
    breakBg: null,
    microBreakBg: null
  },
  markdownExportPath: null,
  enableMarkdownExport: false
};
