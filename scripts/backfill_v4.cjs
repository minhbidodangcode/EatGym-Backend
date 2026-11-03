// backfill_v4.cjs — Sửa 3 vấn đề dữ liệu (idempotent, dùng solver coordinate descent)
// V1: 107 món thiếu recipe_ingredients → sinh nguyên liệu khớp macro
// V2: 8 món fat_g=0 → gán fat theo loại thực phẩm, kcal = 4P+4C+9F
// V3: 64 món lệch macro >30% → kcal = 4P+4C+9F
// Chạy: node scripts/backfill_v4.cjs [--dry-run]
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { solveAmounts, macroPerGram } = require('../src/nutrition/macro-solver2.cjs');

const DRY = process.argv.includes('--dry-run');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const url = env.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL=')).slice(13).trim();
const pool = new Pool({ connectionString: url });

const ALL = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));
const NAMES = new Set(ALL.map(i => i.name));
const has = n => NAMES.has(n);
const pick = (...cands) => cands.filter(has);

// ===== Ứng viên theo TÊN MÓN — CHỈ dùng tên có thật trong bảng ingredients =====
function candidatesFor(title) {
  const t = title.toLowerCase();
  const c = new Set();

  // Đạm
  if (/sườn|suon/.test(t)) pick('Sườn heo bỏ xương', 'Sườn non heo nạc', 'Thịt heo nạc').forEach(n => c.add(n));
  if (/thịt heo|heo xào|heo quay|heo kho|heo phá|giò heo|kho tiêu|xào giá|xào đậu que|thịt heo băm/.test(t)) pick('Thịt heo nạc', 'Thịt heo nạc băm', 'Nạc vai heo').forEach(n => c.add(n));
  if (/bò|bo bía|bò viên|bò cuốn|gỏi khô bò|bò kho/.test(t)) pick('Thịt bò', 'Thịt thăn bò nạc', 'Nạc vai bò Úc', 'Bắp bò hoa').forEach(n => c.add(n));
  if (/gà|miến gà|phở gà/.test(t)) pick('Thịt gà ta', 'Đùi gà tháo xương', 'Ức gà không da').forEach(n => c.add(n));
  if (/tôm|tép/.test(t)) pick('Tôm biển', 'Tôm đồng', 'Tôm thẻ tươi', 'Tép gạo').forEach(n => c.add(n));
  if (/mực/.test(t)) pick('Mực ống tươi', 'Mực tươi').forEach(n => c.add(n));
  if (/cá|hú|bạc má|thác lác|lăn bột/.test(t)) pick('Cá lóc', 'Cá điêu hồng', 'Cá nạc', 'Cá ngừ ngâm nước').forEach(n => c.add(n));
  if (/cua/.test(t)) pick('Cua đồng', 'Cua biển').forEach(n => c.add(n));
  if (/vịt/.test(t)) pick('Thịt vịt').forEach(n => c.add(n));
  if (/cút/.test(t)) pick('Trứng cút').forEach(n => c.add(n));
  if (/trứng/.test(t)) pick('Trứng gà').forEach(n => c.add(n));
  if (/chả cá|thác lác/.test(t)) pick('Chả lụa', 'Cá lóc').forEach(n => c.add(n));
  if (/lòng|cháo lòng|phá lấu|xíu mại/.test(t)) pick('Thịt heo nạc băm', 'Lòngheo (ruột già)', 'Trứng gà').forEach(n => c.add(n));
  if (/đậu hủ|đậu hũ|chao|tàu hủ|tahu|đậu phụ/.test(t)) pick('Đậu hũ trắng mềm', 'Đậu hũ chiên', 'Đậu phụ').forEach(n => c.add(n));
  if (/mắm/.test(t)) pick('Mắm tôm đặc', 'Cá lóc').forEach(n => c.add(n));
  if (/chim/.test(t)) pick('Trứng cút', 'Thịt gà ta').forEach(n => c.add(n));

  // Tinh bột
  if (/xôi|nếp/.test(t)) pick('Gạo nếp cái').forEach(n => c.add(n));
  if (/cơm tấm|cơm chiên|cơm trắng/.test(t)) pick('Cơm trắng dẻo', 'Cơm trắng').forEach(n => c.add(n));
  if (/cháo/.test(t)) pick('Gạo tẻ trắng', 'Gạo tẻ').forEach(n => c.add(n));
  if (/phở/.test(t)) pick('Bánh phở', 'Bánh phở tươi').forEach(n => c.add(n));
  if (/bún/.test(t)) pick('Bún', 'Bún tươi').forEach(n => c.add(n));
  if (/mì|miến|hủ tíu|hủ tiếu/.test(t)) pick('Miến dong', 'Mì Ý Spaghetti (khô)', 'Bánh phở').forEach(n => c.add(n));
  if (/bánh canh/.test(t)) pick('Bún', 'Bánh phở').forEach(n => c.add(n));
  if (/bánh hỏi/.test(t)) pick('Bún', 'Bánh phở').forEach(n => c.add(n));
  if (/nui/.test(t)) pick('Mì Ý Spaghetti (khô)').forEach(n => c.add(n));
  if (/gỏi bì|giò cháo|chả giò|bánh cuốn|bánh bao/.test(t)) pick('Bánh tráng mỏng', 'Bánh phở').forEach(n => c.add(n));
  if (/hoành thánh|há cảo/.test(t)) pick('Bánh tráng mỏng', 'Thịt heo nạc băm').forEach(n => c.add(n));
  if (/bột chiên/.test(t)) pick('Bột sắn dây', 'Bánh phở').forEach(n => c.add(n));
  if (/khoai/.test(t)) pick('Khoai lang', 'Khoai môn', 'Khoai tây').forEach(n => c.add(n));
  if (/bắp/.test(t)) pick('Bắp ngọt tách hạt', 'Bắp tươi').forEach(n => c.add(n));
  if (/mì căn/.test(t)) pick('Mì Ý Spaghetti (khô)', 'Đậu hũ trắng mềm').forEach(n => c.add(n));
  if (/măng/.test(t)) pick('Măng tây', 'Măng tây tươi').forEach(n => c.add(n));
  if (/mít/.test(t)) pick('Dứa tươi (Thơm)').forEach(n => c.add(n));
  if (/bầu|bí đao|bí rợ|bí xanh/.test(t)) pick('Bí đao (Bí xanh)', 'Bí đỏ (Bí ngô)').forEach(n => c.add(n));
  if (/mướp|khổ qua/.test(t)) pick('Mướp đắng (Khổ qua)', 'Dưa leo').forEach(n => c.add(n));
  if (/hẹ/.test(t)) pick('Hành lá tươi').forEach(n => c.add(n));
  if (/ngó sen/.test(t)) pick('Ngó sen tươi').forEach(n => c.add(n));
  if (/dền/.test(t)) pick('Rau dền đỏ').forEach(n => c.add(n));
  if (/mồng tơi/.test(t)) pick('Rau mồng tơi').forEach(n => c.add(n));
  if (/rau dền|rau ngót/.test(t)) pick('Rau dền đỏ', 'Rau ngót').forEach(n => c.add(n));

  // Rau & gia vị mặc định
  pick('Cà chua chín', 'Hành lá tươi', 'Hành tây', 'Bắp cải trắng', 'Rau muống', 'Cải ngọt', 'Cà rốt tươi', 'Bông cải xanh (Broccoli)', 'Nấm rơm tươi', 'Nấm đông cô tươi', 'Giá đỗ xanh').forEach(n => c.add(n));
  pick('Dầu ăn thực vật', 'Dầu ô liu nguyên chất', 'Nước mắm', 'Gừng tươi', 'Tỏi băm', 'Sả băm', 'Ớt tươi').forEach(n => c.add(n));
  // Rau ít kcal cho món canh/nước
  pick('Cải thìa (Bok choy)', 'Cải bó xôi (Rau chân vịt)', 'Rau ngót', 'Rau dền đỏ', 'Rau mồng tơi', 'Dưa leo', 'Dưa leo (Dưa chuột)', 'Mướp đắng (Khổ qua)', 'Bí đao (Bí xanh)', 'Bí đỏ (Bí ngô)', 'Cà chua bi', 'Nấm kim châm', 'Măng tây tươi', 'Đậu bắp', 'Đậu cove tươi', 'Cần tây', 'Súp lơ trắng', 'Ngò gai (Mùi tàu)', 'Hoa chuối thái mỏng', 'Xà lách Romaine').forEach(n => c.add(n));

  const DEFAULTS = ['Dầu ăn thực vật', 'Cà chua chín', 'Hành lá tươi', 'Rau muống'];
  for (const n of DEFAULTS) if (has(n)) c.add(n);

  return [...c].slice(0, 20);
}

