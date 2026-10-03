const os = require("node:os");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

function bytesToGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

function getSystemInfo() {
  const cpus = os.cpus();

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    operatingSystem: os.type(),
    architecture: os.arch(),
    release: os.release(),
    username: os.userInfo().username,
    cpuModel: cpus[0]?.model || "Unknown",
    cpuCores: cpus.length,
    totalMemoryGB: bytesToGB(os.totalmem()),
    freeMemoryGB: bytesToGB(os.freemem()),
    uptimeHours: (os.uptime() / 3600).toFixed(2),
    homeDirectory: os.homedir(),
    currentDirectory: process.cwd(),
    generatedAt: new Date().toISOString()
  };
}

function displayInfo(info) {
  console.table(info);
}

async function saveReport(info) {
  const reportsDirectory = path.join(process.cwd(), "reports");

  await fs.mkdir(reportsDirectory, {
    recursive: true
  });

  const filename = `system-report-${Date.now()}.json`;
  const filePath = path.join(reportsDirectory, filename);

  await fs.writeFile(
    filePath,
    JSON.stringify(info, null, 2)
  );

  console.log(`Report saved to: ${filePath}`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const processInstance = spawn(command, args, {
      shell: process.platform === "win32"
    });

    let output = "";
    let errorOutput = "";

    processInstance.stdout.on("data", (data) => {
      output += data.toString();
    });

    processInstance.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    processInstance.on("error", reject);

    processInstance.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || `Command exited with code ${code}`));
        return;
      }

      resolve(output);
    });
  });
}

async function showNetworkInformation() {
  try {
    const command = process.platform === "win32"
      ? "ipconfig"
      : "ifconfig";

    const output = await runCommand(command, []);

    console.log(output);
  } catch (error) {
    console.error("Could not retrieve network information.");
    console.error(error.message);
  }
}

async function main() {
  const command = process.argv[2];

  if (command === "info") {
    const info = getSystemInfo();
    displayInfo(info);
    return;
  }

  if (command === "save") {
    const info = getSystemInfo();
    await saveReport(info);
    return;
  }

  if (command === "network") {
    await showNetworkInformation();
    return;
  }

  console.log(`
System Information CLI

Usage:
  node system-info.js info
  node system-info.js save
  node system-info.js network
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});