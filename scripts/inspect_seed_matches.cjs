const fs = require('fs');
const path = require('path');

const seedContent = fs.readFileSync(path.join(__dirname, '..', 'seed_comprehensive_data.cjs'), 'utf8');
const lines = seedContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Cơm tấm sườn') || lines[i].includes('Canh chua') || lines[i].includes('Phở bò tái')) {
    console.log(`Line ${i+1}:`);
    console.log(lines.slice(Math.max(0, i-5), Math.min(lines.length, i+30)).join('\n'));
    console.log('='.repeat(50));
  }
}