function nutrientOf(name) { return ALL.find(i => i.name === name); }

// Giới hạn lượng thực tế theo loại nguyên liệu (tránh "nước mắm 200g" / "cải 300g")
function capFor(name) {
  const n = name.toLowerCase();
  if (/nước mắm|muối|tiêu|gừng|tỏi|sả|ớt|nước tương|xì dầu|giấm|dầu hào|ngò gai|hành lá/.test(n)) return 15;
  if (/dầu ăn|dầu ô liu|dầu mè|bơ lạt|bơ đậu/.test(n)) return 40;
  if (/mắm/.test(n)) return 25;
  if (/trứng/.test(n)) return 120;
  if (/cà chua|rau|cải|bắp cải|dưa leo|bí đao|bí đỏ|mướp|mướp đắng|đậu cove|đậu bắp|cần tây|măng|nấm|giá đỗ|ngó sen|hoa chuối|xà lách|súp lơ|hành tây|cà rốt/.test(n)) return 200;
  if (/sữa|nước cốt/.test(n)) return 300;
  if (/bún|mì|phở|hủ tiếu|bánh tráng|miến/.test(n)) return 300;
  if (/gạo|cơm|nếp|bánh/.test(n)) return 350;
  return 300;
}

function totalOf(ings) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const i of ings) {
    const ing = nutrientOf(i.ingredient_name);
    if (!ing) return null;
    const m = macroPerGram(ing);
    t.kcal += m.kcal * i.amount; t.p += m.p * i.amount; t.c += m.c * i.amount; t.f += m.f * i.amount;
  }
  return t;
}

