const fs = require('fs');
const path = require('path');
const allIngs = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));
const ingMap = new Map(allIngs.map(x => [x.name.toLowerCase().trim(), x]));

function get(name) {
  const norm = name.toLowerCase().trim();
  let v = ingMap.get(norm);
  if (!v) {
    for (const [k, item] of ingMap.entries()) {
      if (k === norm || k.includes(norm) || norm.includes(k)) {
        v = item;
        break;
      }
    }
  }
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

function testCombo(dishName, target, items) {
  // items: array of { ing: get('...'), amount: X }
  let p = 0, c = 0, f = 0;
  for (const item of items) {
    p += (item.amount / 100) * item.ing.p;
    c += (item.amount / 100) * item.ing.c;
    f += (item.amount / 100) * item.ing.f;
  }
  p = Math.round(p * 10) / 10;
  c = Math.round(c * 10) / 10;
  f = Math.round(f * 10) / 10;
  const kcal = Math.round((4 * p + 4 * c + 9 * f) * 10) / 10;

  const diffP = Math.abs(p - target.p);
  const diffC = Math.abs(c - target.c);
  const diffF = Math.abs(f - target.f);
  const diffK = Math.abs(kcal - target.kcal);

  const errP = target.p > 0 ? diffP / target.p : diffP;
  const errC = target.c > 0 ? diffC / target.c : diffC;
  const errF = target.f > 0 ? diffF / target.f : diffF;
  const errK = target.kcal > 0 ? diffK / target.kcal : diffK;

  const ok = (errP <= 0.15 || diffP <= 1.0) &&
             (errC <= 0.15 || diffC <= 1.0) &&
             (errF <= 0.15 || diffF <= 1.0) &&
             (errK <= 0.15 || diffK <= 10.0);

  console.log(`Dish: ${dishName}`);
  console.log(`  Target: P=${target.p}, C=${target.c}, F=${target.f}, Kcal=${target.kcal}`);
  console.log(`  Calc:   P=${p}, C=${c}, F=${f}, Kcal=${kcal}`);
  console.log(`  Err:    P=${(errP*100).toFixed(1)}%, C=${(errC*100).toFixed(1)}%, F=${(errF*100).toFixed(1)}%, K=${(errK*100).toFixed(1)}%`);
  console.log(`  Result: ${ok ? 'PASS' : 'FAIL'}`);
  console.log(`  Ingredients: ${items.map(i => `${i.ing.name}: ${i.amount}${i.ing.unit}`).join(', ')}`);
  return ok;
}

// 1. Đậu hủ chiên xả: target: P=11.6, C=0.7, F=11, Kcal=148.2
console.log('--- 1. ĐẬU HỦ CHIÊN XẢ ---');
// Đậu phụ: P=10.9, C=0.7, F=5.4 / 100g
// If 106g Đậu phụ: P = 11.55g, C = 0.74g, F = 5.72g
// Dầu ăn thực vật: F = 100 / 100g. 5.3g -> F = 5.3g => total F = 11.02g
// Sả băm: 3g -> P=0.06, C=0.25, F=0
testCombo('Đậu hủ chiên xả', { p: 11.6, c: 0.7, f: 11, kcal: 148.2 }, [
  { ing: get('Đậu phụ'), amount: 104 },
  { ing: get('Dầu ăn thực vật'), amount: 5.4 },
  { ing: get('Sả băm'), amount: 2 },
  { ing: get('Ớt tươi'), amount: 1 }
]);

// 2. Tôm lăn bột chiên: target: P=2.6, C=36.3, F=10.1, Kcal=246.5
console.log('\n--- 2. TÔM LĂN BỘT CHIÊN ---');
// Tôm sú bóc vỏ: P=24.0, C=0.2, F=0.3
// Bột sắn dây: P=0.7, C=84.3, F=0.0
// Dầu ăn thực vật: F=100
// Hành lá tươi: P=1.8, C=7.3, F=0.2
testCombo('Tôm lăn bột chiên', { p: 2.6, c: 36.3, f: 10.1, kcal: 246.5 }, [
  { ing: get('Tôm sú bóc vỏ'), amount: 9.5 },
  { ing: get('Bột sắn dây'), amount: 43 },
  { ing: get('Dầu ăn thực vật'), amount: 10 },
  { ing: get('Hành lá tươi'), amount: 2 }
]);

// 3. Tàu hủ ky chiên: target: P=37.2, C=4.8, F=15.4, Kcal=306.6
console.log('\n--- 3. TÀU HỦ KY CHIÊN ---');
// How to get P=37.2, C=4.8, F=15.4?
// What if we test all combinations of ings?
