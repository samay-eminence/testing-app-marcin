const { app, BrowserWindow } = require("electron");
const {
  checkNodeDependencies,
  checkPythonDependencies,
  setupDependencies,
  checkBackendProcessesRunning,
  checkPythonProcessesRunning,
} = require("./execUtils");

let backendProcess;
let pythonProcess;

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  mainWindow.loadURL("http://localhost:3000");

  setupDependencies();

  checkNodeDependencies();

  checkPythonDependencies();

  checkBackendProcessesRunning(backendProcess);

  checkPythonProcessesRunning(pythonProcess);
});

// ✅ Graceful Shutdown
app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (pythonProcess) pythonProcess.kill();
  if (!isMac) app.quit();
});