function bestCombo(recipe) {
  const target = { kcal: recipe.kcal, p: recipe.p, c: recipe.c, f: recipe.f };
  const cands = candidatesFor(recipe.title);
  const ings = cands.map(nutrientOf).filter(Boolean);
  if (ings.length < 3) return null;

  const caps = ings.map(i => capFor(i.name));
  const sol = solveAmounts(ings, target, { gramsCap: 600, minGram: 0, caps });
  if (!sol) return null;

  // Giữ các nguyên liệu có lượng đáng kể, sắp theo độ lớn
  let used = ings
    .map((ing, i) => ({ ing, g: sol.grams[i], cap: capFor(ing.name) }))
    .filter(x => x.g >= 1)
    .sort((a, b) => b.g - a.g)
    .slice(0, 6);
  if (used.length < 3) return null;

  // Chuẩn hoá theo kcal: scale tỉ lệ để tổng kcal tiệm cận target (nếu hệ số hợp lý)
  const sumKcal = () => used.reduce((s, x) => s + (Number(x.ing.kcal_per_100g) / 100) * x.g, 0);
  const raw = sumKcal();
  if (raw > 0) {
    const k = target.kcal / raw;
    if (k >= 0.3 && k <= 3) {
      used = used.map(x => ({ ...x, g: Math.min(x.cap, Math.max(1, x.g * k)) }));
    }
  }

  const ings2 = used.map(x => ({
    ingredient_name: x.ing.name,
    amount: Math.max(1, Math.round(x.g)),
    unit: 'g',
    notes: 'auto-generated',
  }));

  // NGUỒN SỰ THẬT = nguyên liệu. Macro suy ra từ chính chúng.
  const t = totalOf(ings2);
  return {
    ings: ings2,
    kcalDev: Math.abs(t.kcal - target.kcal) / Math.max(target.kcal, 1),
    kcalActual: Math.round(t.kcal * 10) / 10,
    pActual: Math.round(t.p * 10) / 10,
    cActual: Math.round(t.c * 10) / 10,
    fActual: Math.round(t.f * 10) / 10,
  };
}

