import { Task, Column, DailySnapshot, HistoricalTask } from '../types';
import { format } from 'date-fns';

/**
 * Generate markdown content for a single day
 */
export function generateDayMarkdown(
  date: string, // YYYY-MM-DD
  tasks: Task[],
  columns: Column[],
  focusMinutes: number
): string {
  const lines: string[] = [];
  
  // Header with date
  lines.push(`## ${date} 任务`);
  lines.push('');
  
  // Group tasks by column
  for (const column of columns) {
    const columnTasks = tasks.filter(t => t.columnId === column.id);
    if (columnTasks.length === 0) continue;
    
    lines.push(`### ${column.title}`);
    for (const task of columnTasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${task.text}`);
    }
    lines.push('');
  }
  
  // Add focus time
  if (focusMinutes > 0) {
    lines.push(`> 专注时间: ${focusMinutes} 分钟`);
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate full monthly markdown file content
 */
export function generateMonthlyMarkdown(
  yearMonth: string, // YYYY-MM
  dailyContents: Map<string, string>
): string {
  const lines: string[] = [];
  
  // Title
  lines.push(`# ${yearMonth} 任务记录`);
  lines.push('');
  
  // Sort dates and append content
  const sortedDates = Array.from(dailyContents.keys()).sort();
  for (const date of sortedDates) {
    lines.push(dailyContents.get(date) || '');
    lines.push('---');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Parse markdown file to extract daily snapshots
 */
export function parseMarkdownToSnapshots(content: string): DailySnapshot[] {
  const snapshots: DailySnapshot[] = [];
  
  // Split by day headers
  const dayRegex = /^## (\d{4}-\d{2}-\d{2}) 任务$/gm;
  const sections = content.split(dayRegex);
  
  // First element is the title, skip it
  for (let i = 1; i < sections.length; i += 2) {
    const dateStr = sections[i];
    const sectionContent = sections[i + 1] || '';
    
    const tasks: HistoricalTask[] = [];
    let focusMinutes = 0;
    
    // Parse tasks
    let columnTitle = '未分类';
    
    const lines = sectionContent.split('\n');
    for (const line of lines) {
      // Check for column header
      const columnMatch = line.match(/^### (.+)$/);
      if (columnMatch) {
        columnTitle = columnMatch[1];
        continue;
      }
      
      // Check for task
      const taskMatch = line.match(/^- \[([ x])\] (.+)$/);
      if (taskMatch) {
        tasks.push({
          id: `imported-${Date.now()}-${Math.random()}`,
          text: taskMatch[2],
          completed: taskMatch[1] === 'x',
          columnTitle
        });
      }
      
      // Check for focus time
      const focusMatch = line.match(/^> 专注时间: (\d+) 分钟$/);
      if (focusMatch) {
        focusMinutes = parseInt(focusMatch[1], 10);
      }
    }
    
    snapshots.push({
      date: dateStr,
      tasks,
      focusMinutes
    });
  }
  
  return snapshots;
}

/**
 * Update or append a day's content in monthly markdown
 */
export function updateMonthlyMarkdown(
  existingContent: string,
  date: string,
  dayContent: string
): string {
  const dayHeader = `## ${date} 任务`;
  const dayRegex = new RegExp(`## ${date} 任务[\\s\\S]*?(?=\\n---\\n|\\n## \\d{4}-\\d{2}-\\d{2} 任务|$)`, 'g');
  
  if (existingContent.includes(dayHeader)) {
    // Replace existing day content
    return existingContent.replace(dayRegex, dayContent);
  } else {
    // Append new day content
    // Find the right position (sorted by date)
    const lines = existingContent.split('\n');
    const insertContent = dayContent + '\n---\n';
    
    // Find all existing dates
    const existingDates: { date: string; index: number }[] = [];
    lines.forEach((line, index) => {
      const match = line.match(/^## (\d{4}-\d{2}-\d{2}) 任务$/);
      if (match) {
        existingDates.push({ date: match[1], index });
      }
    });
    
    // Find insertion point
    let insertIndex = lines.length;
    for (const ed of existingDates) {
      if (date < ed.date) {
        insertIndex = ed.index;
        break;
      }
    }
    
    // Insert
    lines.splice(insertIndex, 0, insertContent);
    return lines.join('\n');
  }
}

/**
 * Get month filename from date
 */
export function getMonthFilename(date: Date): string {
  return format(date, 'yyyy-MM') + '.md';
}
