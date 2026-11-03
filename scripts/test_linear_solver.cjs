// Test 3x3 linear solver for nutrition
function solve3x3(A, b) {
  // A is 3x3 matrix [[a11, a12, a13], [a21, a22, a23], [a31, a32, a33]]
  // b is [b1, b2, b3]
  const det = 
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  if (Math.abs(det) < 1e-6) return null;

  const invDet = 1 / det;

  const x0 = invDet * (
    b[0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (b[1] * A[2][2] - A[1][2] * b[2]) +
    A[0][2] * (b[1] * A[2][1] - A[1][1] * b[2])
  );

  const x1 = invDet * (
    A[0][0] * (b[1] * A[2][2] - A[1][2] * b[2]) -
    b[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * b[2] - b[1] * A[2][0])
  );

  const x2 = invDet * (
    A[0][0] * (A[1][1] * b[2] - b[1] * A[2][1]) -
    A[0][1] * (A[1][0] * b[2] - b[1] * A[2][0]) +
    b[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
  );

  return [x0, x1, x2];
}

const fs = require('fs');
const path = require('path');
const allIngs = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));
const ingMap = new Map(allIngs.map(x => [x.name.toLowerCase().trim(), x]));

function get(name) {
  const v = ingMap.get(name.toLowerCase().trim());
  if (!v) throw new Error(`Not found: ${name}`);
  return {
    id: v.id,
    name: v.name,
    p: Number(v.protein_g),
    c: Number(v.carbs_g),
    f: Number(v.fat_g),
    kcal: Number(v.kcal_per_100g),
    unit: v.default_unit || 'g'
  };
}

// Test with "Canh bí rợ" (Target: kcal: 42.1, P: 1.2, C: 4.6, F: 2.1)
const pIng = get('Thịt heo nạc');
const cIng = get('Bí đỏ (Bí ngô)');
const fIng = get('Dầu ô liu nguyên chất');
const vIng = get('Hành lá tươi');

const vegAmount = 10; // 10g hành lá
const b = [
  (1.2 - (vegAmount / 100) * vIng.p) * 100,
  (4.6 - (vegAmount / 100) * vIng.c) * 100,
  (2.1 - (vegAmount / 100) * vIng.f) * 100
];

const A = [
  [pIng.p, cIng.p, fIng.p],
  [pIng.c, cIng.c, fIng.c],
  [pIng.f, cIng.f, fIng.f]
];

const amounts = solve3x3(A, b);
console.log('Solved amounts:');
console.log(`${pIng.name}: ${amounts[0].toFixed(1)}g`);
console.log(`${cIng.name}: ${amounts[1].toFixed(1)}g`);
console.log(`${fIng.name}: ${amounts[2].toFixed(1)}ml`);
console.log(`${vIng.name}: ${vegAmount}g`);

const totP = (amounts[0]/100)*pIng.p + (amounts[1]/100)*cIng.p + (amounts[2]/100)*fIng.p + (vegAmount/100)*vIng.p;
const totC = (amounts[0]/100)*pIng.c + (amounts[1]/100)*cIng.c + (amounts[2]/100)*fIng.c + (vegAmount/100)*vIng.c;
const totF = (amounts[0]/100)*pIng.f + (amounts[1]/100)*cIng.f + (amounts[2]/100)*fIng.f + (vegAmount/100)*vIng.f;
const totK = 4*totP + 4*totC + 9*totF;

console.log(`\nTarget: P=1.2, C=4.6, F=2.1, Kcal=42.1`);
console.log(`Result: P=${totP.toFixed(2)}, C=${totC.toFixed(2)}, F=${totF.toFixed(2)}, Kcal=${totK.toFixed(2)}`);
console.log(`Error: P=${Math.abs(totP-1.2)/1.2*100}%, C=${Math.abs(totC-4.6)/4.6*100}%, F=${Math.abs(totF-2.1)/2.1*100}%, K=${Math.abs(totK-42.1)/42.1*100}%`);
