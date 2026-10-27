const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    title: 'Adrods_X RescueSwarm GCS v1.0',
    backgroundColor: '#F2F4F7',
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // In packaged app, __dirname is inside app.asar/electron
  // So index.html is at app.asar/dist/index.html
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    console.error('Failed to load local index.html:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Python backend daemon management with graceful fallback
function startPythonBackend() {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, '../backend/main.py');
  
  try {
    pythonProcess = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    pythonProcess.on('error', (err) => {
      console.log('[Python notice]: Python daemon unavailable, frontend fallback active:', err.message);
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
      } catch {
        // Raw stdout
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.log('[Python stderr]:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python backend exited with code ${code}`);
    });
  } catch (err) {
    console.log('[Python notice]: Failed to spawn python:', err.message);
  }
}

function sendToPython(command) {
  if (pythonProcess && pythonProcess.stdin && pythonProcess.stdin.writable) {
    try {
      pythonProcess.stdin.write(JSON.stringify(command) + '\n');
    } catch {
      // Ignore write errors
    }
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
    try {
      pythonProcess.kill();
    } catch {
      // Ignore
    }
  }
  if (process.platform !== 'darwin') app.quit();
});
