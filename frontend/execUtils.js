const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ✅ Detect Platform
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

// ✅ Get Home Directory
const homeDir = process.env.HOME || process.env.USERPROFILE;

// ✅ Set Paths for NVM and Conda
const nvmDir = isWindows
  ? path.join(homeDir, "AppData", "Roaming", "nvm")
  : path.join(homeDir, ".nvm");
const condaDir = isWindows
  ? path.join(homeDir, "Anaconda3")
  : path.join(homeDir, "miniconda3");

const appPath = process.resourcesPath;

const nodejsPath = path.join(appPath, "resources/nodejs");
const fastapiPath = path.join(appPath, "resources/fastapi");

// ✅ Function to Check if a Command Exists
function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ✅ Function to Fix Broken Package Dependencies (Linux Only)
function fixBrokenPackages() {
  if (!isWindows) {
    try {
      // Check if we have sudo privileges first
      execSync("sudo -n true", { stdio: "ignore" });

      console.log("🔧 Checking for broken packages...");
      const output = execSync("sudo dpkg --audit", {
        encoding: "utf-8",
      }).trim();

      if (output) {
        console.log("🔧 Fixing broken packages...");
        execSync("sudo apt --fix-broken install -y", { stdio: "inherit" });
        console.log("✅ Packages fixed.");
      } else {
        console.log("✅ No broken packages detected.");
      }
    } catch (err) {
      console.error(
        "⚠️ Warning: Failed to check/fix packages. You may need to run this with sudo."
      );
    }
  }
}

// ✅ Function to Install NVM and Node.js
function installNvmAndNode() {
  if (!commandExists("nvm")) {
    console.log("🚀 Installing NVM...");
    const installNvmCmd = isWindows
      ? 'powershell -Command "Invoke-WebRequest https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.ps1 -OutFile install-nvm.ps1; ./install-nvm.ps1"'
      : "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash";

    execSync(installNvmCmd, { shell: true, stdio: "inherit" });
    console.log("✅ NVM installed.");
  }

  console.log("📦 Ensuring NVM is sourced...");
  const nvmSource = `
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
`;

  fs.appendFileSync(path.join(homeDir, ".bashrc"), nvmSource);
  fs.appendFileSync(path.join(homeDir, ".profile"), nvmSource);
  fs.appendFileSync(path.join(homeDir, ".zshrc"), nvmSource);

  execSync(
    `bash -c "source $HOME/.nvm/nvm.sh && nvm install 18 && nvm use 18"`,
    {
      shell: true,
      stdio: "inherit",
    }
  );

  console.log("✅ Node.js installed via NVM.");
}

// ✅ Function to Install Anaconda (Miniconda)
function installConda() {
  // Check if Miniconda folder exists (this means it's already installed)
  if (fs.existsSync(condaDir)) {
    console.log(
      `✅ Miniconda is already installed at ${condaDir}. Skipping installation.`
    );
  } else {
    console.log("🚀 Installing Miniconda...");
    const condaInstaller = isWindows
      ? "https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe"
      : "https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh";

    const installCmd = isWindows
      ? `powershell -Command \"Start-Process -FilePath '${condaInstaller}' -ArgumentList '/S /D=C:\\Miniconda3' -Wait\"`
      : `wget ${condaInstaller} -O miniconda.sh && bash miniconda.sh -b -p ${condaDir}`;

    try {
      execSync(installCmd, { shell: true, stdio: "inherit" });
      console.log("✅ Miniconda installed.");
    } catch (error) {
      console.error("❌ Error installing Miniconda:", error.message);
      return; // Stop further execution if installation fails
    }
  }

  // Ensure Conda is accessible
  if (!commandExists("conda")) {
    console.error("❌ Conda is not found after installation. Check your PATH.");
    return;
  }

  console.log("📦 Setting up Conda environment...");
  try {
    execSync("conda info", { shell: true, stdio: "ignore" }); // Check if Conda is working
    execSync(
      "conda create --yes --name myenv python=3.9 || echo 'Environment exists, skipping creation'",
      {
        shell: true,
        stdio: "inherit",
      }
    );
    console.log("✅ Conda environment 'myenv' ready.");
  } catch (error) {
    console.error(
      "⚠️ Conda environment 'myenv' already exists or failed to create."
    );
  }
}

