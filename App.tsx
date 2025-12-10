
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings as SettingsType, Task, DailyLog, TimerMode, DEFAULT_SETTINGS, SoundType, Column } from './types';
import TimerDisplay from './components/TimerDisplay';
import TaskList from './components/TaskList';
import Stats from './components/Stats';
import SettingsModal from './components/SettingsModal';
import { playSound, stopSound } from './utils/sound';
import { Settings, Play, Pause, RotateCcw, BarChart2, CheckCircle2, Plus, X, Eraser } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

const App: React.FC = () => {
  // --- State: Settings ---
  const [settings, setSettings] = useState<SettingsType>(() => {
    try {
      const saved = localStorage.getItem('potato_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          soundPaths: parsed.soundPaths || DEFAULT_SETTINGS.soundPaths,
          darkMode: parsed.darkMode ?? false,
          uiScale: parsed.uiScale ?? 0.75, // Default to 0.75 if not set
          volumeNotification: parsed.volumeNotification ?? parsed.volume ?? 70,
          volumeBreak: parsed.volumeBreak ?? parsed.volume ?? 50,
          volumeMicroBreak: parsed.volumeMicroBreak ?? parsed.volume ?? 40,
        };
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  });

  // --- State: Columns ---
  const [columns, setColumns] = useState<Column[]>(() => {
    try {
      const saved = localStorage.getItem('potato_columns');
      return saved ? JSON.parse(saved) : [
        { id: 'todo', title: '待办' },
        { id: 'doing', title: '进行中' },
        { id: 'done', title: '已完成' }
      ];
    } catch {
      return [
        { id: 'todo', title: '待办' },
        { id: 'doing', title: '进行中' },
        { id: 'done', title: '已完成' }
      ];
    }
  });

  // --- State: Tasks ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('potato_tasks');
      let loadedTasks = saved ? JSON.parse(saved) : [];
      // Migration: Ensure tasks have columnId
      if (loadedTasks.length > 0 && !loadedTasks[0].columnId) {
        loadedTasks = loadedTasks.map((t: any) => ({
             ...t, 
             columnId: t.completed ? 'done' : 'todo'
        }));
      }
      return loadedTasks;
    } catch (e) {
      return [];
    }
  });

  // --- State: Logs ---
  const [logs, setLogs] = useState<DailyLog[]>(() => {
    try {
      const saved = localStorage.getItem('potato_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // --- State: Custom Sounds (Session Only + Path Logic) ---
  const [fileUrls, setFileUrls] = useState<Record<SoundType, string | null>>({
    workEnd: null,
    breakEnd: null,
    breakBg: null,
    microBreakBg: null
  });

  // --- State: Timer & Mode ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.WORK);
  const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [showMicroBreakOverlay, setShowMicroBreakOverlay] = useState(false);
  
  // --- State: UI ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats'>('tasks');

  // --- State: Add Column UI ---
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // --- Refs ---
  const timerRef = useRef<number | null>(null);
  const nextMicroBreakTimeRef = useRef<number | null>(null);
  const microBreakRemainingRef = useRef<number | null>(null); // To store remaining time when paused
  
  // New: Snapshot to resume work time after micro-break
  const workTimeSnapshotRef = useRef<number | null>(null);
  
  // Media Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);

  // --- Persistence ---
  useEffect(() => { localStorage.setItem('potato_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('potato_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('potato_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('potato_columns', JSON.stringify(columns)); }, [columns]);

  // --- Helper: Convert Path to URL (Electron Fix) ---
  const getFileUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('blob:') || path.startsWith('http')) return path;
    const normalizedPath = path.replace(/\\/g, '/'); 
    const encodedPath = encodeURI(normalizedPath).replace(/#/g, '%23');
    return `file:///${encodedPath}`;
  };

  // --- Initialize Sounds from Settings (Electron Persistence) ---
  useEffect(() => {
    // 1. Restore MP3 paths on load
    if (settings.soundPaths) {
      const newUrls = { ...fileUrls };
      let changed = false;
      (Object.keys(settings.soundPaths) as SoundType[]).forEach(type => {
        const savedPath = settings.soundPaths[type];
        if (savedPath) {
          newUrls[type] = getFileUrl(savedPath); 
          changed = true;
        }
      });
      if (changed) {
        setFileUrls(newUrls);
      }
    }

    // 2. Auto-clean old tasks on startup
    cleanupOldTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Task Cleanup Logic ---
  const cleanupOldTasks = () => {
    setTasks(prev => {
      const today = new Date();
      return prev.filter(t => {
        // Keep incomplete tasks
        if (!t.completed) return true;
        // Keep tasks completed TODAY
        if (t.completed && t.completedAt && isSameDay(t.completedAt, today)) return true;
        // Delete tasks completed BEFORE today
        return false;
      });
    });
  };

  // --- Handle File Selection ---
  const handleCustomFileChange = (type: SoundType, file: File | null) => {
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setFileUrls(prev => ({ ...prev, [type]: blobUrl }));
      const filePath = (file as any).path;
      if (filePath) {
        setSettings(prev => ({
          ...prev,
          soundPaths: {
            ...(prev.soundPaths || DEFAULT_SETTINGS.soundPaths),
            [type]: filePath
          }
        }));
      }
    } else {
      if (fileUrls[type] && fileUrls[type]!.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrls[type]!);
      }
      setFileUrls(prev => ({ ...prev, [type]: null }));
      setSettings(prev => ({
        ...prev,
        soundPaths: {
          ...(prev.soundPaths || DEFAULT_SETTINGS.soundPaths),
          [type]: null
        }
      }));
    }
  };

  // --- Audio Logic Helper ---
  const getVolumeForType = useCallback((type: SoundType) => {
      if (type === 'breakBg') return settings.volumeBreak;
      if (type === 'microBreakBg') return settings.volumeMicroBreak;
      return settings.volumeNotification;
  }, [settings]);

  // --- Audio Logic ---
  const playCustomOrSystem = useCallback((type: SoundType, systemFallback: 'tick' | 'alarm' | 'start' | 'relax') => {
    const vol = getVolumeForType(type);
    const url = fileUrls[type];
    
    if (url) {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.volume = vol / 100;
        audioRef.current.loop = false;
        audioRef.current.play().catch(e => {
            console.error(`Audio play failed for ${type} at ${url}`, e);
            playSound(systemFallback, vol);
        });
      }
    } else {
      playSound(systemFallback, vol);
    }
  }, [fileUrls, getVolumeForType]);

  const startBackgroundMusic = useCallback((type: SoundType, videoElement?: HTMLVideoElement) => {
    const vol = getVolumeForType(type);
    const url = fileUrls[type];
    
    // Video Microbreak
    if (type === 'microBreakBg' && url && videoElement) {
       videoElement.src = url;
       videoElement.volume = vol / 100;
       videoElement.loop = true;
       videoElement.play().catch(e => console.error("Video play failed", e));
       return;
    }

    // Audio Background
    if (url && bgAudioRef.current) {
      bgAudioRef.current.src = url;
      bgAudioRef.current.volume = vol / 100;
      bgAudioRef.current.loop = true;
      bgAudioRef.current.play().catch(e => console.error("BG Audio play failed", e));
    } else if (!url && type === 'microBreakBg') {
       playSound('relax', vol);
    }
  }, [fileUrls, getVolumeForType]);

  const stopBackgroundMusic = useCallback(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    stopSound(); 
  }, []);

  // --- Timer Logic Helpers ---
  const getDurationForMode = useCallback((m: TimerMode) => {
    switch (m) {
      case TimerMode.WORK: return settings.workDuration * 60;
      case TimerMode.SHORT_BREAK: return settings.breakDuration * 60;
      case TimerMode.MICRO_BREAK: return settings.microBreakDuration;
      default: return 0;
    }
  }, [settings]);

  const scheduleNextMicroBreak = useCallback(() => {
    if (!settings.enableMicroBreaks) {
        nextMicroBreakTimeRef.current = null;
        microBreakRemainingRef.current = null;
        return;
    }
    const min = settings.microBreakMinInterval * 60;
    const max = settings.microBreakMaxInterval * 60;
    // Ensure logical bounds
    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    
    // Calculate random duration in seconds
    const randomSeconds = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
    
    // Store as remaining milliseconds for better pause/resume handling
    microBreakRemainingRef.current = randomSeconds * 1000;
    nextMicroBreakTimeRef.current = Date.now() + microBreakRemainingRef.current;
  }, [settings]);

  const switchMode = useCallback((newMode: TimerMode, manualTrigger: boolean = false) => {
    stopBackgroundMusic();
    
    // Snapshot Work Time before leaving WORK for MICRO_BREAK
    if (mode === TimerMode.WORK && newMode === TimerMode.MICRO_BREAK) {
        workTimeSnapshotRef.current = timeRemaining;
    }

    // Auto-Resume logic for Micro-Break
    const returningFromMicroBreak = (mode === TimerMode.MICRO_BREAK && newMode === TimerMode.WORK);

    setMode(newMode);
    
    // Restore Work Time if returning from MICRO_BREAK
    if (returningFromMicroBreak && workTimeSnapshotRef.current !== null) {
        setTimeRemaining(workTimeSnapshotRef.current);
        workTimeSnapshotRef.current = null; 
    } else {
        setTimeRemaining(getDurationForMode(newMode));
    }
    
    if (newMode === TimerMode.WORK) {
      scheduleNextMicroBreak();
      
      // Auto-start rules for WORK
      if (returningFromMicroBreak) {
        // ALWAYS auto-resume after micro-break
        setIsActive(true);
      } else {
        if (settings.autoStartWork && !manualTrigger) setIsActive(true);
        else setIsActive(false);
      }

    } else if (newMode === TimerMode.SHORT_BREAK) {
      if (settings.autoStartBreak && !manualTrigger) {
        setIsActive(true);
        startBackgroundMusic('breakBg');
      } else {
        // Manual break click -> pause
        setIsActive(false);
      }
    } else if (newMode === TimerMode.MICRO_BREAK) {
      setShowMicroBreakOverlay(true);
      setIsActive(true);
    }
  }, [getDurationForMode, scheduleNextMicroBreak, settings, startBackgroundMusic, stopBackgroundMusic, mode, timeRemaining]);

  // Effect to handle MicroBreak Video/Audio start
  useEffect(() => {
    if (showMicroBreakOverlay && mode === TimerMode.MICRO_BREAK) {
      const timer = setTimeout(() => {
        if (videoRef.current) {
          startBackgroundMusic('microBreakBg', videoRef.current);
        } else {
          startBackgroundMusic('microBreakBg'); 
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showMicroBreakOverlay, mode, startBackgroundMusic]);
  
  // Audio Resume Logic
  useEffect(() => {
    if (isActive && mode === TimerMode.SHORT_BREAK) {
       startBackgroundMusic('breakBg');
    } else if (!isActive && mode === TimerMode.SHORT_BREAK) {
       stopBackgroundMusic();
    }
  }, [isActive, mode, startBackgroundMusic, stopBackgroundMusic]);

  const recordWorkTime = useCallback((seconds: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setLogs(prev => {
      const existingIndex = prev.findIndex(l => l.date === today);
      if (existingIndex >= 0) {
        const newLogs = [...prev];
        newLogs[existingIndex].secondsWorked += seconds;
        return newLogs;
      } else {
        return [...prev, { date: today, secondsWorked: seconds }];
      }
    });
  }, []);

  // --- Main Tick Loop ---
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining(prev => prev - 1);

        // Check for MicroBreak trigger
        if (mode === TimerMode.WORK && settings.enableMicroBreaks && nextMicroBreakTimeRef.current) {
          if (Date.now() >= nextMicroBreakTimeRef.current) {
            nextMicroBreakTimeRef.current = null;
            microBreakRemainingRef.current = null;
            switchMode(TimerMode.MICRO_BREAK);
          }
        }
        
        if (mode === TimerMode.WORK) {
            recordWorkTime(1);
        }

      }, 1000);
    } else if (timeRemaining === 0 && isActive) {
      setIsActive(false);
      stopBackgroundMusic();
      
      if (mode === TimerMode.WORK) {
        playCustomOrSystem('workEnd', 'alarm');
        switchMode(TimerMode.SHORT_BREAK);
      } else if (mode === TimerMode.SHORT_BREAK) {
        playCustomOrSystem('breakEnd', 'alarm');
        switchMode(TimerMode.WORK);
      } else if (mode === TimerMode.MICRO_BREAK) {
        setShowMicroBreakOverlay(false);
        switchMode(TimerMode.WORK);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeRemaining, mode, settings, switchMode, recordWorkTime, playCustomOrSystem, stopBackgroundMusic]);

  // --- Handlers ---
  const toggleTimer = () => {
    if (!isActive) {
        // RESUMING
        playSound('tick', settings.volumeNotification);
        
        // Restore Microbreak timer
        if (mode === TimerMode.WORK && microBreakRemainingRef.current) {
             nextMicroBreakTimeRef.current = Date.now() + microBreakRemainingRef.current;
        } else if (mode === TimerMode.WORK && !nextMicroBreakTimeRef.current) {
             // If for some reason it wasn't scheduled (shouldn't happen often)
             scheduleNextMicroBreak();
        }
    } else {
        // PAUSING
        // Save remaining time for microbreak
        if (mode === TimerMode.WORK && nextMicroBreakTimeRef.current) {
            const remaining = Math.max(0, nextMicroBreakTimeRef.current - Date.now());
            microBreakRemainingRef.current = remaining;
            nextMicroBreakTimeRef.current = null; // Stop the target
        }
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    stopBackgroundMusic();
    setMode(TimerMode.WORK);
    setTimeRemaining(settings.workDuration * 60);
    workTimeSnapshotRef.current = null;
    nextMicroBreakTimeRef.current = null;
    microBreakRemainingRef.current = null;
    setShowMicroBreakOverlay(false);
  };

  const skipMicroBreak = () => {
    stopBackgroundMusic();
    setShowMicroBreakOverlay(false);
    switchMode(TimerMode.WORK);
  };

  // --- Kanban Handlers ---
  const addTask = (text: string, columnId: string) => {
    setTasks(prev => [
      ...prev, 
      { id: Date.now().toString(), text, completed: false, createdAt: Date.now(), columnId }
    ]);
  };

  const updateTask = (id: string, newText: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isCompleted = !t.completed;
        return { 
          ...t, 
          completed: isCompleted,
          completedAt: isCompleted ? Date.now() : undefined 
        };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const reorderTasks = (newTasks: Task[]) => {
      setTasks(newTasks);
  };

  // App.tsx controls adding column now
  const handleAddColumn = () => {
      if (newColumnTitle.trim()) {
          setColumns(prev => [...prev, { id: Date.now().toString(), title: newColumnTitle }]);
          setNewColumnTitle('');
          setIsAddingColumn(false);
      }
  };

  const updateColumn = (id: string, title: string) => {
      setColumns(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  };

  const deleteColumn = (id: string) => {
      setColumns(prev => prev.filter(c => c.id !== id));
      if (columns.length > 1) {
          const fallback = columns.find(c => c.id !== id)?.id || 'todo';
          setTasks(prev => prev.map(t => t.columnId === id ? { ...t, columnId: fallback } : t));
      }
  };

  const currentThemeColor = mode === TimerMode.WORK ? settings.themeColorWork : settings.themeColorBreak;

  const bgStyle = settings.darkMode 
    ? { backgroundColor: '#111827' } 
    : { backgroundColor: mode === TimerMode.MICRO_BREAK ? '#4f46e5' : '#f3f4f6' };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-700 relative overflow-hidden ${settings.darkMode ? 'dark' : ''}`}
      style={{ ...bgStyle, zoom: settings.uiScale }}
    >
      <audio ref={audioRef} className="hidden" />
      <audio ref={bgAudioRef} className="hidden" />

      {/* Micro Break Overlay */}
      {showMicroBreakOverlay && mode === TimerMode.MICRO_BREAK && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-indigo-900 text-white overflow-hidden animate-fade-in">
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            playsInline
          />
          <div className="z-10 flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-4xl font-bold mb-8 animate-pulse drop-shadow-lg">眨眼放松...</h1>
            <p className="text-xl mb-12 opacity-90 drop-shadow-md font-light">深呼吸，看向远处</p>
            <div className="text-9xl font-mono font-bold mb-12 drop-shadow-2xl">{timeRemaining}</div>
            <button 
              onClick={skipMicroBreak}
              className="px-8 py-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full backdrop-blur-md transition shadow-xl"
            >
              跳过
            </button>
          </div>
        </div>
      )}

      {/* Main Container - Responsive Height */}
      <div className="w-full max-w-5xl h-[calc(100vh-2rem)] min-h-[600px] grid grid-cols-1 md:grid-cols-12 gap-6 z-10 items-stretch">
        
        {/* Left Panel: Timer */}
        <div className="md:col-span-5 flex flex-col gap-6 h-full">
          <div className={`rounded-3xl shadow-xl p-8 flex flex-col items-center justify-between h-full border relative overflow-hidden ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {/* Top Bar */}
            <div className="w-full flex justify-between items-center mb-4 z-10">
              <div className="flex gap-2">
                <div className={`w-3 h-3 rounded-full transition-colors ${mode === TimerMode.WORK ? 'bg-red-500 scale-125' : 'bg-gray-300'}`} />
                <div className={`w-3 h-3 rounded-full transition-colors ${mode === TimerMode.SHORT_BREAK ? 'bg-emerald-500 scale-125' : 'bg-gray-300'}`} />
              </div>
              <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-full transition ${settings.darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Settings size={20} />
              </button>
            </div>

            {/* Timer Visual */}
            <div className="z-10 py-6">
              <TimerDisplay 
                timeRemaining={timeRemaining} 
                totalDuration={getDurationForMode(mode)}
                mode={mode}
                isActive={isActive}
                color={currentThemeColor}
                darkMode={settings.darkMode}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 w-full z-10 mb-8">
              <button 
                onClick={resetTimer}
                className={`p-4 rounded-2xl transition ${settings.darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title="重置为工作开始状态"
              >
                <RotateCcw size={24} />
              </button>
              <button 
                onClick={toggleTimer}
                className="flex-1 p-4 rounded-2xl text-white shadow-lg hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2 font-bold text-lg"
                style={{ backgroundColor: currentThemeColor }}
              >
                {isActive ? <Pause size={24} /> : <Play size={24} />}
                {isActive ? '暂停' : '开始'}
              </button>
            </div>

            {/* Background Blob Decoration */}
            <div 
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-5 blur-3xl transition-colors duration-700"
              style={{ backgroundColor: currentThemeColor }}
            />
             <div 
              className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-5 blur-3xl transition-colors duration-700"
              style={{ backgroundColor: currentThemeColor }}
            />
          </div>
        </div>

        {/* Right Panel: Tasks & Stats */}
        <div className="md:col-span-7 flex flex-col h-full">
            <div className={`rounded-3xl shadow-xl h-full border relative overflow-hidden flex flex-col ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                
                {/* Right Panel Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${settings.darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-2 pb-1 border-b-2 transition ${
                        activeTab === 'tasks' 
                            ? (settings.darkMode ? 'border-gray-200 text-gray-200' : 'border-gray-900 text-gray-900')
                            : (settings.darkMode ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600')
                        }`}
                    >
                        <CheckCircle2 size={18} />
                        <span className="font-medium">任务</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('stats')}
                        className={`flex items-center gap-2 pb-1 border-b-2 transition ${
                        activeTab === 'stats' 
                            ? (settings.darkMode ? 'border-gray-200 text-gray-200' : 'border-gray-900 text-gray-900')
                            : (settings.darkMode ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600')
                        }`}
                    >
                        <BarChart2 size={18} />
                        <span className="font-medium">统计</span>
                    </button>
                    </div>

                    {/* Actions */}
                    {activeTab === 'tasks' && (
                      <div className="flex gap-2">
                        <button 
                            onClick={cleanupOldTasks}
                            className={`p-2 rounded-full transition shadow-sm ${
                                settings.darkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                            title="刷新：清理今天之前已完成的任务"
                        >
                            <Eraser size={18} />
                        </button>
                        <button 
                            onClick={() => setIsAddingColumn(true)}
                            className={`p-2 rounded-full transition shadow-sm ${
                                settings.darkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                            title="添加新栏目"
                        >
                            <Plus size={18} />
                        </button>
                      </div>
                    )}
                </div>

                {/* Right Panel Content */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    {/* Add Column Inline Input */}
                    {isAddingColumn && activeTab === 'tasks' && (
                        <div className={`m-4 p-2 rounded-lg border flex gap-2 animate-fade-in ${settings.darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <input 
                                autoFocus
                                placeholder="新栏目名称..."
                                value={newColumnTitle}
                                onChange={(e) => setNewColumnTitle(e.target.value)}
                                onBlur={handleAddColumn} 
                                className={`flex-1 text-sm bg-transparent outline-none ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddColumn();
                                    if (e.key === 'Escape') setIsAddingColumn(false);
                                }}
                            />
                            <button onClick={() => setIsAddingColumn(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                        </div>
                    )}

                    <div className="flex-1 relative overflow-hidden">
                        {activeTab === 'tasks' ? (
                        <TaskList 
                            tasks={tasks}
                            columns={columns}
                            onAddTask={addTask}
                            onUpdateTask={updateTask}
                            onToggleTask={toggleTask}
                            onDeleteTask={deleteTask}
                            onReorderTasks={reorderTasks}
                            onAddColumn={() => {}} // Controlled by App.tsx now
                            onUpdateColumn={updateColumn}
                            onDeleteColumn={deleteColumn}
                            darkMode={settings.darkMode}
                        />
                        ) : (
                        <Stats logs={logs} tasks={tasks} darkMode={settings.darkMode} />
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => {
            const oldWork = settings.workDuration;
            const oldBreak = settings.breakDuration;
            setSettings(newSettings);

            // Bug fix: Reset timer if duration changed for current mode
            if (mode === TimerMode.WORK && oldWork !== newSettings.workDuration) {
                 setTimeRemaining(newSettings.workDuration * 60);
                 setIsActive(false);
            } else if (mode === TimerMode.SHORT_BREAK && oldBreak !== newSettings.breakDuration) {
                 setTimeRemaining(newSettings.breakDuration * 60);
                 setIsActive(false);
            }
        }}
        customSounds={fileUrls as any} 
        onCustomSoundChange={handleCustomFileChange}
      />
    </div>
  );
};

export default App;