// ===== MAIN =====
(async () => {
  const q = async (s) => (await pool.query(s)).rows;

  console.log('=== TRUOC ===');
  console.log('missing:', (await q(`select count(*)::int n from recipes r where not exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id)`))[0].n);
  console.log('fat<=0:', (await q(`select count(*)::int n from recipes where fat_g<=0`))[0].n);
  console.log('macro-bad:', (await q(`select count(*)::int n from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.3*kcal`))[0].n);

  // ---- V1 ----
  const missing = await q(`select id, title, kcal, protein_g p, carbs_g c, fat_g f from recipes r where not exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id) order by kcal`);
  let ok15 = 0, ok25 = 0;
  const fails = [];
  for (const r of missing) {
    const recipe = { title: r.title, kcal: Number(r.kcal), p: Number(r.p), c: Number(r.c), f: Number(r.f) };
    const best = bestCombo(recipe);
    if (!best) { fails.push({ t: r.title, why: 'no-solution' }); continue; }
    if (best.kcalDev <= 0.15) ok15++;
    else if (best.kcalDev <= 0.25) ok25++;
    else fails.push({ t: r.title, dev: (best.kcalDev * 100).toFixed(0) + '%' });
    if (!DRY) {
      for (const i of best.ings) {
        await pool.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_name, amount, unit, notes)
           SELECT $1::uuid, $2::varchar, $3::numeric, $4::varchar, $5::varchar
           WHERE NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id=$1::uuid AND ingredient_name=$2::varchar)`,
          [r.id, i.ingredient_name, i.amount, i.unit, i.notes]);
      }
      // Ghi kcal/P/C/F = đúng tổng từ nguyên liệu → dữ liệu tự nhất quán 100%
      await pool.query(
        `UPDATE recipes SET kcal=$1, protein_g=$2, carbs_g=$3, fat_g=$4, updated_at=NOW() WHERE id=$5`,
        [best.kcalActual, best.pActual, best.cActual, best.fActual, r.id]);
    }
  }
  console.log(`V1: ${ok15}/${missing.length} lệch <=15% kcal; +${ok25} lệch 15-25%; fails: ${fails.length}`);
  fails.slice(0, 12).forEach(f => console.log('   X', f.t.slice(0, 44), f.dev || f.why));

  // ---- V2 ----
  const fatRows = await q(`select id, title, protein_g p, carbs_g c, fat_g f, kcal from recipes where fat_g<=0`);
  const FAT_RULES = [
    { re: /tôm/i, g: 1.2 }, { re: /huyết/i, g: 0.4 }, { re: /lòng trắng/i, g: 0.2 },
    { re: /gân/i, g: 6 }, { re: /hải sâm/i, g: 1 }, { re: /.*/, g: 3 },
  ];
  console.log('V2 fat=0:', fatRows.length);
  for (const r of fatRows) {
    const fat = FAT_RULES.find(x => x.re.test(r.title)).g;
    const kcal = Math.round((4 * Number(r.p) + 4 * Number(r.c) + 9 * fat) * 10) / 10;
    console.log(`   ${r.title.slice(0, 44)} fat ${r.f}->${fat} | kcal ${r.kcal}->${kcal}`);
    if (!DRY) await pool.query(`UPDATE recipes SET fat_g=$1, kcal=$2, updated_at=NOW() WHERE id=$3`, [fat, kcal, r.id]);
  }

  // ---- V3 ----
  const bad = await q(`select id, title, kcal, protein_g p, carbs_g c, fat_g f from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.3*kcal`);
  let fixed = 0;
  for (const r of bad) {
    const kcal = Math.round((4 * Number(r.p) + 4 * Number(r.c) + 9 * Number(r.f)) * 10) / 10;
    if (Math.abs(kcal - Number(r.kcal)) < 0.05) continue;
    fixed++;
    if (!DRY) await pool.query(`UPDATE recipes SET kcal=$1, updated_at=NOW() WHERE id=$2`, [kcal, r.id]);
  }
  console.log(`V3: cap nhat kcal ${fixed}/${bad.length} mon`);

  if (!DRY) {
    console.log('\n=== SAU ===');
    console.log('missing:', (await q(`select count(*)::int n from recipes r where not exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id)`))[0].n);
    console.log('fat<=0:', (await q(`select count(*)::int n from recipes where fat_g<=0`))[0].n);
    console.log('macro-bad:', (await q(`select count(*)::int n from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.3*kcal`))[0].n);
    console.log('total recipes:', (await q(`select count(*)::int n from recipes`))[0].n);
  }
  await pool.end();
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
