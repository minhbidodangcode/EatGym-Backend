-- 002_recipes_and_ingredients.sql
-- CSDL Quản lý Món ăn (Recipes) và Nguyên liệu (Ingredients) chuẩn Gym & Thể hình

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  category VARCHAR(60) NOT NULL, -- 'protein', 'carb', 'fat', 'vegetable', 'fruit', 'dairy', 'condiment'
  kcal_per_100g NUMERIC(6, 1) NOT NULL,
  protein_g NUMERIC(5, 1) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(5, 1) NOT NULL DEFAULT 0,
  fat_g NUMERIC(5, 1) NOT NULL DEFAULT 0,
  icon VARCHAR(128) DEFAULT '🥗',
  default_unit VARCHAR(32) NOT NULL DEFAULT 'g',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  kcal NUMERIC(6, 1) NOT NULL,
  protein_g NUMERIC(5, 1) NOT NULL,
  carbs_g NUMERIC(5, 1) NOT NULL,
  fat_g NUMERIC(5, 1) NOT NULL,
  cooking_time_min INTEGER NOT NULL,
  servings INTEGER NOT NULL DEFAULT 1,
  difficulty VARCHAR(32) NOT NULL DEFAULT 'Dễ',
  tags TEXT[] NOT NULL DEFAULT '{}',
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name VARCHAR(160) NOT NULL,
  amount NUMERIC(8, 2) NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT 'g',
  notes VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredient_yield_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(160) NOT NULL,
  cooking_method VARCHAR(80) NOT NULL,
  raw_to_cooked_factor NUMERIC(4, 2) NOT NULL,
  source VARCHAR(240),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipes_tags_idx ON recipes USING GIN (tags);
CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx ON recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS ingredients_category_idx ON ingredients (category);

-- =========================================================================
-- SEED DATA: DANH SÁCH NGUYÊN LIỆU (INGREDIENTS) CHUẨN GYM
-- =========================================================================
INSERT INTO ingredients (name, category, kcal_per_100g, protein_g, carbs_g, fat_g, icon, default_unit) VALUES
('Ức gà không da', 'protein', 120.0, 26.0, 0.0, 1.8, '🍗', 'g'),
('Thịt thăn bò nạc', 'protein', 142.0, 26.1, 0.0, 3.5, '🥩', 'g'),
('Phi lê cá hồi', 'protein', 208.0, 20.4, 0.0, 13.4, '🐟', 'g'),
('Tôm sú bóc vỏ', 'protein', 99.0, 24.0, 0.2, 0.3, '🦐', 'g'),
('Cá ngừ ngâm nước', 'protein', 116.0, 25.5, 0.0, 1.0, '🐟', 'g'),
('Trứng gà', 'protein', 143.0, 12.6, 0.7, 9.5, '🥚', 'quả'),
('Đậu hũ trắng', 'protein', 76.0, 8.1, 1.9, 4.8, '🧊', 'g'),
('Đậu gà (Chickpeas)', 'protein', 164.0, 8.9, 27.4, 2.6, '🫘', 'g'),
('Đậu nành Edamame', 'protein', 121.0, 11.9, 8.9, 5.2, '🫘', 'g'),
('Whey Protein Isolate', 'protein', 370.0, 85.0, 3.0, 1.5, '🥛', 'g'),
('Má đùi gà bỏ da', 'protein', 150.0, 23.0, 0.0, 6.0, '🍗', 'g'),

('Gạo lứt', 'carb', 111.0, 2.6, 23.0, 0.9, '🍚', 'g'),
('Khoai lang mật', 'carb', 86.0, 1.6, 20.1, 0.1, '🍠', 'g'),
('Yến mạch cán dẹt', 'carb', 389.0, 16.9, 66.3, 6.9, '🥣', 'g'),
('Bánh wrap nguyên cám', 'carb', 280.0, 9.0, 48.0, 5.5, '🌯', 'g'),
('Bánh mì đen nguyên cám', 'carb', 250.0, 9.0, 48.0, 3.0, '🍞', 'g'),
('Bún nưa Konjac', 'carb', 10.0, 0.2, 2.3, 0.1, '🍜', 'g'),
('Khoai tây', 'carb', 77.0, 2.0, 17.5, 0.1, '🥔', 'g'),
('Bắp ngọt tách hạt', 'carb', 86.0, 3.2, 19.0, 1.2, '🌽', 'g'),
('Chuối tiêu chín', 'carb', 89.0, 1.1, 22.8, 0.3, '🍌', 'g'),

('Bông cải xanh (Broccoli)', 'vegetable', 34.0, 2.8, 6.6, 0.4, '🥦', 'g'),
('Súp lơ trắng (Cauliflower)', 'vegetable', 25.0, 1.9, 5.0, 0.3, '🥦', 'g'),
('Xà lách Romaine', 'vegetable', 17.0, 1.2, 3.3, 0.3, '🥬', 'g'),
('Cà chua bi', 'vegetable', 18.0, 0.9, 3.9, 0.2, '🍅', 'g'),
('Măng tây', 'vegetable', 20.0, 2.2, 3.9, 0.1, '🌱', 'g'),
('Ớt chuông 3 màu', 'vegetable', 26.0, 1.0, 6.0, 0.3, '🫑', 'g'),
('Nấm hương tươi', 'vegetable', 34.0, 2.2, 6.8, 0.5, '🍄', 'g'),
('Nấm đông cô tươi', 'vegetable', 34.0, 2.2, 6.8, 0.5, '🍄', 'g'),
('Rong biển khô', 'vegetable', 45.0, 5.0, 9.0, 0.5, '🌿', 'g'),
('Dưa leo', 'vegetable', 15.0, 0.7, 3.6, 0.1, '🥒', 'g'),
('Cà rốt', 'vegetable', 41.0, 0.9, 9.6, 0.2, '🥕', 'g'),

('Dầu ô liu nguyên chất', 'fat', 884.0, 0.0, 0.0, 100.0, '🫒', 'ml'),
('Bơ đậu phộng nguyên chất', 'fat', 588.0, 25.0, 20.0, 50.0, '🥜', 'g'),
('Hạt chia', 'fat', 486.0, 16.5, 42.1, 30.7, '🌱', 'g'),
('Bơ lạt tự nhiên', 'fat', 717.0, 0.9, 0.1, 81.1, '🧈', 'g'),

('Sữa chua Hy Lạp không đường', 'dairy', 59.0, 10.0, 3.6, 0.4, '🥛', 'g'),
('Sữa tươi không đường', 'dairy', 61.0, 3.2, 4.8, 3.3, '🥛', 'ml'),
('Phô mai lát ít béo', 'dairy', 200.0, 24.0, 3.0, 10.0, '🧀', 'g'),
('Cam tươi', 'fruit', 47.0, 0.9, 11.8, 0.1, '🍊', 'g'),
('Việt quất tươi', 'fruit', 57.0, 0.7, 14.5, 0.3, '🫐', 'g')
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  kcal_per_100g = EXCLUDED.kcal_per_100g,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  icon = EXCLUDED.icon,
  default_unit = EXCLUDED.default_unit;

