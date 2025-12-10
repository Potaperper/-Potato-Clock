
import React, { useState } from 'react';
import { Settings, DEFAULT_SETTINGS, SoundType } from '../types';
import { X, RotateCcw, Save, Upload, Music, Trash2, Folder, Moon, Sun, Volume2, Monitor } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (newSettings: Settings) => void;
  customSounds: Record<SoundType, File | null | string>; 
  onCustomSoundChange: (type: SoundType, file: File | null) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSave,
  onCustomSoundChange
}) => {
  const [localSettings, setLocalSettings] = React.useState<Settings>(settings);
  const [tempFileNames, setTempFileNames] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
        setLocalSettings(settings);
        setTempFileNames({});
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleChange = (key: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const isDark = localSettings.darkMode;

  const SoundUploader = ({ 
    type, 
    label, 
    accept = "audio/mp3" 
  }: { 
    type: SoundType, 
    label: string, 
    accept?: string 
  }) => {
    const savedPath = localSettings.soundPaths[type];
    
    let displayName = '默认提示音';
    let isSet = false;

    if (tempFileNames[type]) {
        displayName = tempFileNames[type];
        isSet = true;
    } else if (savedPath) {
        const parts = savedPath.split(/[/\\]/);
        displayName = parts.length > 0 ? parts[parts.length - 1] : savedPath;
        try { displayName = decodeURIComponent(displayName); } catch(e) {}
        isSet = true;
    }
    
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2 rounded-lg ${isSet ? (isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-600') : (isDark ? 'bg-gray-600 text-gray-400' : 'bg-gray-100 text-gray-400')}`}>
            {savedPath || tempFileNames[type] ? <Folder size={18} /> : <Music size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{label}</p>
            <p className="text-xs text-gray-500 truncate" title={displayName}>
              {displayName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id={`file-${type}`}
            accept={accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const file = e.target.files[0];
                onCustomSoundChange(type, file);
                setTempFileNames(prev => ({ ...prev, [type]: file.name }));
              }
            }}
          />
          <label 
            htmlFor={`file-${type}`}
            className={`p-2 rounded-lg cursor-pointer transition ${isDark ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
            title={savedPath ? "更新本地文件" : "上传文件"}
          >
            <Upload size={18} />
          </label>
          {isSet && (
            <button
              onClick={() => {
                 onCustomSoundChange(type, null);
                 setTempFileNames(prev => {
                    const next = { ...prev };
                    delete next[type];
                    return next;
                 });
                 setLocalSettings(prev => ({
                    ...prev,
                    soundPaths: { ...prev.soundPaths, [type]: null }
                 }));
              }}
              className={`p-2 rounded-lg transition ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
              title="清除设置"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const VolumeSlider = ({ label, valueKey }: { label: string, valueKey: keyof Settings }) => (
      <div>
        <div className="flex justify-between mb-1">
            <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{localSettings[valueKey] as number}%</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={localSettings[valueKey] as number}
          onChange={(e) => handleChange(valueKey, Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`p-4 flex justify-between items-center border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>设置</h2>
            <button onClick={onClose} className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Appearance */}
            <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">外观 (Appearance)</h3>
                <div className="space-y-4">
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                            {isDark ? <Moon size={18} className="text-indigo-400"/> : <Sun size={18} className="text-orange-500"/>}
                            <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>夜间模式</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={localSettings.darkMode} onChange={(e) => handleChange('darkMode', e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-2 mb-3">
                            <Monitor size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>界面缩放 (UI Zoom)</span>
                            <span className="ml-auto text-xs text-gray-500">{(localSettings.uiScale * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                            type="range" 
                            min="0.5" max="1.0" step="0.05"
                            value={localSettings.uiScale}
                            onChange={(e) => handleChange('uiScale', Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                    </div>
                </div>
            </section>

            {/* Time Settings */}
            <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">时间设置 (Timer)</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>工作时长 (分钟)</label>
                    <input 
                        type="number" 
                        value={localSettings.workDuration}
                        onChange={(e) => handleChange('workDuration', Number(e.target.value))}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    </div>
                    <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>休息时长 (分钟)</label>
                    <input 
                        type="number" 
                        value={localSettings.breakDuration}
                        onChange={(e) => handleChange('breakDuration', Number(e.target.value))}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    </div>
                </div>
                <div className={`mt-4 space-y-3 p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>自动开始休息</span>
                        <input type="checkbox" checked={localSettings.autoStartBreak} onChange={(e) => handleChange('autoStartBreak', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>自动开始工作</span>
                        <input type="checkbox" checked={localSettings.autoStartWork} onChange={(e) => handleChange('autoStartWork', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                    </div>
                </div>
            </section>

            {/* Micro Breaks */}
            <section>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">微休息 (Micro-Breaks)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={localSettings.enableMicroBreaks} onChange={(e) => handleChange('enableMicroBreaks', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
                
                {localSettings.enableMicroBreaks && (
                    <div className={`p-4 rounded-lg space-y-4 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>微休息时长 (秒)</label>
                        <input 
                        type="number" 
                        value={localSettings.microBreakDuration}
                        onChange={(e) => handleChange('microBreakDuration', Number(e.target.value))}
                            className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>最小间隔 (分钟)</label>
                        <input 
                            type="number" 
                            value={localSettings.microBreakMinInterval}
                            onChange={(e) => handleChange('microBreakMinInterval', Number(e.target.value))}
                            className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                        </div>
                        <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>最大间隔 (分钟)</label>
                        <input 
                            type="number" 
                            value={localSettings.microBreakMaxInterval}
                            onChange={(e) => handleChange('microBreakMaxInterval', Number(e.target.value))}
                                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                        </div>
                    </div>
                    </div>
                )}
            </section>

            {/* Audio */}
            <section>
                <div className="flex items-center gap-2 mb-4 border-b pb-2 text-gray-500">
                    <Volume2 size={16} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">音量控制</h3>
                </div>
                <div className={`space-y-4 p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <VolumeSlider label="提示音 (工作/休息结束)" valueKey="volumeNotification" />
                    <VolumeSlider label="休息背景音乐" valueKey="volumeBreak" />
                    <VolumeSlider label="微休息背景音乐" valueKey="volumeMicroBreak" />
                </div>
            </section>

            {/* Custom Sounds */}
            <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">自定义提示音 (Local/Electron)</h3>
                <div className="space-y-3">
                    <SoundUploader type="workEnd" label="工作结束提示音" accept=".mp3" />
                    <SoundUploader type="breakEnd" label="休息结束提示音" accept=".mp3" />
                    <SoundUploader type="breakBg" label="休息背景音乐" accept=".mp3" />
                    <SoundUploader type="microBreakBg" label="微休息背景" accept=".mp3" />
                    <p className="text-xs text-gray-400 mt-2 italic">* 打包为 Electron 应用后，选择的文件路径会被自动保存。仅支持 MP3。</p>
                </div>
            </section>

        </div>

            {/* Footer */}
        <div className={`p-4 border-t flex justify-between ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
            <button 
            onClick={() => setLocalSettings(DEFAULT_SETTINGS)}
            className={`flex items-center px-4 py-2 text-sm transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
            <RotateCcw size={16} className="mr-2" />
            重置默认
            </button>
            <button 
            onClick={handleSave}
            className="flex items-center px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-lg"
            >
            <Save size={16} className="mr-2" />
            保存设置
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
