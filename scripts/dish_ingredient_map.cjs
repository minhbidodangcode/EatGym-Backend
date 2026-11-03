const fs = require('fs');
const path = require('path');

const allIngs = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));

const ingByName = new Map();
allIngs.forEach(ing => {
  ingByName.set(ing.name.toLowerCase().trim(), ing);
});

function findIng(name) {
  const norm = name.toLowerCase().trim();
  if (ingByName.has(norm)) return ingByName.get(norm);
  for (const [k, v] of ingByName.entries()) {
    if (k === norm || k.includes(norm) || norm.includes(k)) return v;
  }
  return null;
}

// Map each dish by ID or title pattern
function getIngredientsForDish(dish) {
  const t = dish.cleanTitle.toLowerCase().trim();
  const names = [];

  // Helper
  const pick = (ingName, min = 10, max = 250) => {
    const found = findIng(ingName);
    if (!found) throw new Error(`Missing ingredient: "${ingName}" for dish "${dish.cleanTitle}"`);
    if (!names.some(x => x.id === found.id)) {
      names.push({
        id: found.id,
        name: found.name,
        p: Number(found.protein_g),
        c: Number(found.carbs_g),
        f: Number(found.fat_g),
        kcal: Number(found.kcal_per_100g),
        unit: found.default_unit || 'g',
        minAmount: min,
        maxAmount: max
      });
    }
  };

  // Specific mapping for 107 dishes
  if (t === 'chao (đậu hũ nhũ)') {
    pick('Đậu hũ trắng mềm', 50, 150);
    pick('Dầu mè thơm', 3, 15);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'đậu hủ chiên xả') {
    pick('Đậu hũ chiên non', 50, 180);
    pick('Sả băm', 10, 30);
    pick('Dầu ô liu nguyên chất', 5, 20);
  } else if (t === 'đậu hủ sốt cà') {
    pick('Đậu hũ chiên non', 60, 200);
    pick('Cà chua chín', 50, 150);
    pick('Dầu ô liu nguyên chất', 5, 20);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'nấm rơm kho') {
    pick('Nấm rơm tươi', 80, 250);
    pick('Dầu ô liu nguyên chất', 5, 20);
    pick('Nước tương đậu nành (Xì dầu)', 10, 30);
    pick('Hành tím băm', 5, 20);
  } else if (t === '️ cà chua dồn thịt') {
    pick('Cà chua chín', 50, 150);
    pick('Thịt heo nạc băm', 40, 150);
    pick('Dầu ô liu nguyên chất', 3, 15);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'bánh canh giò heo') {
    pick('Bánh phở tươi', 80, 250);
    pick('Giòheo bỏ xương', 60, 200);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'bánh canh thịt heo') {
    pick('Bánh phở tươi', 80, 250);
    pick('Thịt heo nạc', 50, 180);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 15);
  } else if (t === 'chả giò chiên') {
    pick('Bánh tráng mỏng', 10, 50);
    pick('Thịt heo nạc băm', 10, 60);
    pick('Dầu ăn thực vật', 2, 10);
    pick('Cà rốt tươi', 5, 30);
  } else if (t === 'cháo sườn') {
    pick('Cơm trắng dẻo', 80, 250);
    pick('Sườn non heo nạc', 40, 150);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 2, 15);
  } else if (t === 'cơm tấm sườn') {
    pick('Cơm trắng dẻo', 100, 300);
    pick('Sườn non heo nạc', 60, 200);
    pick('Dưa leo (Dưa chuột)', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'đậu hủ dồn thịt') {
    pick('Đậu hũ chiên non', 50, 150);
    pick('Thịt heo nạc băm', 30, 100);
    pick('Cà chua chín', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'giò cháo quẩy') {
    pick('Bánh mì baguette giòn', 20, 80);
    pick('Cơm trắng dẻo', 50, 150);
    pick('Dầu ăn thực vật', 2, 10);
  } else if (t === 'hủ tíu giò heo') {
    pick('Bánh phở tươi', 80, 250);
    pick('Giòheo bỏ xương', 80, 220);
    pick('Giá đỗ xanh', 20, 60);
    pick('Dầu ô liu nguyên chất', 5, 25);
  } else if (t === 'hủ tíu thịt heo') {
    pick('Bánh phở tươi', 80, 250);
    pick('Thịt heo nạc', 50, 180);
    pick('Giá đỗ xanh', 20, 60);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'mì thịt heo') {
    pick('Mì Ý nguyên cám Spaghetti', 60, 200);
    pick('Thịt heo nạc', 60, 180);
    pick('Cải thìa (Bok choy)', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 15);
  } else if (t === 'mì xào giòn') {
    pick('Mì Ý nguyên cám Spaghetti', 60, 200);
    pick('Thịt heo nạc', 60, 200);
    pick('Tôm sú bóc vỏ', 40, 150);
    pick('Dầu ăn thực vật', 5, 30);
  } else if (t === 'nui thịt heo') {
    pick('Mì Ý nguyên cám Spaghetti', 60, 200);
    pick('Thịt heo nạc', 60, 180);
    pick('Cà rốt tươi', 20, 60);
    pick('Dầu ô liu nguyên chất', 3, 15);
  } else if (t === 'sườn nướng') {
    pick('Sườn non heo nạc', 50, 180);
    pick('Nước mắm cá cơm truyền thống', 5, 20);
    pick('Dầu ô liu nguyên chất', 2, 15);
    pick('Tỏi băm tươi', 5, 15);
  } else if (t === 'sườn ram') {
    pick('Sườn non heo nạc', 50, 180);
    pick('Nước mắm cá cơm truyền thống', 5, 20);
    pick('Dầu ô liu nguyên chất', 3, 20);
    pick('Tỏi băm tươi', 5, 15);
  } else if (t === 'thịt heo phá lấu') {
    pick('Bao tử heo', 50, 180);
    pick('Thịt heo nạc', 40, 150);
    pick('Dầu ăn thực vật', 5, 25);
    pick('Hành tím băm', 5, 20);
  } else if (t === 'thịt heo quay') {
    pick('Thịt ba chỉ heo', 60, 200);
    pick('Dưa leo (Dưa chuột)', 30, 80);
    pick('Nước tương đậu nành (Xì dầu)', 5, 20);
  } else if (t === 'thịt heo xào đậu que') {
    pick('Thịt heo nạc', 60, 180);
    pick('Đậu cove (Đậu que)', 50, 150);
    pick('Dầu ô liu nguyên chất', 3, 15);
    pick('Tỏi băm tươi', 5, 15);
  } else if (t === 'thịt heo xào giá hẹ') {
    pick('Thịt heo nạc', 60, 180);
    pick('Giá đỗ xanh', 50, 150);
    pick('Dầu ô liu nguyên chất', 3, 15);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'thịt kho tiêu') {
    pick('Thịt heo nạc', 80, 220);
    pick('Nước mắm cá cơm truyền thống', 10, 30);
    pick('Dầu ô liu nguyên chất', 5, 20);
    pick('Hành tím băm', 5, 20);
  } else if (t === 'bánh canh thịt gà') {
    pick('Bánh phở tươi', 80, 250);
    pick('Ức gà không da', 50, 180);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 15);
  } else if (t === 'đùi gà chiên') {
    pick('Đùi gà tháo xương', 60, 200);
    pick('Dầu ăn thực vật', 5, 25);
    pick('Tỏi băm tươi', 5, 15);
  } else if (t === 'gà kho gừng') {
    pick('Đùi gà tháo xương', 80, 220);
    pick('Gừng tươi', 10, 30);
    pick('Nước mắm cá cơm truyền thống', 5, 20);
    pick('Dầu ô liu nguyên chất', 5, 25);
  } else if (t === 'gà rô ti') {
    pick('Đùi gà tháo xương', 80, 220);
    pick('Tỏi băm tươi', 5, 20);
    pick('Dầu ô liu nguyên chất', 5, 30);
    pick('Nước tương đậu nành (Xì dầu)', 5, 20);
  } else if (t === 'gà xào sả ớt') {
    pick('Đùi gà tháo xương', 80, 220);
    pick('Sả băm', 10, 30);
    pick('Dầu ô liu nguyên chất', 5, 25);
    pick('Ớt tươi', 5, 15);
  } else if (t === 'miến gà') {
    pick('Mì Ý nguyên cám Spaghetti', 80, 250);
    pick('Ức gà không da', 60, 200);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'phở gà') {
    pick('Bánh phở tươi', 100, 300);
    pick('Ức gà không da', 70, 220);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'xôi bắp') {
    pick('Gạo nếp cái', 50, 180);
    pick('Bắp ngọt tươi (Ngô)', 40, 120);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ăn thực vật', 2, 15);
  } else if (t === 'xôi đậu đen') {
    pick('Gạo nếp cái', 80, 250);
    pick('Đậu đen (hạt)', 30, 100);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === 'xôi gấc') {
    pick('Gạo nếp cái', 90, 280);
    pick('Đậu xanh tách vỏ', 20, 80);
    pick('Dầu ăn thực vật', 5, 25);
  } else if (t === 'xôi khúc') {
    pick('Gạo nếp cái', 60, 200);
    pick('Đậu xanh tách vỏ', 30, 100);
    pick('Thịt ba chỉ heo', 20, 80);
  } else if (t === 'xôi lá cẩm') {
    pick('Gạo nếp cái', 90, 280);
    pick('Đậu xanh tách vỏ', 20, 80);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === 'xôi mặn') {
    pick('Gạo nếp cái', 70, 220);
    pick('Thịt heo nạc', 40, 120);
    pick('Trứng cút tươi', 20, 60);
    pick('Dầu ăn thực vật', 5, 25);
  } else if (t === 'xôi nếp than') {
    pick('Gạo nếp cái', 80, 250);
    pick('Đậu xanh tách vỏ', 30, 100);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === 'xôi vị') {
    pick('Gạo nếp cái', 80, 250);
    pick('Cùi dừa non', 20, 60);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === 'xôi vò') {
    pick('Gạo nếp cái', 80, 250);
    pick('Đậu xanh tách vỏ', 40, 120);
    pick('Dầu ăn thực vật', 2, 15);
  } else if (t === 'cơm chiên dương châu') {
    pick('Cơm trắng dẻo', 100, 300);
    pick('Trứng gà tươi', 30, 80);
    pick('Thịt heo nạc', 30, 100);
    pick('Đậu cove (Đậu que)', 20, 60);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === 'cơm tấm bì') {
    pick('Cơm trắng dẻo', 100, 300);
    pick('Thịt heo nạc', 60, 180);
    pick('Thịt ba chỉ heo', 20, 60);
    pick('Dầu ô liu nguyên chất', 3, 25);
  } else if (t === 'cơm tấm chả') {
    pick('Cơm trắng dẻo', 100, 300);
    pick('Trứng gà tươi', 30, 80);
    pick('Thịt heo nạc', 40, 150);
    pick('Dầu ô liu nguyên chất', 3, 25);
  } else if (t === 'bánh canh chay') {
    pick('Bánh phở tươi', 60, 200);
    pick('Đậu hũ chiên non', 100, 300);
    pick('Nấm rơm tươi', 50, 150);
    pick('Cà rốt tươi', 20, 60);
  } else if (t === 'hủ tíu mì') {
    pick('Bánh phở tươi', 50, 180);
    pick('Mì Ý nguyên cám Spaghetti', 50, 180);
    pick('Thịt heo nạc', 50, 150);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'hủ tíu nam vang') {
    pick('Bánh phở tươi', 70, 220);
    pick('Tôm sú bóc vỏ', 40, 120);
    pick('Thịt heo nạc', 40, 120);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'hủ tíu xào') {
    pick('Bánh phở tươi', 80, 250);
    pick('Thịt heo nạc', 70, 220);
    pick('Tôm sú bóc vỏ', 40, 120);
    pick('Dầu ăn thực vật', 5, 30);
  } else if (t === 'mì căn xào sả') {
    pick('Đậu hũ chiên non', 60, 220);
    pick('Sả băm', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'mì quảng') {
    pick('Bánh phở tươi', 80, 250);
    pick('Thịt heo nạc', 50, 180);
    pick('Tôm sú bóc vỏ', 30, 100);
    pick('Dầu mè thơm', 3, 20);
  } else if (t === 'canh chua') {
    pick('Cá lóc đồng (Cá quả)', 40, 150);
    pick('Cà chua chín', 40, 120);
    pick('Giá đỗ xanh', 30, 80);
    pick('Dầu ô liu nguyên chất', 2, 15);
  } else if (t === 'canh khổ qua') {
    pick('Mướp đắng (Khổ qua)', 60, 200);
    pick('Thịt heo nạc', 15, 80);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 2, 15);
  } else if (t === 'canh khoai mỡ') {
    pick('Khoai lang mật hấp', 50, 180);
    pick('Thịt heo nạc', 15, 70);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 2, 15);
  } else if (t === 'canh bí rợ') {
    pick('Bí đỏ (Bí ngô)', 50, 200);
    pick('Thịt heo nạc', 10, 60);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'canh bắp cải') {
    pick('Bắp cải trắng', 60, 200);
    pick('Thịt heo nạc', 10, 60);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'canh cải bẹ xanh') {
    pick('Cải ngọt', 60, 200);
    pick('Thịt heo nạc', 10, 60);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'canh cải cúc (tần ô)') {
    pick('Cải bó xôi (Rau chân vịt)', 60, 200);
    pick('Thịt heo nạc', 10, 60);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'canh cải ngọt') {
    pick('Cải ngọt', 60, 200);
    pick('Thịt heo nạc', 10, 60);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'canh cải xoong') {
    pick('Cải bó xôi (Rau chân vịt)', 60, 200);
    pick('Thịt heo nạc', 10, 60);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'canh kiểm') {
    pick('Bí đỏ (Bí ngô)', 60, 180);
    pick('Khoai lang mật hấp', 50, 150);
    pick('Đậu phộng', 15, 50);
    pick('Dầu mè thơm', 3, 20);
  } else if (t === 'canh mướp') {
    pick('Bí đao (Bí xanh)', 60, 200);
    pick('Tôm sú bóc vỏ', 10, 50);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'canh rau dền') {
    pick('Rau dền đỏ', 60, 200);
    pick('Thịt heo nạc', 10, 50);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ô liu nguyên chất', 1, 15);
  } else if (t === 'bầu xào trứng') {
    pick('Bí đao (Bí xanh)', 60, 200);
    pick('Trứng gà tươi', 20, 80);
    pick('Dầu ăn thực vật', 3, 20);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'chả trứng chưng') {
    pick('Trứng gà tươi', 40, 120);
    pick('Thịt heo nạc', 30, 100);
    pick('Dầu ăn thực vật', 2, 15);
    pick('Hành tím băm', 5, 20);
  } else if (t === 'khổ qua xào trứng') {
    pick('Mướp đắng (Khổ qua)', 60, 200);
    pick('Trứng gà tươi', 25, 90);
    pick('Dầu ăn thực vật', 3, 20);
    pick('Hành lá tươi', 10, 30);
  } else if (t === '️ ️ bông cải xào thập cẩm') {
    pick('Bông cải xanh (Broccoli)', 60, 200);
    pick('Thịt heo nạc', 30, 100);
    pick('Cà rốt tươi', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === '️ ️ cà ri') {
    pick('Khoai lang mật hấp', 60, 200);
    pick('Đậu hũ chiên non', 40, 150);
    pick('Cà rốt tươi', 40, 100);
    pick('Dầu ô liu nguyên chất', 5, 25);
  } else if (t === '️ ️ chim cút chiên bơ') {
    pick('Ức gà không da', 60, 200);
    pick('Bơ lạt tự nhiên', 10, 30);
    pick('Tỏi băm tươi', 5, 20);
  } else if (t === '️ ️ há cảo') {
    pick('Bánh tráng mỏng', 40, 120);
    pick('Tôm sú bóc vỏ', 30, 100);
    pick('Thịt heo nạc', 20, 80);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === '️ ️ hoành thánh') {
    pick('Bánh tráng mỏng', 30, 100);
    pick('Thịt heo nạc', 40, 120);
    pick('Tôm sú bóc vỏ', 20, 80);
    pick('Dầu ăn thực vật', 2, 15);
  } else if (t === '️ ️ mắm chưng') {
    pick('Thịt heo nạc', 50, 150);
    pick('Trứng gà tươi', 30, 80);
    pick('Mắm tôm đặc', 10, 30);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === '️ ️ mắm thái') {
    pick('Thịt heo nạc', 50, 150);
    pick('Mắm tôm đặc', 10, 30);
    pick('Dưa leo (Dưa chuột)', 30, 80);
    pick('Dầu ăn thực vật', 2, 15);
  } else if (t === '️ ️ măng kho thập cẩm') {
    pick('Đậu hũ chiên non', 40, 120);
    pick('Măng tây tươi', 50, 150);
    pick('Nấm rơm tươi', 40, 100);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === '️ ️ mít kho') {
    pick('Đậu hũ chiên non', 40, 120);
    pick('Cà rốt tươi', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
    pick('Nước tương đậu nành (Xì dầu)', 5, 20);
  } else if (t === '️ ️ nui chiên') {
    pick('Mì Ý nguyên cám Spaghetti', 60, 200);
    pick('Trứng gà tươi', 40, 100);
    pick('Dầu ăn thực vật', 5, 30);
    pick('Hành lá tươi', 10, 30);
  } else if (t === '️ ️ tàu hủ ky chiên') {
    pick('Đậu hũ chiên non', 60, 220);
    pick('Dầu ăn thực vật', 5, 30);
    pick('Hành lá tươi', 10, 30);
  } else if (t === '️ ️ tép rang') {
    pick('Tép gạo', 50, 180);
    pick('Dầu ăn thực vật', 3, 20);
    pick('Hành tím băm', 5, 20);
  } else if (t === '️ ️ xíu mại') {
    pick('Thịt heo nạc', 40, 150);
    pick('Cà chua chín', 40, 120);
    pick('Dầu ô liu nguyên chất', 2, 15);
    pick('Hành tím băm', 5, 20);
  } else if (t === 'cá bạc má kho') {
    pick('Cá nục', 60, 200);
    pick('Nước mắm cá cơm truyền thống', 5, 25);
    pick('Dầu ô liu nguyên chất', 2, 15);
    pick('Hành tím băm', 5, 20);
  } else if (t === 'cá cơm lăn bột chiên') {
    pick('Cá bống tươi', 50, 180);
    pick('Bánh tráng mỏng', 30, 100);
    pick('Dầu ăn thực vật', 5, 25);
  } else if (t === 'cá hú kho') {
    pick('Cá lóc đồng (Cá quả)', 60, 200);
    pick('Nước mắm cá cơm truyền thống', 5, 25);
    pick('Dầu ô liu nguyên chất', 3, 20);
    pick('Hành tím băm', 5, 20);
  } else if (t === 'cá viên kho') {
    pick('Chà bông cá lóc', 30, 100);
    pick('Nước mắm cá cơm truyền thống', 5, 25);
    pick('Dầu ô liu nguyên chất', 2, 15);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'chả cá thác lác chiên') {
    pick('Cá bống tươi', 60, 200);
    pick('Dầu ăn thực vật', 3, 20);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'gỏi bắp chuối') {
    pick('Hoa chuối thái mỏng', 60, 200);
    pick('Thịt heo nạc', 30, 100);
    pick('Đậu phộng', 10, 30);
    pick('Dầu mè thơm', 2, 15);
  } else if (t === 'gỏi bì cuốn') {
    pick('Bánh tráng mỏng', 20, 80);
    pick('Thịt heo nạc', 40, 120);
    pick('Thịt ba chỉ heo', 20, 60);
    pick('Xà lách Romaine', 30, 80);
  } else if (t === 'gỏi ngó sen') {
    pick('Ngó sen tươi', 60, 200);
    pick('Tôm sú bóc vỏ', 40, 120);
    pick('Cà rốt tươi', 30, 80);
    pick('Dầu mè thơm', 3, 20);
  } else if (t === 'bánh hỏi (tươi)') {
    pick('Bánh phở tươi', 80, 220);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu ăn thực vật', 1, 10);
  } else if (t === 'bột chiên') {
    pick('Bánh phở tươi', 60, 180);
    pick('Trứng gà tươi', 40, 100);
    pick('Dầu ăn thực vật', 5, 30);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'cháo đậu đỏ') {
    pick('Cơm trắng dẻo', 70, 220);
    pick('Đậu đỏ hạt', 30, 100);
    pick('Dầu ô liu nguyên chất', 3, 20);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'cháo gỏi vịt') {
    pick('Cơm trắng dẻo', 70, 220);
    pick('Thịt vịt', 80, 250);
    pick('Bắp cải trắng', 40, 120);
    pick('Dầu mè thơm', 5, 30);
  } else if (t === 'cháo huyết') {
    pick('Cơm trắng dẻo', 80, 250);
    pick('Huyết heo luộc', 60, 180);
    pick('Giá đỗ xanh', 20, 60);
    pick('Hành lá tươi', 10, 30);
  } else if (t === 'cháo lòng') {
    pick('Cơm trắng dẻo', 80, 250);
    pick('Bao tử heo', 40, 120);
    pick('Huyết heo luộc', 40, 120);
    pick('Hành lá tươi', 10, 30);
    pick('Gừng tươi', 5, 15);
  } else if (t === 'cháo trắng') {
    pick('Cơm trắng dẻo', 100, 300);
    pick('Hành lá tươi', 10, 30);
    pick('Dầu mè thơm', 1, 10);
  } else if (t === 'bò bía') {
    pick('Bánh tráng mỏng', 20, 80);
    pick('Khoai lang mật hấp', 40, 120);
    pick('Tép gạo', 20, 60);
    pick('Dầu mè thơm', 2, 15);
  } else if (t === 'bò cuốn lá lốt') {
    pick('Thịt thăn bò nạc', 80, 250);
    pick('Bánh tráng mỏng', 40, 120);
    pick('Xà lách Romaine', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'bò cuốn mỡ chài') {
    pick('Thịt thăn bò nạc', 80, 250);
    pick('Bánh tráng mỏng', 40, 120);
    pick('Thịt ba chỉ heo', 30, 100);
    pick('Dầu ăn thực vật', 5, 30);
  } else if (t === 'gỏi khô bò') {
    pick('Thịt thăn bò nạc', 50, 180);
    pick('Dưa leo (Dưa chuột)', 60, 200);
    pick('Đậu phộng', 15, 50);
    pick('Nước mắm cá cơm truyền thống', 5, 20);
  } else if (t === 'hủ tíu bò kho') {
    pick('Bánh phở tươi', 80, 250);
    pick('Bắp bò hoa', 60, 200);
    pick('Cà rốt tươi', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'mì bò viên') {
    pick('Mì Ý nguyên cám Spaghetti', 60, 200);
    pick('Thịt thăn bò nạc', 60, 180);
    pick('Cải thìa (Bok choy)', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'phở bò chín') {
    pick('Bánh phở tươi', 100, 300);
    pick('Bắp bò hoa', 60, 200);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'phở bò tái') {
    pick('Bánh phở tươi', 100, 300);
    pick('Thịt thăn bò nạc', 60, 200);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'phở bò viên') {
    pick('Bánh phở tươi', 100, 300);
    pick('Thịt thăn bò nạc', 50, 180);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'bánh canh cua') {
    pick('Bánh phở tươi', 80, 250);
    pick('Thịt cua biển', 60, 200);
    pick('Hành lá tươi', 15, 40);
    pick('Dầu ô liu nguyên chất', 2, 15);
  } else if (t === 'gỏi tôm cuốn') {
    pick('Bánh tráng mỏng', 20, 80);
    pick('Tôm sú bóc vỏ', 40, 120);
    pick('Xà lách Romaine', 30, 80);
    pick('Dầu mè thơm', 2, 15);
  } else if (t === 'mực xào sả ớt') {
    pick('Mực tươi', 80, 250);
    pick('Sả băm', 10, 30);
    pick('Dầu ô liu nguyên chất', 3, 20);
    pick('Hành tím băm', 5, 15);
  } else if (t === 'mực xào thập cẩm') {
    pick('Mực tươi', 70, 220);
    pick('Bông cải xanh (Broccoli)', 40, 120);
    pick('Cà rốt tươi', 30, 80);
    pick('Dầu ô liu nguyên chất', 3, 20);
  } else if (t === 'tôm lăn bột chiên') {
    pick('Tôm sú bóc vỏ', 40, 120);
    pick('Bánh tráng mỏng', 30, 100);
    pick('Dầu ăn thực vật', 3, 20);
  } else if (t === 'tôm sốt cà') {
    pick('Tôm sú bóc vỏ', 50, 180);
    pick('Cà chua chín', 50, 150);
    pick('Dầu ô liu nguyên chất', 3, 20);
    pick('Hành lá tươi', 10, 30);
  } else {
    // Default fallback
    pick('Thịt heo nạc', 40, 150);
    pick('Cơm trắng dẻo', 50, 150);
    pick('Bắp cải trắng', 40, 100);
    pick('Dầu ô liu nguyên chất', 3, 20);
  }

  return names;
}

module.exports = { getIngredientsForDish };
