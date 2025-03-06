const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ✅ Detect Platform
const isWindows = process.platform === "win32";

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

// ✅ Function to Check PostgreSQL Installation
function installPostgres() {
  if (!commandExists("psql")) {
    console.log("🚀 Installing PostgreSQL...");

    const installCmd = isWindows
      ? 'powershell -Command "choco install postgresql -y"'
      : "sudo apt update && sudo apt install -y postgresql postgresql-contrib";

    try {
      execSync(installCmd, { shell: true, stdio: "inherit" });
      console.log("✅ PostgreSQL installed.");
    } catch (error) {
      console.error("❌ Error installing PostgreSQL:", error.message);
      return;
    }
  }

  console.log("✅ PostgreSQL is installed.");
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
// ✅ Function to Start PostgreSQL Service and Ensure Authentication Works
function checkPostgresRunning() {
  try {
    const isRunning = isProcessRunning("postgres");
    if (!isRunning) {
      console.log("🚀 Starting PostgreSQL...");
      const startCmd = isWindows
        ? 'powershell -Command "Start-Service postgresql"'
        : "sudo systemctl restart postgresql"; // 🔄 Restart to apply changes

      execSync(startCmd, { shell: true, stdio: "inherit" });
      console.log("✅ PostgreSQL started.");
    } else {
      console.log("✅ PostgreSQL is already running.");
    }

    // ✅ Force password authentication for PostgreSQL
    console.log("🔧 Ensuring PostgreSQL uses password authentication...");
    try {
      execSync(
        `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'Admin@1234';"`,
        { stdio: "inherit" }
      );
      console.log("✅ PostgreSQL password authentication set.");
    } catch (error) {
      console.error("⚠️ Failed to set PostgreSQL password:", error.message);
    }

    // ✅ Create database and user (using password authentication)
    console.log("📦 Setting up PostgreSQL database and user...");
    const createUserCmd = `PGPASSWORD="Admin@1234" psql -U postgres -h localhost -c "CREATE USER root WITH PASSWORD 'Admin@1234';" || echo 'User already exists'`;
    const createDbCmd = `PGPASSWORD="Admin@1234" psql -U postgres -h localhost -c "CREATE DATABASE marcin OWNER root;" || echo 'Database already exists'`;

    execSync(createUserCmd, { shell: true, stdio: "inherit" });
    execSync(createDbCmd, { shell: true, stdio: "inherit" });

    console.log("✅ PostgreSQL setup completed.");
  } catch (error) {
    console.error("❌ Error starting PostgreSQL:", error.message);
  }
}

// ✅ Function to Start Ollama Service
function checkOllamaRunning(ollamaProcess) {
  try {
    const isRunning = isProcessRunning("ollama");
    if (!isRunning) {
      console.log("🚀 Starting Ollama...");

      ollamaProcess = spawn("ollama", ["serve"], {
        detached: true,
        stdio: "ignore",
      });
      ollamaProcess.unref();

      console.log("✅ Ollama started on port 11434.");
    } else {
      console.log("✅ Ollama is already running.");
    }
  } catch (error) {
    console.error("❌ Error starting Ollama:", error.message);
  }
}

function fixPostgresAuthentication() {
  try {
    console.log("🔧 Checking PostgreSQL authentication mode...");

    // Get PostgreSQL version dynamically
    const postgresVersion = execSync(
      "ls /etc/postgresql/ | sort -nr | head -n1",
      { encoding: "utf8" }
    ).trim();
    const pgHbaPath = `/etc/postgresql/${postgresVersion}/main/pg_hba.conf`;

    if (!fs.existsSync(pgHbaPath)) {
      console.error("❌ PostgreSQL pg_hba.conf not found. Skipping fix.");
      return;
    }

    console.log(`📄 Found pg_hba.conf at: ${pgHbaPath}`);

    // Use sudo to read and write pg_hba.conf
    let pgHbaContent = execSync(`sudo cat ${pgHbaPath}`, { encoding: "utf8" });

    if (pgHbaContent.includes("local   all   postgres   peer")) {
      console.log("⚠️ Detected 'peer' authentication. Updating to 'md5'...");

      pgHbaContent = pgHbaContent.replace(
        /local\s+all\s+postgres\s+peer/,
        "local   all   postgres   md5"
      );

      // Write back the changes using sudo
      execSync(`echo "${pgHbaContent}" | sudo tee ${pgHbaPath} > /dev/null`);

      console.log("✅ PostgreSQL authentication updated to use password.");
      console.log("🚀 Restarting PostgreSQL...");

      execSync("sudo systemctl restart postgresql", { stdio: "inherit" });
      console.log("✅ PostgreSQL restarted.");
    } else {
      console.log(
        "✅ PostgreSQL is already using 'md5' authentication. No changes needed."
      );
    }
  } catch (error) {
    console.error("❌ Error fixing PostgreSQL authentication:", error.message);
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

    if (!commandExists("psql")) {
      installPostgres();
    } else {
      console.log("✅ PostgreSQL is already installed.");
    }

    fixPostgresAuthentication();

    if (!commandExists("ollama")) {
      installOllama();
    } else {
      console.log("✅ Ollama is already installed.");
    }
  } catch (error) {
    console.error("❌ Error setting up dependencies:", error.message);
    process.exit(1);
  }
}

// ✅ Function to Check Ollama Installation
function installOllama() {
  if (!commandExists("ollama")) {
    console.log("🚀 Installing Ollama...");

    const installCmd = isWindows
      ? "winget install Ollama.Ollama"
      : "curl -fsSL https://ollama.ai/install.sh | sh";

    try {
      execSync(installCmd, { shell: true, stdio: "inherit" });
      console.log("✅ Ollama installed.");
    } catch (error) {
      console.error("❌ Error installing Ollama:", error.message);
      return;
    }
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
  checkPostgresRunning,
  checkOllamaRunning,
};
