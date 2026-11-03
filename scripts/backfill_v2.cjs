// backfill_v2.cjs — Sửa 3 vấn đề dữ liệu (chạy 1 lần, idempotent, verify sau đó)
// V1: 107 món thiếu recipe_ingredients → sinh nguyên liệu theo TÊN MÓN + tối ưu amount khớp macro (≤15% kcal)
// V2: 8 món fat_g=0 → gán fat theo loại thực phẩm, kcal = 4P+4C+9F
// V3: 64 món lệch macro >30% → kcal = 4P+4C+9F (giữ P/C/F)
// Chạy: node scripts/backfill_v2.cjs [--dry-run]
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DRY = process.argv.includes('--dry-run');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const url = env.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL=')).slice(13).trim();
const pool = new Pool({ connectionString: url });

const ALL = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));
const NUTR = new Map(ALL.map(i => [i.name.toLowerCase(), i]));

// ---------- helpers ----------
function nutrient(name, amount, unit) {
  const ing = NUTR.get(name.toLowerCase());
  if (!ing) return null;
  let g = amount;
  if (unit === 'ml') g = amount; // dầu roughly 1ml ≈ 0.91g — quy về ≈amount (sai số nhỏ, oil ~9 kcal/ml)
  else if (unit && unit !== 'g' && unit !== 'ml') g = amount * 10; // tép/cây..→ ước lượng 10g
  const f = g / 100;
  const kcalFactor = unit === 'ml' ? 0.91 : 1;
  return {
    kcal: Number(ing.kcal_per_100g) * f * kcalFactor,
    p: Number(ing.protein_g) * f,
    c: Number(ing.carbs_g) * f,
    f: Number(ing.fat_g) * f * (unit === 'ml' ? 1.09 : 1),
  };
}

function totalOf(ings) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const i of ings) {
    const n = nutrient(i.ingredient_name, i.amount, i.unit);
    if (!n) return null;
    t.kcal += n.kcal; t.p += n.p; t.c += n.c; t.f += n.f;
  }
  return t;
}

function score(cur, target) {
  return Math.abs(cur.kcal - target.kcal) / Math.max(target.kcal, 1)
    + Math.abs(cur.p - target.p) / Math.max(target.p, 0.5)
    + Math.abs(cur.c - target.c) / Math.max(target.c, 0.5)
    + Math.abs(cur.f - target.f) / Math.max(target.f, 0.5);
}

// Scale toàn bộ theo kcal rồi coordinate descent để khớp target macro
function optimize(ings, target) {
  let state = ings.map(i => ({ ...i }));
  // Bước 0: scale tổng kcal về đúng target
  const t0 = totalOf(state);
  if (t0 && t0.kcal > 0) {
    const k = target.kcal / t0.kcal;
    state = state.map(i => ({ ...i, amount: Math.max(1, Math.round(i.amount * k)) }));
  }
  const best = ing => score(totalOf(ing), target);
  let bestScore = best(state);
  const steps = [1, 2, 3, 5, 8, 12, 16, 20, 30, 40, 60, 90];
  for (let iter = 0; iter < 60; iter++) {
    let improved = false;
    for (let k = 0; k < state.length; k++) {
      for (const d of steps) {
        for (const dir of [1, -1]) {
          const cand = state.map(i => ({ ...i }));
          cand[k].amount = state[k].amount + dir * d;
          if (cand[k].amount < 1 || cand[k].amount > 800) continue;
          const s = best(cand);
          if (s < bestScore - 1e-6) { bestScore = s; state = cand; improved = true; }
        }
      }
    }
    if (!improved) break;
  }
  return { state, bestScore };
}

