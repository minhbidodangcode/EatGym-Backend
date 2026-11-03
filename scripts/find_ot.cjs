const fs = require('fs');
const path = require('path');
const ings = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json')));
console.log(ings.filter(x => x.name.toLowerCase().includes('ớt')).map(x => x.name));
