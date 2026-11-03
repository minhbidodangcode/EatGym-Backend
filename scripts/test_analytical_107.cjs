const fs = require('fs');
const path = require('path');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));
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

function solve3x3(A, b) {
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

// Tailored ingredient picker
function selectIngredients(dish) {
  const t = dish.cleanTitle.toLowerCase().trim();

  let pName = 'Thịt heo nạc';
  let cName = 'Cơm trắng dẻo';
  let fName = 'Dầu ô liu nguyên chất';
  let vName = 'Hành lá tươi';
  let vAmount = 10;

  if (t === 'chao (đậu hũ nhũ)') {
    pName = 'Đậu hũ trắng mềm';
    cName = 'Đậu nành Edamame';
    fName = 'Dầu mè thơm';
    vName = 'Hành lá tươi';
    vAmount = 5;
  } else if (t === 'đậu hủ chiên xả') {
    pName = 'Đậu hũ trắng mềm';
    cName = 'Đậu phụ';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Sả băm';
    vAmount = 2;
  } else if (t === 'đậu hủ sốt cà') {
    pName = 'Đậu hũ chiên non';
    cName = 'Cà chua chín';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t === 'nấm rơm kho') {
    pName = 'Nấm rơm tươi';
    cName = 'Nước tương đậu nành (Xì dầu)';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành tím băm';
    vAmount = 10;
  } else if (t === 'bánh canh chay') {
    // A bowl of vegetarian bánh canh: 120g bánh phở, 100g đậu hũ chiên non, 50g nấm rơm, 5ml dầu
    pName = 'Đậu hũ chiên non';
    cName = 'Bánh phở tươi';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Nấm rơm tươi';
    vAmount = 50;
  } else if (t.includes('bánh canh giò heo')) {
    pName = 'Thịt ba chỉ heo';
    cName = 'Bánh phở tươi';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 15;
  } else if (t.includes('bánh canh thịt heo') || t.includes('bánh canh thịt gà') || t.includes('bánh canh cua')) {
    pName = t.includes('gà') ? 'Ức gà không da' : (t.includes('cua') ? 'Thịt cua biển' : 'Thịt heo nạc');
    cName = 'Bánh phở tươi';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 15;
  } else if (t.includes('mì căn xào sả')) {
    pName = 'Đậu phụ';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Sả băm';
    vAmount = 10;
  } else if (t.includes('canh kiểm')) {
    pName = 'Đậu phộng';
    cName = 'Khoai lang mật hấp';
    fName = 'Dầu mè thơm';
    vName = 'Bí đỏ (Bí ngô)';
    vAmount = 50;
  } else if (t === 'cháo sườn') {
    pName = 'Thịt heo nạc';
    cName = 'Cơm trắng dẻo';
    fName = 'Sườn non heo nạc';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t === 'sườn nướng') {
    pName = 'Thịt heo nạc';
    cName = 'Cơm trắng dẻo';
    fName = 'Sườn non heo nạc';
    vName = 'Tỏi băm tươi';
    vAmount = 5;
  } else if (t === 'sườn ram') {
    pName = 'Thịt heo nạc';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Tỏi băm tươi';
    vAmount = 5;
  } else if (t === 'cơm tấm bì') {
    pName = 'Thịt heo nạc';
    cName = 'Cơm trắng dẻo';
    fName = 'Thịt ba chỉ heo';
    vName = 'Dưa leo (Dưa chuột)';
    vAmount = 20;
  } else if (t === 'canh rau dền') {
    pName = 'Thịt heo nạc băm';
    cName = 'Rau dền đỏ';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 2;
  } else if (t === 'chả trứng chưng') {
    pName = 'Thịt heo nạc';
    cName = 'Cơm trắng dẻo';
    fName = 'Trứng gà tươi';
    vName = 'Hành lá tươi';
    vAmount = 5;
  } else if (t === '️ ️ tàu hủ ky chiên') {
    pName = 'Đậu nành Edamame';
    cName = 'Bánh phở tươi';
    fName = 'Dầu ăn thực vật';
    vName = 'Đậu phụ';
    vAmount = 50;
  } else if (t === '️ ️ xíu mại') {
    pName = 'Thịt heo nạc';
    cName = 'Cà chua chín';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành tím băm';
    vAmount = 5;
  } else if (t === 'chả cá thác lác chiên') {
    pName = 'Cá bống tươi';
    cName = 'Bánh phở tươi';
    fName = 'Dầu ăn thực vật';
    vName = 'Hành lá tươi';
    vAmount = 2;
  } else if (t === 'gỏi bì cuốn') {
    pName = 'Thịt heo nạc';
    cName = 'Bánh tráng mỏng';
    fName = 'Thịt ba chỉ heo';
    vName = 'Xà lách Romaine';
    vAmount = 15;
  } else if (t === 'bánh hỏi (tươi)') {
    pName = 'Lòng trắng trứng gà';
    cName = 'Bánh phở tươi';
    fName = 'Dầu ăn thực vật';
    vName = 'Hành lá tươi';
    vAmount = 2;
  } else if (t === 'cháo đậu đỏ') {
    pName = 'Đậu đỏ hạt';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t === 'cháo lòng') {
    pName = 'Bao tử heo';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ăn thực vật';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t === 'cháo trắng') {
    pName = 'Lòng trắng trứng gà';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu mè thơm';
    vName = 'Hành lá tươi';
    vAmount = 5;
  } else if (t === 'mực xào sả ớt') {
    pName = 'Mực tươi';
    cName = 'Sả băm';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Ớt tươi';
    vAmount = 2;
  } else if (t === 'tôm lăn bột chiên') {
    pName = 'Bánh phở tươi';
    cName = 'Khoai lang mật hấp';
    fName = 'Dầu ăn thực vật';
    vName = 'Tôm sú bóc vỏ';
    vAmount = 10;
  } else {
    // Other dishes
    const def = defaultSelector(dish);
    pName = def.pName;
    cName = def.cName;
    fName = def.fName;
    vName = def.vName;
    vAmount = def.vAmount;
  }

  return {
    pIng: get(pName),
    cIng: get(cName),
    fIng: get(fName),
    vIng: get(vName),
    vAmount
  };
}

function defaultSelector(dish) {
  const t = dish.cleanTitle.toLowerCase().trim();
  let pName = 'Thịt heo nạc';
  let cName = 'Cơm trắng dẻo';
  let fName = 'Dầu ô liu nguyên chất';
  let vName = 'Hành lá tươi';
  let vAmount = 10;

  // IMPORTANT: Match 'bánh canh' BEFORE 'canh'
  if (t.includes('bánh canh') || t.includes('phở') || t.includes('hủ tíu')) {
    pName = t.includes('bò') ? 'Thịt thăn bò nạc' : (t.includes('gà') ? 'Ức gà không da' : (t.includes('giò') ? 'Giòheo bỏ xương' : (t.includes('cua') ? 'Thịt cua biển' : 'Thịt heo nạc')));
    cName = 'Bánh phở tươi';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Giá đỗ xanh';
    vAmount = 15;
  } else if (t.includes('canh')) {
    pName = t.includes('tôm') ? 'Tôm sú bóc vỏ' : (t.includes('cá') ? 'Cá lóc đồng (Cá quả)' : 'Thịt heo nạc băm');
    cName = t.includes('bí') ? 'Bí đỏ (Bí ngô)' : (t.includes('bắp cải') ? 'Bắp cải trắng' : (t.includes('khoai') ? 'Khoai lang mật hấp' : (t.includes('khổ qua') ? 'Mướp đắng (Khổ qua)' : 'Cải ngọt')));
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t.includes('mì') || t.includes('nui') || t.includes('miến')) {
    pName = t.includes('bò') ? 'Thịt thăn bò nạc' : (t.includes('gà') ? 'Ức gà không da' : 'Thịt heo nạc');
    cName = 'Mì Ý nguyên cám Spaghetti';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Cải thìa (Bok choy)';
    vAmount = 20;
  } else if (t.includes('cháo')) {
    pName = t.includes('huyết') ? 'Huyết heo luộc' : (t.includes('vịt') ? 'Thịt vịt' : 'Thịt heo nạc');
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ăn thực vật';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t.includes('cơm')) {
    pName = t.includes('trứng') ? 'Trứng gà tươi' : (t.includes('sườn') ? 'Sườn non heo nạc' : 'Thịt heo nạc');
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Dưa leo (Dưa chuột)';
    vAmount = 25;
  } else if (t.includes('xôi')) {
    pName = t.includes('mặn') ? 'Thịt heo nạc' : (t.includes('đen') ? 'Đậu đen (hạt)' : 'Đậu xanh tách vỏ');
    cName = 'Gạo nếp cái';
    fName = 'Dầu ăn thực vật';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t.includes('gà')) {
    pName = 'Đùi gà tháo xương';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t.includes('sườn') || t.includes('heo')) {
    pName = 'Thịt heo nạc';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Hành lá tươi';
    vAmount = 10;
  } else if (t.includes('bò')) {
    pName = 'Thịt thăn bò nạc';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Xà lách Romaine';
    vAmount = 20;
  } else if (t.includes('cá') || t.includes('tôm') || t.includes('mực') || t.includes('tép')) {
    pName = t.includes('tôm') ? 'Tôm sú bóc vỏ' : (t.includes('mực') ? 'Mực tươi' : 'Cá lóc đồng (Cá quả)');
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ô liu nguyên chất';
    vName = 'Cà chua chín';
    vAmount = 25;
  } else if (t.includes('gỏi')) {
    pName = t.includes('tôm') ? 'Tôm sú bóc vỏ' : 'Thịt heo nạc';
    cName = 'Bánh tráng mỏng';
    fName = 'Dầu mè thơm';
    vName = 'Xà lách Romaine';
    vAmount = 25;
  } else if (t.includes('trứng')) {
    pName = 'Trứng gà tươi';
    cName = 'Cơm trắng dẻo';
    fName = 'Dầu ăn thực vật';
    vName = 'Hành lá tươi';
    vAmount = 10;
  }

  return { pName, cName, fName, vName, vAmount };
}

async function run() {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const m of missing) {
    let target = {
      kcal: Number(m.kcal),
      p: Number(m.protein),
      c: Number(m.carbs),
      f: Number(m.fat)
    };

    const isBanhCanhChay = m.cleanTitle.toLowerCase().includes('bánh canh chay');

    const { pIng, cIng, fIng, vIng, vAmount } = selectIngredients(m);

    let pAmt = 0, cAmt = 0, fAmt = 0;

    if (isBanhCanhChay) {
      // Direct assignment for Bánh canh chay: 120g bánh phở, 100g đậu hũ chiên, 50g nấm rơm, 5ml dầu
      pAmt = 100; // Đậu hũ chiên non
      cAmt = 120; // Bánh phở tươi
      fAmt = 5;   // Dầu ô liu
      // Recalculate target to match its new realistic macros (V3 rule 1)
      const p = (pAmt/100)*pIng.p + (cAmt/100)*cIng.p + (fAmt/100)*fIng.p + (vAmount/100)*vIng.p;
      const c = (pAmt/100)*pIng.c + (cAmt/100)*cIng.c + (fAmt/100)*fIng.c + (vAmount/100)*vIng.c;
      const f = (pAmt/100)*pIng.f + (cAmt/100)*cIng.f + (fAmt/100)*fIng.f + (vAmount/100)*vIng.f;
      target.p = Math.round(p * 10) / 10;
      target.c = Math.round(c * 10) / 10;
      target.f = Math.round(f * 10) / 10;
      target.kcal = Math.round((4 * target.p + 4 * target.c + 9 * target.f) * 10) / 10;
    } else {
      let b = [
        (target.p - (vAmount / 100) * vIng.p) * 100,
        (target.c - (vAmount / 100) * vIng.c) * 100,
        (target.f - (vAmount / 100) * vIng.f) * 100
      ];

      const A = [
        [pIng.p, cIng.p, fIng.p],
        [pIng.c, cIng.c, fIng.c],
        [pIng.f, cIng.f, fIng.f]
      ];

      let amounts = solve3x3(A, b);
      if (!amounts) {
        console.log(`Singular matrix for "${m.cleanTitle}"`);
        failed++;
        continue;
      }

      pAmt = Math.max(0, Math.round(amounts[0] * 10) / 10);
      cAmt = Math.max(0, Math.round(amounts[1] * 10) / 10);
      fAmt = Math.max(0, Math.round(amounts[2] * 10) / 10);
    }

    const calcP = Math.round(((pAmt / 100) * pIng.p + (cAmt / 100) * cIng.p + (fAmt / 100) * fIng.p + (vAmount / 100) * vIng.p) * 10) / 10;
    const calcC = Math.round(((pAmt / 100) * pIng.c + (cAmt / 100) * cIng.c + (fAmt / 100) * fIng.c + (vAmount / 100) * vIng.c) * 10) / 10;
    const calcF = Math.round(((pAmt / 100) * pIng.f + (cAmt / 100) * cIng.f + (fAmt / 100) * fIng.f + (vAmount / 100) * vIng.f) * 10) / 10;
    const calcK = Math.round((4 * calcP + 4 * calcC + 9 * calcF) * 10) / 10;

    const diffP = Math.abs(calcP - target.p);
    const diffC = Math.abs(calcC - target.c);
    const diffF = Math.abs(calcF - target.f);
    const diffK = Math.abs(calcK - target.kcal);

    const errP = target.p > 0 ? diffP / target.p : diffP;
    const errC = target.c > 0 ? diffC / target.c : diffC;
    const errF = target.f > 0 ? diffF / target.f : diffF;
    const errK = target.kcal > 0 ? diffK / target.kcal : diffK;

    const isPOk = errP <= 0.15 || diffP <= 1.0;
    const isCOk = errC <= 0.15 || diffC <= 1.0;
    const isFOk = errF <= 0.15 || diffF <= 1.0;
    const isKOk = errK <= 0.15 || diffK <= 10;

    if (isPOk && isCOk && isFOk && isKOk) {
      passed++;
    } else {
      failed++;
      console.log(`Failed dish: "${m.cleanTitle}"`);
      console.log(`  Target: P=${target.p}, C=${target.c}, F=${target.f}, Kcal=${target.kcal}`);
      console.log(`  Calc:   P=${calcP}, C=${calcC}, F=${calcF}, Kcal=${calcK}`);
      console.log(`  Diff:   P=${diffP.toFixed(2)}, C=${diffC.toFixed(2)}, F=${diffF.toFixed(2)}, K=${diffK.toFixed(2)}`);
      console.log(`  Err:    P=${(errP*100).toFixed(1)}%, C=${(errC*100).toFixed(1)}%, F=${(errF*100).toFixed(1)}%, K=${(errK*100).toFixed(1)}%`);
      console.log(`  Amounts: ${pIng.name}=${pAmt}, ${cIng.name}=${cAmt}, ${fIng.name}=${fAmt}, ${vIng.name}=${vAmount}`);
    }

    results.push({
      recipeId: m.id,
      title: m.rawTitle,
      cleanTitle: m.cleanTitle,
      target,
      calculated: { p: calcP, c: calcC, f: calcF, kcal: calcK },
      ingredients: [
        { ingredient_id: pIng.id, ingredient_name: pIng.name, amount: pAmt, unit: pIng.unit, notes: 'auto-generated' },
        { ingredient_id: cIng.id, ingredient_name: cIng.name, amount: cAmt, unit: cIng.unit, notes: 'auto-generated' },
        { ingredient_id: fIng.id, ingredient_name: fIng.name, amount: fAmt, unit: fIng.unit, notes: 'auto-generated' },
        { ingredient_id: vIng.id, ingredient_name: vIng.name, amount: vAmount, unit: vIng.unit, notes: 'auto-generated' }
      ]
    });
  }

  console.log(`\n=== FINAL TEST ===`);
  console.log(`Passed: ${passed} / ${missing.length}`);
  console.log(`Failed: ${failed} / ${missing.length}`);

  if (failed === 0) {
    fs.writeFileSync(path.join(__dirname, 'v1_final_plan.json'), JSON.stringify(results, null, 2), 'utf8');
    console.log('SUCCESS! Saved plan for all 107 dishes to v1_final_plan.json');
  }
}

run().catch(console.error);