function isProcessRunning(name) {
  try {
    const output = execSync(`ps aux | grep "${name}" | grep -v grep`, {
      encoding: "utf-8",
    });
    return output.includes(name);
  } catch {
    return false;
  }
}

// ✅ Automated Setup for Dependencies
async function setupDependencies() {
  process.env.PATH = `${condaDir}/bin:${process.env.PATH}`;

  try {
    fixBrokenPackages();

    if (!commandExists("node")) {
      installNvmAndNode();
    } else {
      console.log("✅ Node.js is already installed.");
    }

    if (!fs.existsSync(condaDir) || !commandExists(`${condaDir}/bin/conda`)) {
      installConda();
    } else {
      console.log("✅ Conda is already installed.");
    }
  } catch (error) {
    console.error("❌ Error setting up dependencies:", error.message);
    process.exit(1);
  }
}

// ✅ Install Node.js Dependencies
function checkNodeDependencies() {
  if (
    fs.existsSync(nodejsPath) &&
    !fs.existsSync(path.join(nodejsPath, "node_modules"))
  ) {
    console.log("📦 Fixing permissions for Node.js dependencies...");
    execSync(`sudo chown -R $USER:$USER ${nodejsPath}`, {
      shell: true,
      stdio: "inherit",
    });

    console.log("📦 Installing Node.js dependencies...");
    execSync(`cd ${nodejsPath} && npm install --production --unsafe-perm`, {
      stdio: "inherit",
    });
    console.log("✅ Node.js dependencies installed.");
  }
}

// ✅ Install Python Dependencies
function checkPythonDependencies() {
  const requirementsFile = path.join(fastapiPath, "requirements.txt");

  const condaActivateCmd = isWindows
    ? `call ${condaDir}\\Scripts\\activate.bat myenv && `
    : `bash -c "${condaDir}/bin/conda run -n myenv pip install -r ${requirementsFile}"`;

  if (fs.existsSync(requirementsFile)) {
    const checkPythonDeps = `${condaDir}/bin/conda run -n myenv python -c "import fastapi, uvicorn, requests, torch, transformers"`;

    try {
      execSync(checkPythonDeps, { shell: true, stdio: "ignore" });
      console.log("✅ Python dependencies are already installed.");
    } catch {
      console.log("📦 Installing missing Python dependencies...");
      execSync(condaActivateCmd, { shell: true, stdio: "inherit" });
      console.log("✅ Python dependencies installed.");
    }
  }
}

function checkBackendProcessesRunning(backendProcess) {
  if (!isProcessRunning("server.js")) {
    backendProcess = spawn("node", [path.join(nodejsPath, "server.js")], {
      detached: true,
      stdio: "ignore",
    });
    backendProcess.unref();
    console.log("✅ Node.js backend started.");
  } else {
    console.log("✅ Node.js backend is already running.");
  }
}

function checkPythonProcessesRunning(pythonProcess) {
  if (!isProcessRunning("app.py")) {
    pythonProcess = spawn(
      `${condaDir}/bin/conda`,
      ["run", "-n", "myenv", "python", `${fastapiPath}/app.py`],
      {
        detached: true,
        stdio: "ignore",
      }
    );
    pythonProcess.unref();
    console.log("✅ FastAPI backend started.");
  } else {
    console.log("✅ FastAPI backend is already running.");
  }
}

module.exports = {
  commandExists,
  fixBrokenPackages,
  installNvmAndNode,
  installConda,
  isProcessRunning,
  setupDependencies,
  checkNodeDependencies,
  checkPythonDependencies,
  checkBackendProcessesRunning,
  checkPythonProcessesRunning,
};
