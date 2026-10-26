const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    title: 'Adrods_X RescueSwarm GCS v1.0',
    backgroundColor: '#F2F4F7',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Python backend daemon management
function startPythonBackend() {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, '../backend/main.py');
  
  pythonProcess = spawn(pythonPath, [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  pythonProcess.stdout.on('data', (data) => {
    try {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const message = JSON.parse(line);
        if (message.type === 'telemetry' && mainWindow) {
          mainWindow.webContents.send('telemetry-update', message.data);
        } else if (message.type === 'status' && mainWindow) {
          mainWindow.webContents.send('serial-status', message.data);
        } else if (message.type === 'survivor-detected' && mainWindow) {
          mainWindow.webContents.send('survivor-detected', message.data);
        }
      }
    } catch (e) {
      console.log('[Python stdout]:', data.toString());
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('[Python stderr]:', data.toString());
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
    setTimeout(startPythonBackend, 2000);
  });
}

function sendToPython(command) {
  if (pythonProcess && pythonProcess.stdin.writable) {
    pythonProcess.stdin.write(JSON.stringify(command) + '\n');
  }
}

// IPC Handlers
ipcMain.handle('serial-connect', async (event, { port, baudRate }) => {
  sendToPython({ type: 'connect', port, baudRate });
  return { status: 'connecting' };
});

ipcMain.handle('serial-disconnect', async () => {
  sendToPython({ type: 'disconnect' });
  return { status: 'disconnecting' };
});

ipcMain.handle('emergency-rto', async () => {
  sendToPython({ type: 'emergency-rto' });
  return { status: 'rto-sent' };
});

ipcMain.handle('send-command', async (event, { droneId, command, params }) => {
  sendToPython({ type: 'command', droneId, command, params });
  return { status: 'command-sent' };
});

ipcMain.handle('confirm-survivor', async (event, { survivorId, lat, lon, assignedDrone }) => {
  sendToPython({ type: 'confirm-survivor', survivorId, lat, lon, assignedDrone });
  return { status: 'confirmed' };
});

ipcMain.handle('start-mission', async () => {
  sendToPython({ type: 'start-mission' });
  return { status: 'mission-started' };
});

ipcMain.handle('abort-drone', async (event, { droneId }) => {
  sendToPython({ type: 'abort-drone', droneId });
  return { status: 'abort-sent' };
});

app.whenReady().then(() => {
  createWindow();
  startPythonBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});
