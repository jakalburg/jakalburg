const fs = require('fs');
const path = require('path');

const header = fs.readFileSync(
  path.join(__dirname, 'schema.header.prisma'),
  'utf8',
);
const modelsDir = path.join(__dirname, 'models');
const modelFiles = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.prisma'));
const parts = [header];
for (const file of modelFiles) {
  const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
  parts.push('\n' + content);
}
fs.writeFileSync(path.join(__dirname, 'schema.prisma'), parts.join('\n'));
console.log('Built prisma/schema.prisma with models:', modelFiles.join(', '));
