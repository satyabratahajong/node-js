exec('node long-running-script.js', { timeout: 5000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
  if (error) {
    if (error.killed) console.log('Process was killed');
    if (error.signal) console.log(`Process terminated by signal: ${error.signal}`);
    console.error(`Execution error: ${error.message}`);
    return;
  }
  console.log(stdout);
});