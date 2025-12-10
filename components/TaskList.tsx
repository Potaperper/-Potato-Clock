
import React, { useState, useEffect } from 'react';
import { Task, Column } from '../types';
import { Trash2, Plus, CheckSquare, Square, Pencil, Check, X, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  columns: Column[];
  onAddTask: (text: string, columnId: string) => void;
  onUpdateTask: (id: string, newText: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (newTasks: Task[]) => void;
  onAddColumn: (title: string) => void;
  onUpdateColumn: (id: string, title: string) => void;
  onDeleteColumn: (id: string) => void;
  darkMode?: boolean;
}

// --- Independent TaskItem Component ---
interface TaskItemProps {
  task: Task;
  darkMode: boolean;
  onUpdateTask: (id: string, newText: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDropOnTask: (e: React.DragEvent, targetTaskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task, darkMode, onUpdateTask, onToggleTask, onDeleteTask, onDragStart, onDropOnTask
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(task.text);

  // Sync local text if prop changes externally
  useEffect(() => {
    setLocalText(task.text);
  }, [task.text]);

  const handleSave = () => {
    if (localText.trim()) {
      onUpdateTask(task.id, localText);
      setIsEditing(false);
    } else {
        // If empty, revert? or delete? Revert for safety
        setLocalText(task.text);
        setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setLocalText(task.text);
    setIsEditing(false);
  };

  return (
    <div 
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} // Allow dropping here
      onDrop={(e) => onDropOnTask(e, task.id)}
      className={`group px-3 py-2 mb-1 rounded-md transition-all flex items-start gap-3 cursor-grab active:cursor-grabbing border ${
        darkMode 
          ? 'bg-transparent hover:bg-gray-800 border-transparent hover:border-gray-700' 
          : 'bg-transparent hover:bg-gray-50 border-transparent hover:border-gray-200'
      } ${task.completed ? 'opacity-60' : ''}`}
    >
      {/* Drag Handle */}
      {!isEditing && (
          <div className={`mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              <GripVertical size={14} />
          </div>
      )}
      
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex gap-2 items-start">
             <textarea 
               autoFocus
               value={localText}
               onChange={(e) => setLocalText(e.target.value)}
               onBlur={handleSave}
               rows={2}
               className={`flex-1 text-sm p-1 rounded border focus:outline-none focus:ring-2 focus:ring-red-500 resize-none ${
                 darkMode 
                   ? 'bg-gray-800 border-gray-600 text-white' 
                   : 'bg-white border-gray-300 text-gray-900' 
               }`}
               onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
                  if (e.key === 'Escape') handleCancel();
               }}
               onClick={(e) => e.stopPropagation()} // Prevent drag
             />
             <div className="flex flex-col gap-1">
                 <button onMouseDown={(e) => {e.preventDefault(); handleSave()}} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check size={16}/></button>
                 <button onMouseDown={(e) => {e.preventDefault(); handleCancel()}} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X size={16}/></button>
             </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
               <button 
                  onClick={() => onToggleTask(task.id)} 
                  onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                  className={`flex-shrink-0 mt-0.5 ${task.completed ? 'text-gray-400' : 'text-red-500 hover:text-red-600'}`}
                >
                  {task.completed ? <CheckSquare size={18} /> : <Square size={18} />}
               </button>
               <span 
                  className={`text-sm break-words whitespace-normal flex-1 select-none ${task.completed ? 'line-through text-gray-500' : (darkMode ? 'text-gray-200' : 'text-gray-800')}`}
                  onDoubleClick={() => setIsEditing(true)}
               >
                  {task.text}
               </span>
          </div>
        )}
      </div>

      {/* Actions (visible on hover) */}
      {!isEditing && (
          <div 
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5"
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
          >
              <button onClick={() => setIsEditing(true)} className={`p-1 rounded hover:bg-gray-200 ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400'}`}>
                  <Pencil size={14} />
              </button>
              <button onClick={() => onDeleteTask(task.id)} className={`p-1 rounded hover:bg-red-50 hover:text-red-500 ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400'}`}>
                  <Trash2 size={14} />
              </button>
          </div>
      )}
    </div>
  );
};

// --- Independent Column Component ---
interface TaskColumnProps {
  column: Column;
  tasks: Task[];
  darkMode: boolean;
  onAddTask: (text: string, columnId: string) => void;
  onUpdateColumn: (id: string, title: string) => void;
  onDeleteColumn: (id: string) => void;
  onUpdateTask: (id: string, newText: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  // DnD
  onDragStartTask: (e: React.DragEvent, id: string) => void;
  onDropOnTask: (e: React.DragEvent, targetTaskId: string) => void;
  onDropOnColumn: (e: React.DragEvent, columnId: string) => void;
  onDragColumnStart: (e: React.DragEvent, id: string) => void;
  onDropColumnReorder: (e: React.DragEvent, targetColId: string) => void;
}

const TaskColumn: React.FC<TaskColumnProps> = ({
  column, tasks, darkMode, 
  onAddTask, onUpdateColumn, onDeleteColumn,
  onUpdateTask, onToggleTask, onDeleteTask,
  onDragStartTask, onDropOnTask, onDropOnColumn,
  onDragColumnStart, onDropColumnReorder
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Local state for renaming column
  const [isRenaming, setIsRenaming] = useState(false);
  const [localTitle, setLocalTitle] = useState(column.title);

  // Local state for adding task
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  // Sort tasks: Incomplete first, then completed.
  const columnTasks = tasks
    .filter(t => t.columnId === column.id)
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  useEffect(() => {
    setLocalTitle(column.title);
  }, [column.title]);

  const handleSaveTitle = () => {
    if (localTitle.trim()) {
        onUpdateColumn(column.id, localTitle);
        setIsRenaming(false);
    } else {
        setLocalTitle(column.title);
        setIsRenaming(false);
    }
  };

  const handleSaveNewTask = () => {
      if (newTaskText.trim()) {
          onAddTask(newTaskText, column.id);
          setNewTaskText('');
          setIsAddingTask(false); // Auto close
      } else {
          setIsAddingTask(false);
      }
  };

  return (
    <div 
      className={`flex-1 min-h-0 flex flex-col rounded-xl border shadow-sm transition-all ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={(e) => {
        if (e.dataTransfer.getData('application/potato-task')) {
             onDropOnColumn(e, column.id);
        } else if (e.dataTransfer.getData('application/potato-column')) {
             onDropColumnReorder(e, column.id);
        }
      }}
    >
      {/* Column Header */}
      <div 
        className={`p-3 flex items-center justify-between rounded-t-xl select-none ${
             darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-100'
        }`}
        draggable={!isRenaming}
        onDragStart={(e) => onDragColumnStart(e, column.id)}
      >
         <div className="flex items-center gap-2 flex-1 overflow-hidden">
             <button 
               onClick={() => setIsCollapsed(!isCollapsed)}
               className={`p-1 rounded transition ${darkMode ? 'text-gray-500 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200'}`}
             >
                 {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
             </button>
             
             {isRenaming ? (
                 <div className="flex gap-1 flex-1 items-center">
                    <input 
                      autoFocus
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      onBlur={handleSaveTitle}
                      className={`flex-1 text-sm px-2 py-1 rounded border min-w-0 ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle();
                          if (e.key === 'Escape') setIsRenaming(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onMouseDown={(e) => {e.preventDefault(); handleSaveTitle()}} className="text-green-500 hover:bg-gray-200 rounded p-1"><Check size={14}/></button>
                 </div>
             ) : (
               <h3 
                  className={`font-bold text-sm truncate cursor-pointer flex-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  onDoubleClick={() => setIsRenaming(true)}
                  title={column.title}
               >
                  {column.title} <span className="ml-1 text-xs font-normal text-gray-500 opacity-60">({columnTasks.length})</span>
               </h3>
             )}
         </div>

          <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsAddingTask(true)}
                className={`p-1.5 rounded transition ${
                    isAddingTask 
                    ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-red-500 text-white') 
                    : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200')
                }`}
                title="添加任务"
              >
                  <Plus size={16} />
              </button>
              
              <button 
                onClick={() => setIsRenaming(true)} 
                className={`p-1.5 rounded transition ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200'}`}
                title="重命名栏目"
              >
                  <Pencil size={14} />
              </button>
              
              <button 
                onClick={() => onDeleteColumn(column.id)} 
                className={`p-1.5 rounded transition text-gray-400 hover:text-red-500 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}
                title="删除栏目"
              >
                  <Trash2 size={14} />
              </button>
          </div>
      </div>

      {/* Quick Add Input Area */}
      {isAddingTask && !isCollapsed && (
           <div className={`mx-3 mt-3 p-2 rounded border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
              <textarea 
                  autoFocus
                  rows={2}
                  placeholder={`添加任务到 "${column.title}"...`}
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onBlur={handleSaveNewTask}
                  className={`w-full text-sm resize-none outline-none placeholder-gray-400 ${
                      darkMode ? 'bg-transparent text-white' : 'bg-transparent text-gray-900'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveNewTask();
                    }
                    if (e.key === 'Escape') setIsAddingTask(false);
                  }}
              />
              <div className="flex justify-end gap-2 mt-2">
                  <button onMouseDown={(e) => {e.preventDefault(); setIsAddingTask(false)}} className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                  <button 
                      onMouseDown={(e) => {e.preventDefault(); handleSaveNewTask()}}
                      className="bg-red-500 text-white text-xs px-3 py-1 rounded hover:bg-red-600"
                  >
                      添加
                  </button>
              </div>
          </div>
      )}

      {/* Tasks Area */}
      {!isCollapsed && (
          <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar min-h-[60px]">
              {columnTasks.length === 0 && !isAddingTask ? (
                  <div className={`text-center py-4 text-xs italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      暂无任务
                  </div>
              ) : (
                  columnTasks.map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task}
                        darkMode={darkMode}
                        onUpdateTask={onUpdateTask}
                        onToggleTask={onToggleTask}
                        onDeleteTask={onDeleteTask}
                        onDragStart={onDragStartTask}
                        onDropOnTask={onDropOnTask}
                      />
                  ))
              )}
          </div>
      )}
    </div>
  );
};


// --- Main TaskList Component ---
const TaskList: React.FC<TaskListProps> = ({ 
  tasks, columns, 
  onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onReorderTasks
 , onUpdateColumn, onDeleteColumn,
  darkMode = false 
}) => {
  
  // --- Drag & Drop Logic ---
  
  // 1. Task Dragging
  const handleDragStartTask = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/potato-task', taskId);
    e.stopPropagation();
  };

  // 2. Column Dragging
  const handleDragStartColumn = (e: React.DragEvent, colId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/potato-column', colId);
  };

  // 3. Drop on Column (Append to end of list)
  const handleDropOnColumn = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('application/potato-task');
    if (!taskId) return;

    const newTasks = [...tasks];
    const taskIndex = newTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    // Remove from old position
    const [task] = newTasks.splice(taskIndex, 1);
    task.columnId = targetColumnId;
    
    // Append to end of new column's list (simplest for now, sorting handles display)
    newTasks.push(task);
    
    onReorderTasks(newTasks);
  };

  // 4. Drop on Task (Insert before/after target task)
  const handleDropOnTask = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedTaskId = e.dataTransfer.getData('application/potato-task');
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const newTasks = [...tasks];
    const draggedIndex = newTasks.findIndex(t => t.id === draggedTaskId);
    if (draggedIndex === -1) return;

    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    
    const targetIndex = newTasks.findIndex(t => t.id === targetTaskId);
    if (targetIndex === -1) {
        newTasks.push(draggedTask);
    } else {
        const targetTask = newTasks[targetIndex];
        draggedTask.columnId = targetTask.columnId; 
        
        // If we drop onto a completed task, maybe we should be smart, but sorting overrides index.
        // However, the array order persists.
        // Since we sort by completion in render, the visual order might differ from array order.
        // But for drag/drop reordering within same completion status, array order matters.
        newTasks.splice(targetIndex, 0, draggedTask);
    }
    
    onReorderTasks(newTasks);
  };

  // 5. Column Reordering (Swap columns) - Placeholder
  const handleDropColumnReorder = (e: React.DragEvent) => {
      e.preventDefault();
      // Logic would be in App.tsx if column reordering prop was provided.
  };

  return (
    <div className="h-full flex flex-col relative p-4 gap-4 overflow-hidden">
      {/* Columns Container - Vertical Stack */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar gap-4 pb-2">
         {columns.map(col => (
             <TaskColumn 
                key={col.id} 
                column={col}
                tasks={tasks}
                darkMode={darkMode}
                onAddTask={onAddTask}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                onUpdateTask={onUpdateTask}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
                
                onDragStartTask={handleDragStartTask}
                onDropOnTask={handleDropOnTask}
                onDropOnColumn={handleDropOnColumn}
                
                onDragColumnStart={handleDragStartColumn}
                onDropColumnReorder={handleDropColumnReorder}
             />
         ))}
      </div>
    </div>
  );
};

export default TaskList;
