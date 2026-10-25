const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eatgym:change-me@localhost:5432/eatgym'
});

function detectIngredientIcon(name) {
  const raw = name.toLowerCase().trim();

  function hasWord(word) {
    const regex = new RegExp(`(^|[^a-zà-ỹ0-9])${word}([^a-zà-ỹ0-9]|$)`, 'i');
    return regex.test(raw);
  }

  function hasWords(...words) {
    return words.some(w => hasWord(w));
  }

  // --- 1. USER PRIORITY: MẬT ONG & NƯỚC SỐT ---
  if (raw.includes('mật ong') || raw.includes('honey')) {
    return '🍯';
  }
  if (raw.includes('nước sốt') || hasWords('sốt', 'sauce')) {
    return '🥣';
  }

  // --- SPECIAL INGREDIENT OVERRIDES (prevent substring collisions) ---
  if (raw.includes('ba khía')) return '🦀';
  if (raw.includes('đậu gà') || raw.includes('chickpea')) return '🫘';
  if (raw.includes('hàu')) return '🦪';
  if (raw.includes('nghêu') || raw.includes('ngao')) return '🦪';
  if (raw.includes('trứng')) return '🥚';
  if (raw.includes('nước tương') || raw.includes('xì dầu')) return '🥢';
  if (raw.includes('bánh mì')) return '🥖';
  if (raw.includes('tương')) {
    if (raw.includes('ớt')) return '🌶️';
    if (raw.includes('cà')) return '🥫';
    if (raw.includes('đen')) return '🥫';
    return '🥫';
  }
  if (raw.includes('nấm')) return '🍄';
  if (raw.includes('hoa chuối')) return '🌺';
  if (raw.includes('bí đỏ') || raw.includes('bí ngô')) return '🎃';
  if (raw.includes('tép')) return '🦐';
  if (raw.includes('bún') || raw.includes('phở') || raw.includes('miến') || raw.includes('mì')) {
    if (raw.includes('mì ý') || raw.includes('spaghetti') || raw.includes('pasta')) return '🍝';
    return '🍜';
  }
  if (raw.includes('cơm gạo lứt huyết rồng') || raw.includes('huyết rồng')) return '🍚';
  if (raw.includes('hạt điều')) return '🌰';
  if (raw.includes('bắp bò')) return '🥩';

  // --- CONDIMENTS & SAUCES ---
  if (raw.includes('tương cà')) return '🥫';
  if (raw.includes('tương ớt')) return '🌶️';
  if (raw.includes('tương đen')) return '🥫';
  if (raw.includes('sốt mayonnaise') || raw.includes('mayo')) return '🥣';
  if (raw.includes('sốt mè rang') || raw.includes('kewpie')) return '🥣';
  if (raw.includes('dầu hào')) return '🫙';
  if (raw.includes('dầu mè')) return '🍶';
  if (raw.includes('dầu ô liu') || raw.includes('dầu ăn') || raw.includes('dầu thực vật')) return '🫒';
  if (raw.includes('nước mắm') || raw.includes('mắm nêm')) return '🧂';
  if (raw.includes('mắm tôm') || raw.includes('mắm ruốc')) return '🦐';
  if (hasWords('giấm', 'dấm')) return '🍶';
  if (raw.includes('pa-tê') || raw.includes('pate')) return '🥫';
  if (raw.includes('cari') || raw.includes('cà ri')) return '🍛';

  // Spices
  if (hasWord('muối')) return '🧂';
  if (hasWord('tiêu') && !raw.includes('chuối tiêu')) return '🧂';
  if (raw.includes('ớt') && !raw.includes('ớt chuông')) return '🌶️';
  if (raw.includes('ớt chuông')) return '🫑';
  if (raw.includes('đường cát') || (hasWord('đường') && !raw.includes('không đường') && !raw.includes('ít đường'))) return '🧂';
  if (hasWord('sả')) return '🌿';
  if (hasWord('gừng')) return '🫚';
  if (hasWord('nghệ') && !raw.includes('khoai')) return '🫚';
  if (hasWord('tỏi')) return '🧄';
  if (raw.includes('hành tây') || raw.includes('hành tím') || raw.includes('hành củ')) return '🧅';
  if (raw.includes('hành lá') || raw.includes('ngò gai') || raw.includes('mùi tàu') || raw.includes('ngò rí') || raw.includes('rau mùi')) return '🌿';

  // --- DAIRY & DRINKS ---
  if (hasWords('bia')) return '🍺';
  if (hasWords('rượu')) return '🍶';
  if (raw.includes('cocacola') || raw.includes('pepsi') || raw.includes('nước ngọt')) return '🥤';
  if (raw.includes('whey')) return '🥛';
  if (raw.includes('sữa')) return '🥛';
  if (raw.includes('phô mai') || raw.includes('cheese')) return '🧀';
  if (hasWord('bơ') && !raw.includes('đậu phộng') && !raw.includes('lạc') && !raw.includes('bơ sáp') && !raw.includes('trái bơ') && !raw.includes('quả bơ')) {
    return '🧈';
  }

  // --- BAKERY & SWEETS ---
  if (raw.includes('sôcôla') || raw.includes('socola') || raw.includes('chocolate')) return '🍫';
  if (hasWords('kẹo')) return '🍬';
  if (raw.includes('bánh quy') || raw.includes('bánh men') || raw.includes('biscuit') || raw.includes('cookie')) return '🍪';
  if (raw.includes('bánh in') || raw.includes('bánh đúc')) return '🥮';
  if (raw.includes('bánh phồng tôm')) return '🍘';
  if (raw.includes('bánh mì') || raw.includes('sandwich') || raw.includes('baguette') || raw.includes('bánh phở') || raw.includes('bánh bao') || raw.includes('bánh tráng') || raw.includes('wrap')) {
    return '🥖';
  }

  // --- MEATS, EGGS, POULTRY ---
  if (hasWords('trứng')) return '🥚';
  if (raw.includes('ức gà') || raw.includes('đùi gà') || raw.includes('cánh gà') || raw.includes('chân gà') || (hasWords('gà', 'vịt', 'ngan', 'ngỗng', 'chim') && !raw.includes('chân vịt') && !raw.includes('nấm đùi gà'))) {
    return '🍗';
  }
  if (raw.includes('chà bông')) return '🥓';
  if (raw.includes('lạp xưởng') || raw.includes('xúc xích')) return '🌭';
  if (raw.includes('chả lụa') || raw.includes('chả quế') || (hasWord('giò') && !raw.includes('giòn')) || raw.includes('nem chua')) {
    return '🍖';
  }
  if (hasWords('bò', 'bê') && !raw.includes('bơ')) return '🥩';
  if (hasWords('heo', 'lợn', 'sườn', 'thịt', 'gan', 'cật', 'tim', 'phèo', 'da heo', 'huyết') && !raw.includes('thịt cua')) {
    return '🥩';
  }
  if (hasWords('óc') && !raw.includes('hạt óc chó') && !raw.includes('bóc')) return '🥩';
  if (hasWords('tai heo', 'mũi heo', 'lưỡi heo', 'đuôi heo', 'móng heo', 'nạc vai', 'ba chỉ', 'dăm bông')) return '🥩';
  if (raw.includes('ếch')) return '🐸';
  if (raw.includes('nhộng')) return '🥜';

  // --- SEAFOOD ---
  if (raw.includes('thịt cua') || hasWords('cua', 'ghẹ', 'ba khía')) return '🦀';
  if (hasWords('tôm')) return '🦐';
  if (hasWords('mực', 'bạch tuộc')) return '🦑';
  if (hasWords('cá', 'lươn') && !raw.includes('cát')) return '🐟';
  if (hasWords('nghêu', 'ngao', 'sò', 'hến', 'hàu', 'ốc', 'hải sâm')) return '🦪';

  // --- GRAINS & CARBS ---
  if (raw.includes('bắp ngọt') || raw.includes('bắp tươi') || (hasWords('bắp', 'ngô') && !raw.includes('bắp cải') && !raw.includes('đậu bắp') && !raw.includes('bắp bò'))) {
    return '🌽';
  }
  if (hasWords('gạo', 'cơm', 'nếp')) return '🍚';
  if (raw.includes('yến mạch') || raw.includes('quinoa') || raw.includes('diêm mạch') || raw.includes('oat')) return '🌾';
  if (raw.includes('bột sắn') || raw.includes('tinh bột')) return '🥣';
  if (raw.includes('khoai') || raw.includes('củ từ') || raw.includes('củ sắn')) return '🍠';
  if (raw.includes('bí đao') || raw.includes('bí xanh')) return '🥒';

  // --- LEGUMES & NUTS ---
  if (raw.includes('đậu bắp') || raw.includes('đậu hà lan')) return '🫛';
  if (raw.includes('đậu hũ') || raw.includes('đậu phụ') || raw.includes('tàu hũ')) return '🌱';
  if (raw.includes('đậu phộng') || hasWord('lạc')) return '🥜';
  if (raw.includes('đậu cove') || raw.includes('đậu que') || raw.includes('đậu xanh') || raw.includes('đậu đen') || raw.includes('đậu đỏ') || raw.includes('đậu nành') || (hasWord('đậu') && !raw.includes('đậu bắp') && !raw.includes('đậu hũ') && !raw.includes('đậu phụ'))) {
    return '🫘';
  }
  if (raw.includes('hạt điều') || raw.includes('hạnh nhân') || raw.includes('óc chó') || raw.includes('hạt chia') || raw.includes('hạt sen') || raw.includes('hạt mè') || hasWord('mè') || hasWord('vừng')) {
    return '🌰';
  }

  // --- FRUITS ---
  if (hasWords('chuối') || raw.includes('chuối tiêu')) return '🍌';
  if (hasWords('táo') && !raw.includes('giấm táo')) return '🍎';
  if (raw.includes('bơ sáp') || raw.includes('trái bơ') || raw.includes('quả bơ') || raw.includes('avocado')) return '🥑';
  if (raw.includes('dưa hấu')) return '🍉';
  if (hasWord('nho')) return '🍇';
  if (hasWord('dâu')) return '🍓';
  if (raw.includes('dứa') || raw.includes('thơm')) return '🍍';
  if (raw.includes('xoài')) return '🥭';
  if (hasWords('cam', 'quýt')) return '🍊';
  if (hasWord('chanh')) return '🍋';
  if (raw.includes('kiwi')) return '🥝';
  if (hasWords('bưởi', 'ổi')) return '🍈';
  if (hasWord('dừa')) return '🥥';
  if (raw.includes('việt quất') || raw.includes('blueberry')) return '🫐';
  if (raw.includes('thanh long')) return '🌺';
  if (raw.includes('nhãn') || raw.includes('vải')) return '🥣';
  if (raw.includes('mứt')) return '🍯';

  // --- VEGETABLES ---
  if (raw.includes('cà chua')) return '🍅';
  if (raw.includes('cà tím')) return '🍆';
  if (raw.includes('cà rốt')) return '🥕';
  if (raw.includes('dưa leo') || raw.includes('dưa chuột') || raw.includes('khổ qua') || raw.includes('mướp')) return '🥒';
  if (raw.includes('bông cải') || raw.includes('súp lơ') || raw.includes('broccoli')) return '🥦';
  if (raw.includes('bắp cải')) return '🥬';
  if (raw.includes('măng tây')) return '🌱';
  if (hasWord('măng')) return '🎋';
  if (raw.includes('giá đỗ') || raw.includes('giá')) return '🌱';
  if (raw.includes('ngó sen')) return '🪷';
  if (raw.includes('rong biển')) return '🌿';
  if (hasWord('nấm')) return '🍄';
  if (raw.includes('cải bó xôi') || raw.includes('chân vịt') || raw.includes('rau') || raw.includes('cải') || raw.includes('xà lách') || raw.includes('mồng tơi') || raw.includes('dền') || raw.includes('ngót') || raw.includes('cần tây')) {
    return '🥬';
  }

  return '🥗';
}

async function main() {
  const all = await pool.query("SELECT id, name, icon FROM ingredients");
  let updated = 0;
  for (const ing of all.rows) {
    const newIcon = detectIngredientIcon(ing.name);
    if (newIcon !== ing.icon) {
      await pool.query("UPDATE ingredients SET icon = $1 WHERE id = $2", [newIcon, ing.id]);
      updated++;
    }
  }
  console.log(`Updated icons for ${updated} ingredients.`);
  await pool.end();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { detectIngredientIcon };
