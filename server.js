const { execFile } = require('child_process');

// Run a Python script
execFile('python3', ['script.py', '--arg1', '--arg2'], (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  console.log(`Python Output:\n${stdout}`);
});