// sysinfo.js
const os = require('os');
const { execSync } = require('child_process');

function getSystemDiagnostics() {
  const cpus = os.cpus();
  const totalMem = (os.totalmem() / 1024 ** 3).toFixed(2);
  const freeMem = (os.freemem() / 1024 ** 3).toFixed(2);
  const uptimeHours = (os.uptime() / 3600).toFixed(2);

  let nodeVersion = process.version;
  let npmVersion = 'N/A';

  try {
    npmVersion = execSync('npm -v').toString().trim();
  } catch (err) {
    // npm not installed or not in PATH
  }

  console.log('='.repeat(40));
  console.log('       DEVELOPER SYSTEM DIAGNOSTICS      ');
  console.log('='.repeat(40));
  console.log(`Platform     : ${os.platform()} (${os.arch()})`);
  console.log(`OS Release   : ${os.release()}`);
  console.log(`CPU Model    : ${cpus[0].model}`);
  console.log(`CPU Cores    : ${cpus.length}`);
  console.log(`Memory Usage : ${totalMem - freeMem} GB / ${totalMem} GB`);
  console.log(`System Uptime: ${uptimeHours} hours`);
  console.log(`Node.js      : ${nodeVersion}`);
  console.log(`npm          : v${npmVersion}`);
  console.log('='.repeat(40));
}

getSystemDiagnostics();
