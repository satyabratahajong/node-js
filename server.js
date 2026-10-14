const fs = require('fs');
const path = require('path');

// Target directory passed via command line argument or defaults to './downloads'
const targetDir = process.argv[2] || path.join(__dirname, 'downloads');

const extensionMap = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  documents: ['.pdf', '.docx', '.txt', '.xlsx', '.csv', '.pptx'],
  archives: ['.zip', '.tar', '.gz', '.rar', '.7z'],
  code: ['.js', '.py', '.html', '.css', '.json', '.ts']
};

function organizeFiles() {
  if (!fs.existsSync(targetDir)) {
    console.log(`Directory does not exist: ${targetDir}`);
    return;
  }

  const items = fs.readdirSync(targetDir);
  items.forEach(item => {
    const filePath = path.join(targetDir, item);
    if (fs.statSync(filePath).isDirectory()) return;

    const ext = path.extname(item).toLowerCase();
    let category = 'others';

    for (const [cat, exts] of Object.entries(extensionMap)) {
      if (exts.includes(ext)) {
        category = cat;
        break;
      }
    }

    const categoryDir = path.join(targetDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir);
    }

    fs.renameSync(filePath, path.join(categoryDir, item));
    console.log(`Sorted: ${item} -> ${category}/`);
  });
  console.log('File organization complete!');
}

organizeFiles();
