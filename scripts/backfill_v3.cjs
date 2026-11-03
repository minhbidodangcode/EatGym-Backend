// backfill_v2.cjs — Sửa 3 vấn đề dữ liệu (idempotent)
// V1: 107 món thiếu recipe_ingredients → sinh nguyên liệu khớp macro qua giải hệ 4x4
// V2: 8 món fat_g=0 → gán fat theo loại thực phẩm, kcal = 4P+4C+9F
// V3: 64 món lệch macro >30% → kcal = 4P+4C+9F
// Chạy: node scripts/backfill_v3.cjs [--dry-run]
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { solveAmounts, macroPerGram } = require('../src/nutrition/macro-solver.cjs');

const DRY = process.argv.includes('--dry-run');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const url = env.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL=')).slice(13).trim();
const pool = new Pool({ connectionString: url });

const ALL = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));
const NAMES = ALL.map(i => i.name);
const has = n => NAMES.includes(n);
const pick = (...cands) => cands.filter(has);

// ===== Ứng viên theo TÊN MÓN (chỉ dùng nguyên liệu có THẬT trong bảng) =====
function candidatesFor(title) {
  const t = title.toLowerCase();
  const c = new Set();

  if (/sườn/.test(t)) pick('Sườn heo', 'Thịt heo nạc').forEach(n => c.add(n));
  if (/thịt heo|heo xào|heo quay|heo kho|heo phá|giò heo|kho tiêu|xào giá|xào đậu que/.test(t)) pick('Thịt heo nạc', 'Thịt heo xay').forEach(n => c.add(n));
  if (/thịt bò|bò kho|bò bía|bò viên|bò cuốn|gỏi khô bò/.test(t)) pick('Nạc vai bò Úc', 'Bắp bò hoa', 'Thịt bò xay').forEach(n => c.add(n));
  if (/gà|miến gà/.test(t)) pick('Thịt gà ta', 'Đùi gà tháo xương').forEach(n => c.add(n));
  if (/tôm|tép/.test(t)) pick('Tôm biển', 'Tôm đồng').forEach(n => c.add(n));
  if (/mực/.test(t)) pick('Mực ống').forEach(n => c.add(n));
  if (/cá|hú|bạc má|thác lác|cơm lăn/.test(t)) pick('Cá lóc', 'Cá điêu hồng', 'Cá ngừ ngâm nước').forEach(n => c.add(n));
  if (/cua/.test(t)) pick('Cua đồng').forEach(n => c.add(n));
  if (/vịt/.test(t)) pick('Thịt vịt').forEach(n => c.add(n));
  if (/cút/.test(t)) pick('Thịt cút').forEach(n => c.add(n));
  if (/trứng/.test(t)) pick('Trứng gà').forEach(n => c.add(n));
  if (/chả cá/.test(t)) pick('Thịt cá thác lác').forEach(n => c.add(n));
  if (/lòng|xíu mại|chay/.test(t)) pick('Thịt heo xay', 'Trứng gà').forEach(n => c.add(n));
  if (/đậu hủ|đậu hũ|chao|tàu hủ|tahu/.test(t)) pick('Đậu hũ trắng mềm', 'Đậu hũ chiên', 'Đậu hũ non').forEach(n => c.add(n));

  if (/xôi|nếp/.test(t)) pick('Gạo nếp').forEach(n => c.add(n));
  if (/cơm tấm|cơm chiên|cơm trắng/.test(t)) pick('Cơm trắng dẻo').forEach(n => c.add(n));
  if (/cháo|porridge/.test(t)) pick('Gạo tẻ trắng').forEach(n => c.add(n));
  if (/phở/.test(t)) pick('Bánh phở').forEach(n => c.add(n));
  if (/bún/.test(t)) pick('Bún').forEach(n => c.add(n));
  if (/mì|miến|hủ tíu|hủ tiếu/.test(t)) pick('Mì ăn liền', 'Miến dong', 'Bánh phở').forEach(n => c.add(n));
  if (/bánh canh/.test(t)) pick('Bánh canh').forEach(n => c.add(n));
  if (/bánh hỏi/.test(t)) pick('Bánh hỏi').forEach(n => c.add(n));
  if (/nui/.test(t)) pick('Mì trứng', 'Bánh phở').forEach(n => c.add(n));
  if (/gỏi bì|giò cháo|chả giò|bánh cuốn/.test(t)) pick('Bánh tráng', 'Bánh phở').forEach(n => c.add(n));
  if (/hoành thánh|bánh/.test(t)) pick('Vỏ hoành thánh', 'Bánh tráng').forEach(n => c.add(n));
  if (/bột chiên|xôi bắp/.test(t)) pick('Bột mì đa dụng').forEach(n => c.add(n));
  if (/khoai|bí/.test(t)) pick('Khoai lang').forEach(n => c.add(n));
  if (/bắp/.test(t)) pick('Bắp ngọt').forEach(n => c.add(n));
  if (/mì căn/.test(t)) pick('Mì căn').forEach(n => c.add(n));

  pick('Cà chua', 'Hành lá', 'Hành tây', 'Bắp cải', 'Rau muống', 'Rau dền', 'Cải ngọt', 'Cà rốt', 'Bông cải', 'Nấm rơm', 'Nấm đông cô', 'Giá đỗ').forEach(n => c.add(n));
  pick('Dầu ăn', 'Dầu ô liu', 'Nước mắm', 'Gừng', 'Tỏi', 'Sả', 'Ớt').forEach(n => c.add(n));

  const DEFAULTS = ['Dầu ăn', 'Cà chua', 'Hành lá', 'Rau muống'];
  for (const n of DEFAULTS) if (has(n)) c.add(n);

  return [...c].slice(0, 11);
}

function nutrientOf(name) { return ALL.find(i => i.name === name); }

function totalOf(ings) {
  let t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const i of ings) {
    const ing = nutrientOf(i.ingredient_name);
    if (!ing) return null;
    const m = macroPerGram(ing);
    const g = i.unit === 'ml' ? i.amount * 0.91 : i.amount;
    t.kcal += m.kcal * g; t.p += m.p * g; t.c += m.c * g; t.f += m.f * g;
  }
  return t;
}

function bestCombinations(recipe) {
  const target = { kcal: recipe.kcal, p: recipe.p, c: recipe.c, f: recipe.f };
  const cands = candidatesFor(recipe.title);
  let best = null;
  for (let i = 0; i < cands.length; i++)
    for (let j = i + 1; j < cands.length; j++)
      for (let k = j + 1; k < cands.length; k++)
        for (let l = k + 1; l < cands.length; l++) {
          const set = [cands[i], cands[j], cands[k], cands[l]].map(nutrientOf).filter(Boolean);
          if (set.length < 3) continue;
          const sol = solveAmounts(set, target, { maxGram: 600 });
          if (sol && (!best || sol.err < best.err)) {
            best = {
              err: sol.err,
              ings: sol.cb.map((idx, gi) => ({
                ingredient_name: set[idx].name,
                amount: Math.max(1, Math.round(sol.grams[gi])),
                unit: 'g',
                notes: 'auto-generated',
              })),
            };
          }
        }
  return best;
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
  let ok15 = 0;
  const fails = [];
  for (const r of missing) {
    const recipe = { title: r.title, kcal: Number(r.kcal), p: Number(r.p), c: Number(r.c), f: Number(r.f) };
    const best = bestCombinations(recipe);
    if (!best) { fails.push({ t: r.title, why: 'no-solution' }); continue; }
    const t = totalOf(best.ings);
    const dev = Math.abs(t.kcal - recipe.kcal) / Math.max(recipe.kcal, 1);
    if (dev <= 0.15) ok15++;
    else fails.push({ t: r.title, dev: (dev * 100).toFixed(0) + '%', calc: Math.round(t.kcal), tgt: recipe.kcal });
    if (!DRY) {
      for (const i of best.ings) {
        await pool.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_name, amount, unit, notes)
           SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id=$1 AND ingredient_name=$2)`,
          [r.id, i.ingredient_name, i.amount, i.unit, i.notes]);
      }
    }
  }
  console.log(`V1: ${ok15}/${missing.length} khop <=15% kcal; fails: ${fails.length}`);
  fails.slice(0, 12).forEach(f => console.log('   X', f.t.slice(0, 44), f.dev || f.why, f.calc ? `calc ${f.calc} vs ${f.tgt}` : ''));

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
