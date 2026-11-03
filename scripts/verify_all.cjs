// verify_all.cjs — Nghiệm thu độc lập sau khi sửa dữ liệu + re-derive tag
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const url = env.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL=')).slice(13).trim();
const pool = new Pool({ connectionString: url });

(async () => {
  const one = async (s) => (await pool.query(s)).rows[0];
  const all = async (s) => (await pool.query(s)).rows;

  console.log('===== A. TOÀN VẸN DỮ LIỆU =====');
  console.log('total recipes            :', (await one('select count(*)::int n from recipes')).n, '(phải = 4002)');
  console.log('missing recipe_ingredients:', (await one('select count(*)::int n from recipes r where not exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id)')).n, '(phải = 0)');
  console.log('fat_g <= 0               :', (await one('select count(*)::int n from recipes where fat_g<=0')).n, '(phải = 0)');
  console.log('macro lệch > 30%         :', (await one('select count(*)::int n from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.3*kcal')).n, '(phải = 0)');
  console.log('macro lệch > 15%         :', (await one('select count(*)::int n from recipes where abs(kcal-(4*protein_g+4*carbs_g+9*fat_g))>0.15*kcal')).n);
  console.log('kcal/protein/carbs <= 0  :', (await one('select count(*)::int n from recipes where kcal<=0 or protein_g<=0 or carbs_g<=0')).n);
  console.log('recipe_ingredients total :', (await one('select count(*)::int n from recipe_ingredients')).n);
  console.log('ingredients auto-generated:', (await one("select count(*)::int n from recipe_ingredients where notes='auto-generated'")).n);

  console.log('\n===== B. TAG: SỐ LƯỢNG =====');
  const tags = await all('select tag_slug, count(*)::int n from recipe_tags group by 1 order by 2 desc');
  tags.forEach(t => console.log('  ' + t.tag_slug.padEnd(16), t.n));

  console.log('\n===== C. TAG: VI PHẠM RULE (tất cả phải = 0) =====');
  const checks = [
    ['duoi-15-phut mà time > 15', `select count(*)::int n from recipe_tags rt join recipes r on r.id=rt.recipe_id where rt.tag_slug='duoi-15-phut' and r.cooking_time_min>15`],
    ['tang-co mà protein < 25', `select count(*)::int n from recipe_tags rt join recipes r on r.id=rt.recipe_id where rt.tag_slug='tang-co' and r.protein_g<25`],
    ['giam-mo sai rule', `select count(*)::int n from recipe_tags rt join recipes r on r.id=rt.recipe_id where rt.tag_slug='giam-mo' and not (r.kcal<=460 and r.fat_g<=16 and r.protein_g>=10)`],
    ['it-calo mà kcal > 360', `select count(*)::int n from recipe_tags rt join recipes r on r.id=rt.recipe_id where rt.tag_slug='it-calo' and r.kcal>360`],
    ['high-protein mà P < 30', `select count(*)::int n from recipe_tags rt join recipes r on r.id=rt.recipe_id where rt.tag_slug='high-protein' and r.protein_g<30`],
    ['low-carb mà C > 20', `select count(*)::int n from recipe_tags rt join recipes r on r.id=rt.recipe_id where rt.tag_slug='low-carb' and r.carbs_g>20`],
  ];
  for (const [label, sql] of checks) {
    const n = (await one(sql)).n;
    console.log(`  ${label.padEnd(30)}: ${n} ${n === 0 ? 'OK' : '<<< VI PHẠM'}`);
  }

  console.log('\n===== D. TAG: BỎ SÓT (rule đúng nhưng thiếu tag) =====');
  const misses = [
    ['P>=25 thiếu tang-co', `select count(*)::int n from recipes r where r.protein_g>=25 and not exists(select 1 from recipe_tags rt where rt.recipe_id=r.id and rt.tag_slug='tang-co')`],
    ['time<=15 thiếu duoi-15-phut', `select count(*)::int n from recipes r where r.cooking_time_min<=15 and not exists(select 1 from recipe_tags rt where rt.recipe_id=r.id and rt.tag_slug='duoi-15-phut')`],
    ['kcal<=360 thiếu it-calo', `select count(*)::int n from recipes r where r.kcal<=360 and not exists(select 1 from recipe_tags rt where rt.recipe_id=r.id and rt.tag_slug='it-calo')`],
  ];
  for (const [label, sql] of misses) {
    const n = (await one(sql)).n;
    console.log(`  ${label.padEnd(32)}: ${n} ${n === 0 ? 'OK' : '<<< THIẾU'}`);
  }

  console.log('\n===== E. ĂN CHAY vs is_vegetarian =====');
  console.log('tag an-chay           :', (await one("select count(*)::int n from recipe_tags where tag_slug='an-chay'")).n);
  console.log('is_vegetarian = TRUE  :', (await one('select count(*)::int n from recipes where is_vegetarian')).n);
  console.log('lệch tag <-> cờ       :', (await one(`select count(*)::int n from recipes r where r.is_vegetarian <> exists(select 1 from recipe_tags rt where rt.recipe_id=r.id and rt.tag_slug='an-chay')`)).n, '(phải = 0)');
  console.log('món chay chứa thịt/cá :', (await one(`
    select count(*)::int n from recipe_tags rt where rt.tag_slug='an-chay' and exists(
      select 1 from recipe_ingredients ri where ri.recipe_id=rt.recipe_id and lower(ri.ingredient_name) ~*
      '(thịt bò|thịt heo|thịt lợn|thịt gà|ức gà|thịt vịt|thịt băm|thịt bằm|tôm|mực|cua|ghẹ|hải sâm|ba khía|xúc xích|giăm bông|bacon|pa-tê|pate|lạp xưởng|chả lụa|chả bò|nem chua|mắm tôm|bánh phồng tôm|trứng gà|trứng vịt|trứng cút)'
        and lower(ri.ingredient_name) not like '%nấm%'
        and lower(ri.ingredient_name) not like '%huyết rồng%')`)).n, '(phải = 0)');

  console.log('\n===== F. DẪN XUẤT KHÁC =====');
  console.log('meal_type phân bố:');
  (await all('select meal_type, count(*)::int n from recipes group by 1 order by 2 desc'))
    .forEach(r => console.log('   ' + String(r.meal_type).padEnd(12), r.n));
  console.log('search_text rỗng  :', (await one("select count(*)::int n from recipes where search_text is null or length(trim(search_text))=0")).n, '(phải = 0)');

  console.log('\n===== G. MẪU 5 MÓN VỪA SINH NGUYÊN LIỆU =====');
  const sample = await all(`
    select r.title, r.kcal, r.protein_g p,
           (select string_agg(ri.ingredient_name || ' ' || round(ri.amount) || ri.unit, ', ' order by ri.amount desc)
            from recipe_ingredients ri where ri.recipe_id=r.id and ri.notes='auto-generated') ings
    from recipes r
    where exists(select 1 from recipe_ingredients ri where ri.recipe_id=r.id and ri.notes='auto-generated')
    order by r.title limit 5`);
  sample.forEach(s => console.log(`  ${s.title.replace(/^[^\p{L}]+/u, '').slice(0, 40).padEnd(42)} ${String(s.kcal).padStart(6)} kcal | ${s.ings}`));

  // Kiểm chứng: macro tính từ nguyên liệu khớp kcal khai báo bao nhiêu %
  const acc = await one(`
    with calc as (
      select r.id, r.kcal,
        sum(i.kcal_per_100g * ri.amount / 100) ek
      from recipes r
      join recipe_ingredients ri on ri.recipe_id = r.id
      join ingredients i on i.name = ri.ingredient_name
      where ri.notes = 'auto-generated'
      group by r.id, r.kcal
    )
    select count(*)::int n,
           count(*) filter (where abs(ek-kcal) <= 0.15*kcal)::int within15
    from calc`);
  console.log(`\nĐối chiếu macro từ nguyên liệu vs kcal khai báo: ${acc.within15}/${acc.n} món lệch <=15%`);

  await pool.end();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });