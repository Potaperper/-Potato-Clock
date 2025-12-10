
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // 允许渲染进程使用 Node API (如读取文件路径)
      webSecurity: false // 允许加载本地 file:// 协议的音频/视频文件
    }
  })

  // 开发环境加载本地服务，生产环境加载打包后的文件
  win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  
  // 隐藏菜单栏
  win.setMenu(null) 

  // --- 生产环境关闭开发者工具 ---
  // win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