// ---------- candidate ingredient pickers (theo TÊN MÓN) ----------
const TITLE_RULES = [
  [/canh|soup|súp|nấu|lẩu/i, ['Cà chua chín', 'Bắp cải trắng', 'Hành lá tươi', 'Rau muống']],
  [/cháo|porridge/i, ['Gạo tẻ trắng', 'Thịt heo nạc', 'Hành lá tươi']],
  [/cơm|rice/i, ['Gạo tẻ trắng', 'Cà rốt tươi']],
  [/phở|noodle|bún|mì|hủ tiếu/i, ['Bánh phở tươi', 'Bún tươi', 'Mì ăn liền']],
  [/gà|chicken/i, ['Thịt gà phi lê', 'Ức gà không da']],
  [/bò|beef|thăn/i, ['Thịt bò nạc', 'Thịt bò xay']],
  [/heo|lợn|pork/i, ['Thịt heo nạc', 'Thịt heo xay']],
  [/cá hồi|salmon/i, ['Cá hồi tươi']],
  [/cá|fish/i, ['Cá ngừ ngâm nước', 'Cá trắng']],
  [/tôm|shrimp/i, ['Tôm sú tươi']],
  [/trứng|egg/i, ['Trứng gà']],
  [/rau củ|salad|xào|stir/i, ['Cà rốt tươi', 'Ớt chuông đỏ']],
  [/gạo lứt|brown rice/i, ['Gạo lứt']],
  [/yến mạch|oats/i, ['Yến mạch cán dẹt']],
  [/đậu|h tofu|tofu/i, ['Đậu hũ trắng mềm', 'Đậu xanh']],
  [/sữa|yogurt|milk/i, ['Sữa tươi không đường', 'Sữa chua không đường']],
  [/sinh tố|smoothie/i, ['Chuối chín', 'Sữa tươi không đường']],
  [/bánh|cake|cookie/i, ['Bột mì đa dụng', 'Trứng gà']],
  [/khoai|potato/i, ['Khoai lang mật hấp', 'Khoai tây']],
];
const BASE_VEG = ['Bắp cải trắng', 'Cà rốt tươi', 'Hành lá tươi', 'Ớt chuông đỏ', 'Rau cải'];
const OIL = 'Dầu ô liu nguyên chất';
const CARB = ['Gạo tẻ trắng', 'Bánh mì trắng', 'Khoai lang mật hấp'];
const STAPLE = ['Cơm trắng dẻo', 'Gạo tẻ trắng'];

function pickCandidates(title) {
  const t = title.toLowerCase();
  const picks = new Set();
  for (const [re, names] of TITLE_RULES) if (re.test(t)) for (const n of names) if (NUTR.has(n.toLowerCase())) picks.add(n);
  if (picks.size < 3) for (const n of BASE_VEG) if (NUTR.has(n.toLowerCase())) picks.add(n);
  for (const n of [...CARB, ...STAPLE]) if (NUTR.has(n.toLowerCase())) picks.add(n);
  if (NUTR.has(OIL.toLowerCase())) picks.add(OIL);
  return [...picks].slice(0, 6);
}

function synthIngredients(recipe) {
  const cands = pickCandidates(recipe.cleanTitle || recipe.title);
  // start amounts: main 80g, carb 60g, veg 50g, oil 5ml
  let ings = cands.slice(0, 4).map((name, idx) => {
    let amount = idx === 0 ? 80 : idx === 1 ? 60 : idx === 2 ? 40 : 5;
    const unit = name.toLowerCase().includes('dầu') || name.toLowerCase().includes('sữa tươi') ? 'ml' : 'g';
    if (unit === 'ml') amount = Math.min(amount, 15);
    return { ingredient_name: name, amount, unit, notes: 'auto-generated' };
  });
  const target = { kcal: recipe.kcal, p: recipe.protein, c: recipe.carbs, f: recipe.fat };
  const { state, bestScore } = optimize(ings, target);
  return { ings: state, dev: bestScore };
}

