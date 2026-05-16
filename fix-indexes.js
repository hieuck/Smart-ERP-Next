const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'packages/database/src/schema');
const files = fs.readdirSync(dir);
files.forEach(file => {
  if (!file.endsWith('.ts')) return;
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('=> [')) {
    content = content.replace(/\(table\)\s*=>\s*\[([\s\S]*?)\]/g, (match, inner) => {
      let i = 1;
      // Find lines that start with index( or have index(
      const replaced = inner.split('\n').map(line => {
        if (line.includes('index(')) {
          return line.replace(/(^\s*)(index\()/, `$1idx${i++}: $2`);
        }
        return line;
      }).join('\n');
      return `(table) => ({${replaced}})`
    });
    fs.writeFileSync(p, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});
