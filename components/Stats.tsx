
import React, { useState } from 'react';
import { DailyLog, Task } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckSquare, Square, X } from 'lucide-react';
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
  isToday 
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StatsProps {
  logs: DailyLog[];
  tasks: Task[];
  darkMode?: boolean;
}

const Stats: React.FC<StatsProps> = ({ logs, tasks, darkMode = false }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // --- Aggregate Data ---
  const totalMinutes = logs.reduce((acc, log) => acc + Math.round(log.secondsWorked / 60), 0);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLog = logs.find(l => l.date === todayStr);
  const todayMinutes = todayLog ? Math.round(todayLog.secondsWorked / 60) : 0;

  // --- Last 7 Days Chart Data ---
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = logs.find(l => l.date === dateStr);
    return {
      name: format(d, 'MM/dd'),
      minutes: log ? Math.round(log.secondsWorked / 60) : 0
    };
  });

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
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Find log for this day
        const log = logs.find(l => l.date === dateStr);
        const minutes = log ? Math.round(log.secondsWorked / 60) : 0;
        
        // Intensity color logic
        let bgColor = darkMode ? 'bg-gray-900 text-gray-600' : 'bg-gray-50 text-gray-400';
        
        if (isSameMonth(day, monthStart)) {
          bgColor = darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50';
          
          if (minutes > 0) bgColor = 'bg-emerald-100 text-emerald-800';
          if (minutes > 45) bgColor = 'bg-emerald-200 text-emerald-900';
          if (minutes > 120) bgColor = 'bg-emerald-300 text-emerald-950';
          if (minutes > 240) bgColor = 'bg-emerald-500 text-white';
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
            {minutes > 0 && (
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
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const log = logs.find(l => l.date === dateStr);
    const minutes = log ? Math.round(log.secondsWorked / 60) : 0;

    const completedTasks = tasks.filter(t => t.completed && t.completedAt && isSameDay(t.completedAt, selectedDate));
    const createdTasks = tasks.filter(t => isSameDay(t.createdAt, selectedDate));

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

        <div className={`flex items-center gap-4 mb-6 p-4 rounded-xl ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
           <div className={`p-3 rounded-full shadow-sm ${darkMode ? 'bg-gray-800 text-indigo-400' : 'bg-white text-indigo-600'}`}>
             <Clock size={24} />
           </div>
           <div>
             <p className="text-xs text-gray-500 uppercase font-semibold">专注时长</p>
             <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{minutes} <span className="text-sm font-normal text-gray-500">分钟</span></p>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
           <div>
             <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <CheckSquare size={14} /> 完成的任务 ({completedTasks.length})
             </h4>
             {completedTasks.length > 0 ? (
               <ul className="space-y-2">
                 {completedTasks.map(t => (
                   <li key={t.id} className={`text-sm p-2 rounded flex items-center gap-2 decoration-gray-400 line-through ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                      <CheckSquare size={14} className="text-emerald-500" /> {t.text}
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

  return (
    <div className={`h-full flex flex-col relative overflow-hidden transition-colors ${darkMode ? 'bg-transparent text-gray-200' : 'bg-transparent text-gray-800'}`}>
      {/* Detail Overlay */}
      {selectedDate && renderSelectedDateDetails()}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 p-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-orange-900/20 border-orange-900/50' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center text-orange-500 mb-1">
              <Clock size={16} className="mr-1" />
              <span className="text-xs font-semibold uppercase">今日专注</span>
            </div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{todayMinutes}<span className="text-sm font-normal text-gray-500 ml-1">分钟</span></div>
          </div>
          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}>
            <div className="flex items-center text-indigo-500 mb-1">
              <CalendarIcon size={16} className="mr-1" />
              <span className="text-xs font-semibold uppercase">累计专注</span>
            </div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{totalMinutes}<span className="text-sm font-normal text-gray-500 ml-1">分钟</span></div>
          </div>
        </div>

        {/* Calendar View */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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

        {/* Weekly Chart */}
        <div className="h-40 w-full">
          <h4 className="text-sm font-semibold text-gray-500 mb-2">近7天趋势</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke={darkMode ? '#9ca3af' : '#666'} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  backgroundColor: darkMode ? '#374151' : '#fff',
                  color: darkMode ? '#fff' : '#000'
                }}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {last7Days.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.minutes > 0 ? '#6366f1' : (darkMode ? '#374151' : '#e5e7eb')} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Stats;
