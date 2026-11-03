const fs = require('fs');
const path = require('path');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));
const missingIds = new Set(missing.map(m => m.id));

function checkTableOccurrences(filePath) {
  console.log(`\n=== Analyzing ${path.basename(filePath)} ===`);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let currentSection = 'HEADER';
  const tableCounts = {};

  for (const line of lines) {
    if (line.startsWith('COPY public.')) {
      currentSection = line.substring(5, line.indexOf('(')).trim();
    } else if (line.startsWith('INSERT INTO ')) {
      currentSection = line.substring(12, line.indexOf(' ', 12)).trim();
    } else if (line.startsWith('\\.')) {
      currentSection = 'OUTSIDE_COPY';
    }

    for (const id of missingIds) {
      if (line.includes(id)) {
        tableCounts[currentSection] = (tableCounts[currentSection] || 0) + 1;
        break; // Count once per line
      }
    }
  }

  console.log('Occurrences of missing IDs by table / section:', tableCounts);
}

checkTableOccurrences(path.join(__dirname, '..', 'init.sql'));
checkTableOccurrences(path.join(__dirname, '..', '..', 'scratch_sync_recipes.sql'));
