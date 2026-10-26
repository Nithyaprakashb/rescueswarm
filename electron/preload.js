const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Serial connection
  serialConnect: (port, baudRate) => 
    ipcRenderer.invoke('serial-connect', { port, baudRate }),
  serialDisconnect: () => 
    ipcRenderer.invoke('serial-disconnect'),
  
  // Emergency controls
  emergencyRTO: () => 
    ipcRenderer.invoke('emergency-rto'),
  abortDrone: (droneId) => 
    ipcRenderer.invoke('abort-drone', { droneId }),
  
  // Mission controls
  startMission: () => 
    ipcRenderer.invoke('start-mission'),
  confirmSurvivor: (survivorId, lat, lon, assignedDrone) => 
    ipcRenderer.invoke('confirm-survivor', { survivorId, lat, lon, assignedDrone }),
  sendCommand: (droneId, command, params) => 
    ipcRenderer.invoke('send-command', { droneId, command, params }),
  
  // Event listeners
  onTelemetryUpdate: (callback) => {
    ipcRenderer.on('telemetry-update', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('telemetry-update');
  },
  onSerialStatus: (callback) => {
    ipcRenderer.on('serial-status', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('serial-status');
  },
  onSurvivorDetected: (callback) => {
    ipcRenderer.on('survivor-detected', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('survivor-detected');
  },
});
