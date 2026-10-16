const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function processLargeCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let rowCount = 0;
  let headers = [];

  for await (const line of rl) {
    if (rowCount === 0) {
      headers = line.split(',');
      console.log('Detected Headers:', headers);
    } else {
      const values = line.split(',');
      // Process each row record efficiently here
      // e.g., insert into database batch or filter data
      if (rowCount <= 5) {
        console.log(`Row ${rowCount}:`, values);
      }
    }
    rowCount++;
  }

  console.log(`Processing complete! Total rows parsed: ${rowCount - 1}`);
}

// Run script with a sample file path passed via command line
const targetFile = process.argv[2] || path.join(__dirname, 'data.csv');
processLargeCSV(targetFile);
