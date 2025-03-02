const { app, BrowserWindow } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

let mainWindow;
let backendProcess;
let pythonProcess;

// ✅ Use the extracted paths from `/opt/MyApp/`
const appPath = process.resourcesPath;
console.log({ appPath });
const nodejsPath = path.join(appPath, "resources/nodejs");
const fastapiPath = path.join(appPath, "resources/fastapi");

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  mainWindow.loadURL("http://localhost:3000");

  // ✅ Step 1: Ensure Node.js is Installed
  let nodePath = "node";
  try {
    nodePath = execSync("command -v node", { encoding: "utf8" }).trim();
    console.log("✅ Found Node.js at:", nodePath);
  } catch (err) {
    console.error("❌ Node.js not found! Installing now...");
    execSync(
      "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
      { stdio: "inherit" }
    );
    execSync("sudo apt install -y nodejs", { stdio: "inherit" });
    nodePath = "node";
    console.log("✅ Node.js installed successfully!");
  }

  // ✅ Step 2: Ensure Python is Installed
  let pythonPath = "python3";
  try {
    execSync("command -v python3", { encoding: "utf8" });
    console.log("✅ Python3 is installed.");
  } catch (err) {
    console.error("❌ Python3 is missing! Installing now...");
    execSync("sudo apt install -y python3 python3-pip", { stdio: "inherit" });
    console.log("✅ Python3 installed successfully!");
  }

  // ✅ Step 3: Install Node.js Dependencies
  try {
    if (fs.existsSync(nodejsPath)) {
      console.log(
        "🔧 Fixing permissions before installing Node.js dependencies..."
      );
      execSync(`sudo chown -R $(whoami):$(whoami) ${nodejsPath}`, {
        stdio: "inherit",
      });
      execSync(`sudo chmod -R 755 ${nodejsPath}`, { stdio: "inherit" });

      console.log("📦 Installing Node.js dependencies...");
      execSync(`cd ${nodejsPath} && npm install --production --unsafe-perm`, {
        stdio: "inherit",
      });

      console.log("✅ Node.js dependencies installed.");
    } else {
      console.error("❌ Node.js directory not found:", nodejsPath);
    }
  } catch (err) {
    console.error("❌ Failed to install Node.js dependencies:", err);
    return;
  }

  // ✅ Step 4: Install Python Dependencies
  const requirementsFile = path.join(fastapiPath, "requirements.txt");
  if (fs.existsSync(requirementsFile)) {
    try {
      console.log("📦 Installing Python dependencies...");
      execSync(`pip3 install -r ${requirementsFile}`, { stdio: "inherit" });
      console.log("✅ Python dependencies installed.");
    } catch (err) {
      console.error("❌ Failed to install Python dependencies:", err);
      return;
    }
  } else {
    console.error("❌ Python requirements.txt not found!");
    return;
  }

  // ✅ Step 5: Start Node.js Backend
  const nodeScript = path.join(nodejsPath, "server.js");
  if (fs.existsSync(nodeScript)) {
    backendProcess = spawn(nodePath, [nodeScript], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PATH: process.env.PATH },
    });
    backendProcess.unref();
    console.log("✅ Node.js backend started.");
  } else {
    console.error("❌ Node.js server.js not found!");
  }

  // ✅ Step 6: Start FastAPI (Python)
  const pythonScript = path.join(fastapiPath, "app.py");
  if (fs.existsSync(pythonScript)) {
    pythonProcess = spawn(pythonPath, [pythonScript], {
      detached: true,
      stdio: "ignore",
    });
    pythonProcess.unref();
    console.log("✅ FastAPI (Python) server started.");
  } else {
    console.error("❌ FastAPI app.py not found!");
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
