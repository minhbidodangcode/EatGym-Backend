const fs = require('fs');
const path = require('path');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

// Check what DANH_SACH_MON_AN_DATABASE.md contains:
const mdPath = path.join(__dirname, '..', '..', 'DANH_SACH_MON_AN_DATABASE.md');
const mdContent = fs.readFileSync(mdPath, 'utf8');
console.log('DANH_SACH_MON_AN_DATABASE.md size:', mdContent.length);

// Let's see some sample occurrences of missing titles in DANH_SACH_MON_AN_DATABASE.md
let mdMatches = 0;
for (const m of missing) {
  if (mdContent.includes(m.cleanTitle)) {
    mdMatches++;
  }
}
console.log(`Matched titles in DANH_SACH_MON_AN_DATABASE.md: ${mdMatches} / ${missing.length}`);

// Let's print the line where Canh bí rợ appears in DANH_SACH_MON_AN_DATABASE.md
const mdLines = mdContent.split('\n');
mdLines.forEach((l, idx) => {
  if (l.includes('Canh bí rợ')) {
    console.log(`Line ${idx+1}:`, l);
  }
});
