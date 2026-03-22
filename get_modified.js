const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (['node_modules', '.next', '.git', 'dist', '.turbo'].includes(file)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, files);
    } else {
      const date = new Date(stat.mtime);
      if (date.getFullYear() === 2026 && date.getMonth() === 2 && date.getDate() === 17) {
        files.push({ file: fullPath.replace('c:\\Users\\brand\\OneDrive\\Desktop\\development\\emode\\', ''), time: date.toLocaleTimeString() });
      }
    }
  }
  return files;
}

const res = getFiles('c:\\Users\\brand\\OneDrive\\Desktop\\development\\emode');
res.sort((a,b) => new Date('1970/01/01 ' + b.time).getTime() - new Date('1970/01/01 ' + a.time).getTime());
fs.writeFileSync('c:\\Users\\brand\\OneDrive\\Desktop\\development\\emode\\files_modified.json', JSON.stringify(res, null, 2));
