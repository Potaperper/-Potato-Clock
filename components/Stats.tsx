
import React, { useState, useMemo } from 'react';
import { DailyLog, Task, DailySnapshot, HistoricalTask } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckSquare, Square, X, TrendingUp, ListChecks } from 'lucide-react';
import { 
  format, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  getYear
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StatsProps {
  logs: DailyLog[];
  tasks: Task[];
  historicalSnapshots: DailySnapshot[];
  darkMode?: boolean;
}

type ViewMode = 'week' | 'month' | 'year';

const Stats: React.FC<StatsProps> = ({ logs, tasks, historicalSnapshots, darkMode = false }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // --- Helper: Get tasks for a specific date (combining current tasks and historical snapshots) ---
  const getTasksForDate = (date: Date): { completed: (Task | HistoricalTask)[], created: Task[] } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Current tasks
    const completedTasks = tasks.filter(t => t.completed && t.completedAt && isSameDay(t.completedAt, date));
    const createdTasks = tasks.filter(t => isSameDay(t.createdAt, date));
    
    // Historical snapshots
    const snapshot = historicalSnapshots.find(s => s.date === dateStr);
    const historicalTasks = snapshot?.tasks.filter(t => t.completed) || [];
    
    return {
      completed: [...completedTasks, ...historicalTasks],
      created: createdTasks
    };
  };

  // --- Helper: Get focus minutes for a date ---
  const getFocusMinutesForDate = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = logs.find(l => l.date === dateStr);
    const snapshot = historicalSnapshots.find(s => s.date === dateStr);
    
    const logMinutes = log ? Math.round(log.secondsWorked / 60) : 0;
    const snapshotMinutes = snapshot?.focusMinutes || 0;
    
    // Return whichever is higher (avoid double counting)
    return Math.max(logMinutes, snapshotMinutes);
  };

  // --- Helper: Get completed task count for a date ---
  const getCompletedCountForDate = (date: Date): number => {
    const { completed } = getTasksForDate(date);
    return completed.length;
  };

  // --- Aggregate Data ---
  const totalMinutes = useMemo(() => {
    const logMinutes = logs.reduce((acc, log) => acc + Math.round(log.secondsWorked / 60), 0);
    // Deduplicate by checking if log date exists in snapshots
    const logDates = new Set(logs.map(l => l.date));
    const uniqueSnapshotMinutes = historicalSnapshots
      .filter(s => !logDates.has(s.date))
      .reduce((acc, s) => acc + s.focusMinutes, 0);
    return logMinutes + uniqueSnapshotMinutes;
  }, [logs, historicalSnapshots]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLog = logs.find(l => l.date === todayStr);
  const todayMinutes = todayLog ? Math.round(todayLog.secondsWorked / 60) : 0;
  const todayCompletedCount = getCompletedCountForDate(new Date());

  // --- Chart Data Generation ---
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (viewMode === 'week') {
      // Last 7 days
      return Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(now, 6 - i);
        return {
          name: format(d, 'MM/dd'),
          fullDate: d,
          focusMinutes: getFocusMinutesForDate(d),
          tasksCompleted: getCompletedCountForDate(d)
        };
      });
    } else if (viewMode === 'month') {
      // Current month by week
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
      
      return weeks.map((weekStart, i) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const daysInWeek = eachDayOfInterval({ 
          start: weekStart < monthStart ? monthStart : weekStart,
          end: weekEnd > monthEnd ? monthEnd : weekEnd
        });
        
        const focusMinutes = daysInWeek.reduce((acc, d) => acc + getFocusMinutesForDate(d), 0);
        const tasksCompleted = daysInWeek.reduce((acc, d) => acc + getCompletedCountForDate(d), 0);
        
        return {
          name: `W${i + 1}`,
          fullDate: weekStart,
          focusMinutes,
          tasksCompleted
        };
      });
    } else {
      // Year view - by month
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
      
      return months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        
        const focusMinutes = daysInMonth.reduce((acc, d) => acc + getFocusMinutesForDate(d), 0);
        const tasksCompleted = daysInMonth.reduce((acc, d) => acc + getCompletedCountForDate(d), 0);
        
        return {
          name: format(monthStart, 'M月'),
          fullDate: monthStart,
          focusMinutes,
          tasksCompleted
        };
      });
    }
  }, [viewMode, currentMonth, logs, tasks, historicalSnapshots]);

  // --- Calendar Generation ---
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const minutes = getFocusMinutesForDate(day);
        const completedCount = getCompletedCountForDate(day);
        
        // Intensity color logic
        let bgColor = darkMode ? 'bg-gray-900 text-gray-600' : 'bg-gray-50 text-gray-400';
        
        if (isSameMonth(day, monthStart)) {
          bgColor = darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50';
          
          if (minutes > 0 || completedCount > 0) bgColor = 'bg-emerald-100 text-emerald-800';
          if (minutes > 45 || completedCount > 3) bgColor = 'bg-emerald-200 text-emerald-900';
          if (minutes > 120 || completedCount > 6) bgColor = 'bg-emerald-300 text-emerald-950';
          if (minutes > 240 || completedCount > 10) bgColor = 'bg-emerald-500 text-white';
        }
        
        if (isToday(day)) {
            bgColor += ' ring-2 ring-indigo-500 ring-offset-1';
        }

        days.push(
          <div
            key={day.toString()}
            className={`relative h-10 w-full flex items-center justify-center rounded-lg cursor-pointer transition-all text-sm font-medium ${bgColor}`}
            onClick={() => setSelectedDate(cloneDay)}
          >
            {formattedDate}
            {(minutes > 0 || completedCount > 0) && (
               <div className="absolute bottom-1 w-1 h-1 rounded-full bg-current opacity-50"></div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1 mb-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  // --- Selected Date Modal Content ---
  const renderSelectedDateDetails = () => {
    if (!selectedDate) return null;
    const { completed: completedTasks, created: createdTasks } = getTasksForDate(selectedDate);
    const focusMinutes = getFocusMinutesForDate(selectedDate);

    return (
      <div className={`absolute inset-0 z-20 backdrop-blur-sm rounded-2xl p-6 flex flex-col animate-fade-in ${darkMode ? 'bg-gray-800/95' : 'bg-white/95'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <CalendarIcon size={20} className="text-indigo-500"/>
            {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
          </h3>
          <button onClick={() => setSelectedDate(null)} className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`flex items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
             <div className={`p-3 rounded-full shadow-sm ${darkMode ? 'bg-gray-800 text-indigo-400' : 'bg-white text-indigo-600'}`}>
               <Clock size={20} />
             </div>
             <div>
               <p className="text-xs text-gray-500 uppercase font-semibold">专注时长</p>
               <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{focusMinutes} <span className="text-sm font-normal text-gray-500">分钟</span></p>
             </div>
          </div>
          <div className={`flex items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-emerald-900/50' : 'bg-emerald-50'}`}>
             <div className={`p-3 rounded-full shadow-sm ${darkMode ? 'bg-gray-800 text-emerald-400' : 'bg-white text-emerald-600'}`}>
               <CheckSquare size={20} />
             </div>
             <div>
               <p className="text-xs text-gray-500 uppercase font-semibold">完成任务</p>
               <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{completedTasks.length} <span className="text-sm font-normal text-gray-500">个</span></p>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
           <div>
             <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <CheckSquare size={14} /> 完成的任务 ({completedTasks.length})
             </h4>
             {completedTasks.length > 0 ? (
               <ul className="space-y-2">
                 {completedTasks.map((t, idx) => (
                   <li key={('id' in t ? t.id : `hist-${idx}`)} className={`text-sm p-2 rounded flex items-center gap-2 decoration-gray-400 line-through ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                      <CheckSquare size={14} className="text-emerald-500" /> {'text' in t ? t.text : ''}
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-gray-400 italic pl-2">无完成记录</p>
             )}
           </div>

           <div>
             <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <Square size={14} /> 创建的任务 ({createdTasks.length})
             </h4>
             {createdTasks.length > 0 ? (
               <ul className="space-y-2">
                 {createdTasks.map(t => (
                   <li key={t.id} className={`text-sm p-2 rounded flex items-center gap-2 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-600'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> {t.text}
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-gray-400 italic pl-2">无创建记录</p>
             )}
           </div>
        </div>
      </div>
    );
  };

  // --- View Mode Selector ---
  const renderViewModeSelector = () => (
    <div className={`flex gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
      {(['week', 'month', 'year'] as ViewMode[]).map(mode => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={`px-3 py-1 text-xs font-medium rounded transition ${
            viewMode === mode
              ? (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm')
              : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
          }`}
        >
          {mode === 'week' ? '周' : mode === 'month' ? '月' : '年'}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`h-full flex flex-col relative overflow-hidden transition-colors ${darkMode ? 'bg-transparent text-gray-200' : 'bg-transparent text-gray-800'}`}>
      {/* Detail Overlay */}
      {selectedDate && renderSelectedDateDetails()}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 p-6">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-xl border ${darkMode ? 'bg-orange-900/20 border-orange-900/50' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center text-orange-500 mb-1">
              <Clock size={14} className="mr-1" />
              <span className="text-xs font-semibold uppercase">今日专注</span>
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{todayMinutes}<span className="text-xs font-normal text-gray-500 ml-1">分钟</span></div>
          </div>
          <div className={`p-3 rounded-xl border ${darkMode ? 'bg-emerald-900/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className="flex items-center text-emerald-500 mb-1">
              <CheckSquare size={14} className="mr-1" />
              <span className="text-xs font-semibold uppercase">今日完成</span>
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{todayCompletedCount}<span className="text-xs font-normal text-gray-500 ml-1">个</span></div>
          </div>
          <div className={`p-3 rounded-xl border ${darkMode ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}>
            <div className="flex items-center text-indigo-500 mb-1">
              <CalendarIcon size={14} className="mr-1" />
              <span className="text-xs font-semibold uppercase">累计专注</span>
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{totalMinutes}<span className="text-xs font-normal text-gray-500 ml-1">分钟</span></div>
          </div>
        </div>

        {/* Chart Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <TrendingUp size={16} />
              {viewMode === 'week' ? '近7天趋势' : viewMode === 'month' ? `${format(currentMonth, 'yyyy年M月')}趋势` : `${getYear(new Date())}年趋势`}
            </h4>
            <div className="flex items-center gap-2">
              {viewMode === 'month' && (
                <div className="flex gap-1 mr-2">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><ChevronLeft size={16}/></button>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><ChevronRight size={16}/></button>
                </div>
              )}
              {renderViewModeSelector()}
            </div>
          </div>
          
          {/* Dual Bar Chart - Focus Minutes and Tasks Completed */}
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke={darkMode ? '#9ca3af' : '#666'} />
                <YAxis yAxisId="left" orientation="left" fontSize={10} axisLine={false} tickLine={false} stroke={darkMode ? '#9ca3af' : '#666'} />
                <YAxis yAxisId="right" orientation="right" fontSize={10} axisLine={false} tickLine={false} stroke={darkMode ? '#9ca3af' : '#666'} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    backgroundColor: darkMode ? '#374151' : '#fff',
                    color: darkMode ? '#fff' : '#000'
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'focusMinutes' ? '专注(分钟)' : '完成任务'
                  ]}
                />
                <Bar yAxisId="left" dataKey="focusMinutes" radius={[4, 4, 0, 0]} fill="#6366f1" name="focusMinutes" />
                <Bar yAxisId="right" dataKey="tasksCompleted" radius={[4, 4, 0, 0]} fill="#10b981" name="tasksCompleted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-indigo-500"></div>
              <span>专注时长</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>完成任务</span>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <ListChecks size={16} />
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </h4>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><ChevronLeft size={16}/></button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><ChevronRight size={16}/></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-gray-500 font-medium">
             <div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div><div>日</div>
          </div>
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
};

export default Stats;
