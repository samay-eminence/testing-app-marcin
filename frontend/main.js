const { app, BrowserWindow } = require("electron");
const {
  checkNodeDependencies,
  checkPythonDependencies,
  setupDependencies,
  checkPostgresRunning,
  checkOllamaRunning,
  checkBackendProcessesRunning,
  checkPythonProcessesRunning,
} = require("./execUtils");

const isMac = process.platform === "darwin";

let backendProcess;
let pythonProcess;
let postgresProcess;
let ollamaProcess;

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  mainWindow.loadURL("http://localhost:3000");

  setupDependencies();

  checkPostgresRunning(); // ✅ Start PostgreSQL

  checkOllamaRunning(ollamaProcess); // ✅ Start Ollama

  checkNodeDependencies();

  checkPythonDependencies();

  checkBackendProcessesRunning(backendProcess);

  checkPythonProcessesRunning(pythonProcess);
});

// ✅ Graceful Shutdown
app.on("window-all-closed", () => {
  if (postgresProcess) postgresProcess.kill();
  if (ollamaProcess) ollamaProcess.kill();
  if (backendProcess) backendProcess.kill();
  if (pythonProcess) pythonProcess.kill();
  if (!isMac) app.quit();
});