// ---------- main ----------
(async () => {
  const q = async (s, a) => (await pool.query(s, a)).rows;

  console.log('=== STATE TRƯỚC ===');
  console.log('missing ingredients:', (await q(`select count(*)::int n from recipes r where not exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id)`))[0].n);
  console.log('fat<=0:', (await q(`select count(*)::int n from recipes where fat_g<=0`))[0].n);
  console.log('macro bad:', (await q(`select count(*)::int n from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.3*kcal`))[0].n);

  // ---- V1: 107 món thiếu nguyên liệu ----
  const missing = await q(`select id, title, kcal, protein_g p, carbs_g c, fat_g f from recipes r where not exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id)`);
  let v1Ok = 0, v1Fail = [];
  for (const r of missing) {
    const recipe = { cleanTitle: r.title, kcal: Number(r.kcal), protein: Number(r.p), carbs: Number(r.c), fat: Number(r.f) };
    const { ings, dev } = synthIngredients(recipe);
    const t = totalOf(ings);
    const kcalDev = Math.abs(t.kcal - recipe.kcal) / Math.max(recipe.kcal, 1);
    if (kcalDev <= 0.15) v1Ok++;
    else v1Fail.push({ title: r.title, kcalDev: (kcalDev * 100).toFixed(0) + '%', calc: Math.round(t.kcal), target: recipe.kcal });
    if (!DRY) {
      for (const i of ings) {
        await pool.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_name, amount, unit, notes)
           SELECT $1, $2, $3, $4, $5 WHERE NOT EXISTS (
             SELECT 1 FROM recipe_ingredients WHERE recipe_id=$1 AND ingredient_name=$2)`,
          [r.id, i.ingredient_name, i.amount, i.unit, i.notes]);
      }
    }
  }
  console.log(`V1: ${v1Ok}/${missing.length} khớp ≤15% kcal, fail: ${v1Fail.length}`);
  v1Fail.slice(0, 10).forEach(f => console.log('   X', f.title.slice(0, 45), f.kcalDev, `(calc ${f.calc} vs ${f.target})`));

  // ---- V2: fat<=0 ----
  const fatRows = await q(`select id, title, protein_g p, carbs_g c, fat_g f, kcal from recipes where fat_g<=0`);
  const FAT_DEFAULT = [
    { re: /tôm|shrimp/i, g: 1.5 },
    { re: /huyết|blood/i, g: 0.5 },
    { re: /lòng trắng|egg white/i, g: 0.2 },
    { re: /gân|gristle|sụn/i, g: 6 },
    { re: /hải sâm|hải sản/i, g: 1 },
    { re: /.*/i, g: 3 },
  ];
  console.log('V2: fat<=0:', fatRows.length);
  for (const r of fatRows) {
    const rule = FAT_DEFAULT.find(x => x.re.test(r.title));
    const fat = rule.g;
    const kcal = Math.round((4 * Number(r.p) + 4 * Number(r.c) + 9 * fat) * 10) / 10;
    console.log(`   ${r.title.slice(0, 45)} | fat ${r.f} -> ${fat}g | kcal ${r.kcal} -> ${kcal}`);
    if (!DRY) await pool.query(`UPDATE recipes SET fat_g=$1, kcal=$2, updated_at=NOW() WHERE id=$3`, [fat, kcal, r.id]);
  }

  // ---- V3: macro lệch >30% ----
  const bad = await q(`select id, title, kcal, protein_g p, carbs_g c, fat_g f from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.3*kcal`);
  console.log('V3: macro-bad:', bad.length);
  let v3Fixed = 0;
  for (const r of bad) {
    const kcal = Math.round((4 * Number(r.p) + 4 * Number(r.c) + 9 * Number(r.f)) * 10) / 10;
    if (Math.abs(kcal - Number(r.kcal)) < 0.05) continue; // đã ổn
    v3Fixed++;
    if (!DRY) await pool.query(`UPDATE recipes SET kcal=$1, updated_at=NOW() WHERE id=$2`, [kcal, r.id]);
  }
  console.log(`V3: cập nhật kcal cho ${v3Fixed} món (giữ nguyên P/C/F, kcal = 4P+4C+9F)`);

  // ---- VERIFY ----
  if (!DRY) {
    console.log('\n=== VERIFY SAU ===');
    console.log('missing ingredients:', (await q(`select count(*)::int n from recipes r where not exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id)`))[0].n);
    console.log('fat<=0:', (await q(`select count(*)::int n from recipes where fat_g<=0`))[0].n);
    console.log('macro bad:', (await q(`select count(*)::int n from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.3*kcal`))[0].n);
    console.log('recipes total:', (await q(`select count(*)::int n from recipes`))[0].n);
  }

  await pool.end();
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