-- =========================================================================
-- SEED DATA: 20 MÓN ĂN CHUẨN GYM (RECIPES)
-- =========================================================================
INSERT INTO recipes (title, description, kcal, protein_g, carbs_g, fat_g, cooking_time_min, servings, difficulty, tags, instructions) VALUES
('🍗 Ức gà áp chảo sốt cam', 'Ức gà mềm mọng không khô kết hợp xốt cam tươi giàu vitamin C và đạm cao cho gymer.', 450, 48.0, 22.0, 12.0, 20, 1, 'Dễ', ARRAY['Tăng cơ', 'Tất cả'], '1. Áp chảo ức gà vàng 2 mặt. 2. Cho nước cốt cam và mật ong đun sệt. 3. Đảo đều rồi thái lát.'),
('🥗 Salad ức gà & bông cải xanh', 'Món ăn kinh điển mùa siết cơ, giàu chất xơ từ bông cải xanh và đạm nạc từ ức gà.', 320, 38.0, 14.0, 8.0, 15, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Dưới 15 phút', 'Tất cả'], '1. Luộc bông cải xanh giòn. 2. Trộn xà lách, cà chua bi và ức gà xé. 3. Rưới dầu ô liu giấm táo.'),
('🍲 Soup gà rau củ nấm giải nhiệt', 'Soup thanh đạm ít calo, no lâu, dễ hấp thụ sau buổi tập căng thẳng.', 280, 32.0, 24.0, 5.0, 25, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Tất cả'], '1. Nấu nước luộc gà cùng cà rốt, bắp ngọt, nấm. 2. Thả gà xé và lòng trắng trứng khuấy vân.'),
('🌯 Wrap ức gà ngũ cốc sốt sữa chua Hy Lạp', 'Bữa ăn nhanh tiện lợi giàu protein và carb phức hợp cho người bận rộn.', 380, 35.0, 38.0, 9.0, 10, 1, 'Dễ', ARRAY['Tăng cơ', 'Dưới 15 phút', 'Tất cả'], '1. Nướng nóng vỏ bánh wrap. 2. Trải xà lách, dưa leo, gà áp chảo. 3. Phết sốt sữa chua và cuộn chặt.'),
('🥩 Bò bít tết măng tây & khoai lang nướng', 'Thịt bò giàu kẽm, creatine tự nhiên kết hợp măng tây và khoai lang hỗ trợ tăng cơ bắp.', 520, 45.0, 42.0, 14.0, 25, 1, 'Trung bình', ARRAY['Tăng cơ', 'Tất cả'], '1. Nướng khoai lang. 2. Áp chảo thịt thăn bò chín medium. 3. Xào sơ măng tây với tiêu đen.'),
('🐟 Cá hồi áp chảo sốt chanh leo & cơm gạo lứt', 'Nguồn axit béo Omega-3 dồi dào giảm viêm cơ bắp, kết hợp cơm gạo lứt chuyển hóa chậm.', 490, 38.0, 40.0, 18.0, 20, 1, 'Dễ', ARRAY['Tăng cơ', 'Giảm mỡ', 'Tất cả'], '1. Áp chảo cá hồi giòn da. 2. Nấu sốt chanh leo chua ngọt nhẹ. 3. Dùng kèm cơm gạo lứt nóng.'),
('🍳 Trứng cuộn rau củ phô mai ít béo', 'Bữa sáng nhanh gọn với lòng trắng trứng giàu protein tinh khiết và rau củ.', 310, 26.0, 8.0, 16.0, 10, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Dưới 15 phút', 'Tất cả'], '1. Đánh trứng cùng ớt chuông, hành tây băm. 2. Đổ chảo chống dính, xếp phô mai rồi cuộn tròn.'),
('🍚 Cơm gạo lứt bò xào ớt chuông', 'Bữa ăn Meal Prep truyền thống cung cấp năng lượng bùng nổ trước và sau tập.', 480, 42.0, 48.0, 11.0, 15, 1, 'Dễ', ARRAY['Tăng cơ', 'Tất cả'], '1. Xào nhanh thịt bò với tỏi trên lửa lớn. 2. Cho ớt chuông 3 màu đảo giòn. 3. Ăn cùng gạo lứt.'),
('🍜 Bún nưa ức gà sốt mè rang (Shirataki Lean Bowl)', 'Cứu cánh mùa siết cân, bún nưa gần như 0 calo giúp no căng bụng mà không lo dư mỡ.', 260, 34.0, 12.0, 6.0, 12, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Dưới 15 phút', 'Tất cả'], '1. Trần bún nưa qua nước sôi. 2. Xếp dưa leo, rau thơm và ức gà xé lên trên. 3. Chan sốt mè.'),
('🥣 Cháo yến mạch ức gà nấm hương', 'Yến mạch nấu nhuyễn cùng gà nấm đậm đà, bổ sung Glycogen dự trữ cho cơ bắp.', 360, 36.0, 42.0, 6.0, 12, 1, 'Dễ', ARRAY['Tăng cơ', 'Giảm mỡ', 'Dưới 15 phút', 'Tất cả'], '1. Đun sôi yến mạch với nước dùng gà 5 phút. 2. Cho ức gà băm và nấm hương đun chín mềm.'),
('🌱 Đậu hũ sốt cà chua nấm đông cô', 'Món chay giàu Isoflavone và đạm thực vật lành mạnh, thanh lọc cơ thể.', 310, 24.0, 20.0, 12.0, 15, 1, 'Dễ', ARRAY['Ăn chay', 'Giảm mỡ', 'Ít calo', 'Tất cả'], '1. Cắt quân cờ đậu hũ áp chảo. 2. Sốt cà chua nhuyễn cùng nấm đông cô rồi rim đậu hũ ngấm vị.'),
('🥗 Salad đậu gà Địa Trung Hải', 'Siêu thực phẩm đậu gà giàu chất xơ hòa tan và protein thực vật mát lành.', 340, 18.0, 46.0, 8.0, 10, 1, 'Dễ', ARRAY['Ăn chay', 'Ít calo', 'Dưới 15 phút', 'Tất cả'], '1. Trộn đậu gà luộc cùng dưa chuột, cà chua bi cắt nhỏ. 2. Rưới nước cốt chanh và dầu ô liu.'),
('🦐 Tôm áp chảo bơ tỏi & súp lơ nghiền', 'Protein từ tôm kết hợp súp lơ trắng giả khoai tây nghiền cực ít carb chuẩn chế độ Lean.', 290, 36.0, 10.0, 9.0, 12, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Dưới 15 phút', 'Tất cả'], '1. Hấp và xay nhuyễn súp lơ trắng làm đế sốt. 2. Áp chảo tôm với bơ tỏi vàng thơm bày lên trên.'),
('🥪 Bánh mì đen kẹp cá ngừ ngô ngọt', 'Bữa phụ tiện lợi giàu protein tiện mang đi làm hoặc ăn trước giờ tập gym.', 390, 38.0, 42.0, 6.0, 8, 1, 'Dễ', ARRAY['Tăng cơ', 'Dưới 15 phút', 'Tất cả'], '1. Trộn cá ngừ hộp chắt ráo với ngô ngọt và xốt ít béo. 2. Kẹp cùng rau xà lách giữa 2 lát bánh mì đen.'),
('🥤 Sinh tố Protein chuối yến mạch bơ đậu phộng', 'Ly sinh tố năng lượng phục hồi cơ bắp thần tốc ngay sau buổi nâng tạ.', 480, 38.0, 54.0, 12.0, 5, 1, 'Dễ', ARRAY['Tăng cơ', 'Dưới 15 phút', 'Tất cả'], '1. Cho whey, sữa tươi, chuối, yến mạch, bơ đậu phộng vào máy xay. 2. Xay nhuyễn với đá viên.'),
('🌱 Cơm gạo lứt đậu phụ áp chảo xốt tương gừng', 'Thực đơn thuần chay cân bằng amino acid hoàn chỉnh giữa đậu nành và ngũ cốc thô.', 430, 28.0, 52.0, 11.0, 15, 1, 'Dễ', ARRAY['Ăn chay', 'Tăng cơ', 'Tất cả'], '1. Áp chảo đậu hũ và luộc đậu edamame. 2. Rưới xốt tương gừng và rắc mè rang lên cơm gạo lứt.'),
('🍲 Canh rong biển bò băm đậu hũ non', 'Canh rong biển bổ sung khoáng chất, iod và canxi quý giá cho khớp xương gymer.', 250, 30.0, 8.0, 9.0, 15, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Tất cả'], '1. Xào sơ thịt bò băm với tỏi. 2. Đổ nước sôi, thả rong biển và đậu hũ non nấu sôi nhẹ 3 phút.'),
('🍗 Má đùi gà nướng thảo mộc khoai tây bi', 'Má đùi gà mọng nước, giàu sắt và protein kết hợp khoai tây nướng giòn thơm.', 510, 46.0, 40.0, 14.0, 25, 1, 'Trung bình', ARRAY['Tăng cơ', 'Tất cả'], '1. Ướp gà với hương thảo, tiêu, dầu ô liu. 2. Cho vào nồi chiên không dầu cùng khoai tây bi 180°C.'),
('🥗 Salad cá ngừ trứng luộc xốt chanh dây', 'Bữa ăn siết cơ thanh khiết kết hợp hai nguồn đạm chất lượng cao là trứng và cá ngừ.', 330, 36.0, 12.0, 11.0, 10, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Dưới 15 phút', 'Tất cả'], '1. Luộc trứng lòng đào 6 phút rồi cắt đôi. 2. Trộn xà lách, dưa leo, cá ngừ cùng xốt chanh dây.'),
('🥣 Sữa chua Hy Lạp hạt chia việt quất Granola', 'Bữa tráng miệng hoặc bữa phụ buổi tối hỗ trợ tiêu hóa và phục hồi cơ ban đêm với Casein tự nhiên.', 310, 25.0, 36.0, 6.0, 5, 1, 'Dễ', ARRAY['Giảm mỡ', 'Ít calo', 'Dưới 15 phút', 'Ăn chay', 'Tất cả'], '1. Múc sữa chua Hy Lạp vào tô. 2. Rải việt quất tươi, hạt chia và ngũ cốc giòn lên trên cùng.')
ON CONFLICT (title) DO UPDATE SET
  description = EXCLUDED.description,
  kcal = EXCLUDED.kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  cooking_time_min = EXCLUDED.cooking_time_min,
  servings = EXCLUDED.servings,
  difficulty = EXCLUDED.difficulty,
  tags = EXCLUDED.tags,
  instructions = EXCLUDED.instructions;

-- =========================================================================
-- SEED DATA: LIÊN KẾT NGUYÊN LIỆU CHO 20 MÓN ĂN (RECIPE_INGREDIENTS)
-- =========================================================================
DELETE FROM recipe_ingredients;

-- 1. Ức gà áp chảo sốt cam
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 250, 'g', 'Cắt lát vừa ăn' FROM recipes r, ingredients i WHERE r.title = '🍗 Ức gà áp chảo sốt cam' AND i.name = 'Ức gà không da';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 100, 'g', 'Vắt lấy nước cốt' FROM recipes r, ingredients i WHERE r.title = '🍗 Ức gà áp chảo sốt cam' AND i.name = 'Cam tươi';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 5, 'ml', 'Dùng áp chảo' FROM recipes r, ingredients i WHERE r.title = '🍗 Ức gà áp chảo sốt cam' AND i.name = 'Dầu ô liu nguyên chất';

-- 2. Salad ức gà & bông cải xanh
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 180, 'g', 'Áp chảo hoặc luộc' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad ức gà & bông cải xanh' AND i.name = 'Ức gà không da';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 150, 'g', 'Cắt bông nhỏ luộc sơ' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad ức gà & bông cải xanh' AND i.name = 'Bông cải xanh (Broccoli)';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 80, 'g', 'Rửa sạch cắt khúc' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad ức gà & bông cải xanh' AND i.name = 'Xà lách Romaine';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 50, 'g', 'Bổ đôi' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad ức gà & bông cải xanh' AND i.name = 'Cà chua bi';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 7, 'ml', 'Trộn xốt' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad ức gà & bông cải xanh' AND i.name = 'Dầu ô liu nguyên chất';

-- 3. Soup gà rau củ nấm giải nhiệt
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 150, 'g', 'Xé sợi nhỏ' FROM recipes r, ingredients i WHERE r.title = '🍲 Soup gà rau củ nấm giải nhiệt' AND i.name = 'Ức gà không da';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 50, 'g', 'Thái lát' FROM recipes r, ingredients i WHERE r.title = '🍲 Soup gà rau củ nấm giải nhiệt' AND i.name = 'Nấm hương tươi';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 40, 'g', 'Cắt hạt lựu' FROM recipes r, ingredients i WHERE r.title = '🍲 Soup gà rau củ nấm giải nhiệt' AND i.name = 'Cà rốt';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 30, 'g', 'Hạt ngô ngọt' FROM recipes r, ingredients i WHERE r.title = '🍲 Soup gà rau củ nấm giải nhiệt' AND i.name = 'Bắp ngọt tách hạt';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 1, 'quả', 'Đánh tan tạo vân' FROM recipes r, ingredients i WHERE r.title = '🍲 Soup gà rau củ nấm giải nhiệt' AND i.name = 'Trứng gà';

-- 4. Wrap ức gà ngũ cốc sốt sữa chua Hy Lạp
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 1, 'cái', '50g' FROM recipes r, ingredients i WHERE r.title = '🌯 Wrap ức gà ngũ cốc sốt sữa chua Hy Lạp' AND i.name = 'Bánh wrap nguyên cám';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 150, 'g', 'Thái lát áp chảo' FROM recipes r, ingredients i WHERE r.title = '🌯 Wrap ức gà ngũ cốc sốt sữa chua Hy Lạp' AND i.name = 'Ức gà không da';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 40, 'g', 'Phết lòng bánh' FROM recipes r, ingredients i WHERE r.title = '🌯 Wrap ức gà ngũ cốc sốt sữa chua Hy Lạp' AND i.name = 'Sữa chua Hy Lạp không đường';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 40, 'g', 'Thái thanh mỏng' FROM recipes r, ingredients i WHERE r.title = '🌯 Wrap ức gà ngũ cốc sốt sữa chua Hy Lạp' AND i.name = 'Dưa leo';

-- 5. Bò bít tết măng tây & khoai lang nướng
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 200, 'g', 'Áp chảo tiêu đen' FROM recipes r, ingredients i WHERE r.title = '🥩 Bò bít tết măng tây & khoai lang nướng' AND i.name = 'Thịt thăn bò nạc';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 150, 'g', 'Nướng vàng' FROM recipes r, ingredients i WHERE r.title = '🥩 Bò bít tết măng tây & khoai lang nướng' AND i.name = 'Khoai lang mật';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 100, 'g', 'Xào sơ' FROM recipes r, ingredients i WHERE r.title = '🥩 Bò bít tết măng tây & khoai lang nướng' AND i.name = 'Măng tây';

-- 6. Cá hồi áp chảo sốt chanh leo & cơm gạo lứt
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 180, 'g', 'Áp chảo' FROM recipes r, ingredients i WHERE r.title = '🐟 Cá hồi áp chảo sốt chanh leo & cơm gạo lứt' AND i.name = 'Phi lê cá hồi';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 130, 'g', 'Nấu chín' FROM recipes r, ingredients i WHERE r.title = '🐟 Cá hồi áp chảo sốt chanh leo & cơm gạo lứt' AND i.name = 'Gạo lứt';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 80, 'g', 'Hấp giòn' FROM recipes r, ingredients i WHERE r.title = '🐟 Cá hồi áp chảo sốt chanh leo & cơm gạo lứt' AND i.name = 'Măng tây';

-- 7. Trứng cuộn rau củ phô mai ít béo
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 3, 'quả', 'Đánh đều' FROM recipes r, ingredients i WHERE r.title = '🍳 Trứng cuộn rau củ phô mai ít béo' AND i.name = 'Trứng gà';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 40, 'g', 'Băm hạt lựu' FROM recipes r, ingredients i WHERE r.title = '🍳 Trứng cuộn rau củ phô mai ít béo' AND i.name = 'Ớt chuông 3 màu';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 1, 'lát', '20g' FROM recipes r, ingredients i WHERE r.title = '🍳 Trứng cuộn rau củ phô mai ít béo' AND i.name = 'Phô mai lát ít béo';

-- 8. Cơm gạo lứt bò xào ớt chuông
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 180, 'g', 'Thái mỏng ướp tỏi' FROM recipes r, ingredients i WHERE r.title = '🍚 Cơm gạo lứt bò xào ớt chuông' AND i.name = 'Thịt thăn bò nạc';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 130, 'g', 'Nấu chín' FROM recipes r, ingredients i WHERE r.title = '🍚 Cơm gạo lứt bò xào ớt chuông' AND i.name = 'Gạo lứt';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 100, 'g', 'Cắt miếng vuông' FROM recipes r, ingredients i WHERE r.title = '🍚 Cơm gạo lứt bò xào ớt chuông' AND i.name = 'Ớt chuông 3 màu';

-- 9. Bún nưa ức gà sốt mè rang
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 200, 'g', 'Rửa sạch trần sơ' FROM recipes r, ingredients i WHERE r.title = '🍜 Bún nưa ức gà sốt mè rang (Shirataki Lean Bowl)' AND i.name = 'Bún nưa Konjac';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 160, 'g', 'Luộc xé sợi' FROM recipes r, ingredients i WHERE r.title = '🍜 Bún nưa ức gà sốt mè rang (Shirataki Lean Bowl)' AND i.name = 'Ức gà không da';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 60, 'g', 'Nạo sợi' FROM recipes r, ingredients i WHERE r.title = '🍜 Bún nưa ức gà sốt mè rang (Shirataki Lean Bowl)' AND i.name = 'Dưa leo';

-- 10. Cháo yến mạch ức gà nấm hương
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 50, 'g', 'Nấu nở' FROM recipes r, ingredients i WHERE r.title = '🥣 Cháo yến mạch ức gà nấm hương' AND i.name = 'Yến mạch cán dẹt';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 150, 'g', 'Băm nhuyễn' FROM recipes r, ingredients i WHERE r.title = '🥣 Cháo yến mạch ức gà nấm hương' AND i.name = 'Ức gà không da';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 50, 'g', 'Thái nhỏ' FROM recipes r, ingredients i WHERE r.title = '🥣 Cháo yến mạch ức gà nấm hương' AND i.name = 'Nấm hương tươi';

-- 11. Đậu hũ sốt cà chua nấm đông cô
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 250, 'g', 'Cắt quân cờ áp chảo' FROM recipes r, ingredients i WHERE r.title = '🌱 Đậu hũ sốt cà chua nấm đông cô' AND i.name = 'Đậu hũ trắng';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 150, 'g', 'Băm nhỏ xào sốt' FROM recipes r, ingredients i WHERE r.title = '🌱 Đậu hũ sốt cà chua nấm đông cô' AND i.name = 'Cà chua bi';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 60, 'g', 'Thái lát' FROM recipes r, ingredients i WHERE r.title = '🌱 Đậu hũ sốt cà chua nấm đông cô' AND i.name = 'Nấm đông cô tươi';

-- 12. Salad đậu gà Địa Trung Hải
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 180, 'g', 'Luộc mềm' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad đậu gà Địa Trung Hải' AND i.name = 'Đậu gà (Chickpeas)';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 60, 'g', 'Thái hạt lựu' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad đậu gà Địa Trung Hải' AND i.name = 'Dưa leo';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 50, 'g', 'Bổ đôi' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad đậu gà Địa Trung Hải' AND i.name = 'Cà chua bi';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 6, 'ml', 'Trộn' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad đậu gà Địa Trung Hải' AND i.name = 'Dầu ô liu nguyên chất';

-- 13. Tôm áp chảo bơ tỏi & súp lơ nghiền
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 200, 'g', 'Bóc nõn áp chảo' FROM recipes r, ingredients i WHERE r.title = '🦐 Tôm áp chảo bơ tỏi & súp lơ nghiền' AND i.name = 'Tôm sú bóc vỏ';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 200, 'g', 'Hấp chín xay nhuyễn' FROM recipes r, ingredients i WHERE r.title = '🦐 Tôm áp chảo bơ tỏi & súp lơ nghiền' AND i.name = 'Súp lơ trắng (Cauliflower)';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 7, 'g', 'Đun chảy phi tỏi' FROM recipes r, ingredients i WHERE r.title = '🦐 Tôm áp chảo bơ tỏi & súp lơ nghiền' AND i.name = 'Bơ lạt tự nhiên';

-- 14. Bánh mì đen kẹp cá ngừ ngô ngọt
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 2, 'lát', '60g' FROM recipes r, ingredients i WHERE r.title = '🥪 Bánh mì đen kẹp cá ngừ ngô ngọt' AND i.name = 'Bánh mì đen nguyên cám';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 120, 'g', 'Chắt ráo nước' FROM recipes r, ingredients i WHERE r.title = '🥪 Bánh mì đen kẹp cá ngừ ngô ngọt' AND i.name = 'Cá ngừ ngâm nước';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 30, 'g', 'Hấp chín' FROM recipes r, ingredients i WHERE r.title = '🥪 Bánh mì đen kẹp cá ngừ ngô ngọt' AND i.name = 'Bắp ngọt tách hạt';

-- 15. Sinh tố Protein chuối yến mạch bơ đậu phộng
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 30, 'g', '1 scoop' FROM recipes r, ingredients i WHERE r.title = '🥤 Sinh tố Protein chuối yến mạch bơ đậu phộng' AND i.name = 'Whey Protein Isolate';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 250, 'ml', 'Xay cùng' FROM recipes r, ingredients i WHERE r.title = '🥤 Sinh tố Protein chuối yến mạch bơ đậu phộng' AND i.name = 'Sữa tươi không đường';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 100, 'g', '1 quả chuối' FROM recipes r, ingredients i WHERE r.title = '🥤 Sinh tố Protein chuối yến mạch bơ đậu phộng' AND i.name = 'Chuối tiêu chín';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 30, 'g', 'Cho vào máy xay' FROM recipes r, ingredients i WHERE r.title = '🥤 Sinh tố Protein chuối yến mạch bơ đậu phộng' AND i.name = 'Yến mạch cán dẹt';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 15, 'g', 'Béo tốt' FROM recipes r, ingredients i WHERE r.title = '🥤 Sinh tố Protein chuối yến mạch bơ đậu phộng' AND i.name = 'Bơ đậu phộng nguyên chất';

-- 16. Cơm gạo lứt đậu phụ áp chảo xốt tương gừng
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 220, 'g', 'Áp chảo vàng giòn' FROM recipes r, ingredients i WHERE r.title = '🌱 Cơm gạo lứt đậu phụ áp chảo xốt tương gừng' AND i.name = 'Đậu hũ trắng';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 140, 'g', 'Nấu chín' FROM recipes r, ingredients i WHERE r.title = '🌱 Cơm gạo lứt đậu phụ áp chảo xốt tương gừng' AND i.name = 'Gạo lứt';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 50, 'g', 'Luộc chín' FROM recipes r, ingredients i WHERE r.title = '🌱 Cơm gạo lứt đậu phụ áp chảo xốt tương gừng' AND i.name = 'Đậu nành Edamame';

-- 17. Canh rong biển bò băm đậu hũ non
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 120, 'g', 'Băm nhuyễn xào sơ' FROM recipes r, ingredients i WHERE r.title = '🍲 Canh rong biển bò băm đậu hũ non' AND i.name = 'Thịt thăn bò nạc';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 15, 'g', 'Ngâm nở ra' FROM recipes r, ingredients i WHERE r.title = '🍲 Canh rong biển bò băm đậu hũ non' AND i.name = 'Rong biển khô';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 100, 'g', 'Cắt miếng nhỏ thả sau cùng' FROM recipes r, ingredients i WHERE r.title = '🍲 Canh rong biển bò băm đậu hũ non' AND i.name = 'Đậu hũ trắng';

-- 18. Má đùi gà nướng thảo mộc khoai tây bi
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 220, 'g', 'Lọc da và mỡ thừa' FROM recipes r, ingredients i WHERE r.title = '🍗 Má đùi gà nướng thảo mộc khoai tây bi' AND i.name = 'Má đùi gà bỏ da';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 150, 'g', 'Bổ đôi nướng giòn' FROM recipes r, ingredients i WHERE r.title = '🍗 Má đùi gà nướng thảo mộc khoai tây bi' AND i.name = 'Khoai tây';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 6, 'ml', 'Quét mặt gà' FROM recipes r, ingredients i WHERE r.title = '🍗 Má đùi gà nướng thảo mộc khoai tây bi' AND i.name = 'Dầu ô liu nguyên chất';

-- 19. Salad cá ngừ trứng luộc xốt chanh dây
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 120, 'g', 'Chắt ráo nước' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad cá ngừ trứng luộc xốt chanh dây' AND i.name = 'Cá ngừ ngâm nước';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 1, 'quả', 'Luộc lòng đào 6p' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad cá ngừ trứng luộc xốt chanh dây' AND i.name = 'Trứng gà';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 80, 'g', 'Xắt miếng' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad cá ngừ trứng luộc xốt chanh dây' AND i.name = 'Xà lách Romaine';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 40, 'g', 'Thái lát' FROM recipes r, ingredients i WHERE r.title = '🥗 Salad cá ngừ trứng luộc xốt chanh dây' AND i.name = 'Dưa leo';

-- 20. Sữa chua Hy Lạp hạt chia việt quất Granola
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 200, 'g', 'Đế dinh dưỡng' FROM recipes r, ingredients i WHERE r.title = '🥣 Sữa chua Hy Lạp hạt chia việt quất Granola' AND i.name = 'Sữa chua Hy Lạp không đường';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 50, 'g', 'Tươi ngọt thanh' FROM recipes r, ingredients i WHERE r.title = '🥣 Sữa chua Hy Lạp hạt chia việt quất Granola' AND i.name = 'Việt quất tươi';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit, notes)
SELECT r.id, i.id, i.name, 10, 'g', 'Rắc đều' FROM recipes r, ingredients i WHERE r.title = '🥣 Sữa chua Hy Lạp hạt chia việt quất Granola' AND i.name = 'Hạt chia';

-- =========================================================================
-- SEED DATA: HỆ SỐ MEAL PREP SỐNG - CHÍN (INGREDIENT_YIELD_FACTORS)
-- =========================================================================
INSERT INTO ingredient_yield_factors (ingredient_name, cooking_method, raw_to_cooked_factor, source) VALUES
('Ức gà', 'Áp chảo', 0.80, 'USDA Food Data - Chicken breast pan-seared'),
('Ức gà', 'Luộc / Hấp', 0.75, 'USDA Food Data - Chicken breast boiled'),
('Thịt thăn bò', 'Áp chảo Medium', 0.75, 'USDA Beef loin pan-broiled'),
('Phi lê cá hồi', 'Áp chảo / Nướng', 0.82, 'Salmon fillet cooked yield'),
('Gạo lứt', 'Nấu cơm', 2.30, 'Brown rice cooked absorption'),
('Khoai lang', 'Hấp / Luộc', 0.95, 'Sweet potato boiled yield'),
('Yến mạch', 'Nấu cháo', 3.00, 'Rolled oats porridge absorption'),
('Bông cải xanh', 'Luộc / Hấp', 0.90, 'Broccoli steamed yield')
ON CONFLICT DO NOTHING;
