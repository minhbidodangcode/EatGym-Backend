const fs = require('fs');
const path = require('path');

const lines = fs.readFileSync(path.join(__dirname, '..', 'init.sql'), 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('Canh bí rợ')) {
    console.log(`Line ${i + 1}: ${l.substring(0, 120)}`);
  }
});
