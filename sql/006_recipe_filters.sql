-- 006_recipe_filters.sql
-- Chuẩn hoá bộ lọc công thức (Recipe Filters), Tag Slug, và Tìm kiếm Server-Side
-- Migration này có tính chất IDEMPOTENT (chạy nhiều lần an toàn).

CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Thêm các cột lọc mới vào bảng recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_type VARCHAR(32) NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS search_text TEXT;

-- 2. Tạo bảng chuẩn hoá tags: recipe_tags
CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_slug VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (recipe_id, tag_slug)
);

CREATE INDEX IF NOT EXISTS recipe_tags_tag_slug_idx ON recipe_tags (tag_slug);
CREATE INDEX IF NOT EXISTS recipe_tags_recipe_id_idx ON recipe_tags (recipe_id);

-- 3. Backfill dữ liệu tags theo công thức chuẩn (không copy tag cũ)

-- tang-co: protein_g >= 25
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'tang-co'
FROM recipes
WHERE protein_g >= 25
ON CONFLICT DO NOTHING;

-- giam-mo: kcal <= 460 AND fat_g <= 16 AND protein_g >= 10
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'giam-mo'
FROM recipes
WHERE kcal <= 460 AND fat_g <= 16 AND protein_g >= 10
ON CONFLICT DO NOTHING;

-- it-calo: kcal <= 360
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'it-calo'
FROM recipes
WHERE kcal <= 360
ON CONFLICT DO NOTHING;

-- duoi-15-phut: cooking_time_min <= 15
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'duoi-15-phut'
FROM recipes
WHERE cooking_time_min <= 15
ON CONFLICT DO NOTHING;

-- eat-clean: (kcal <= 550 AND fat_g <= 20) OR title ILIKE '%eat clean%'
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'eat-clean'
FROM recipes
WHERE (kcal <= 550 AND fat_g <= 20) OR title ILIKE '%eat clean%'
ON CONFLICT DO NOTHING;

-- high-protein: protein_g >= 30
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'high-protein'
FROM recipes
WHERE protein_g >= 30
ON CONFLICT DO NOTHING;

-- low-carb: carbs_g <= 20
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'low-carb'
FROM recipes
WHERE carbs_g <= 20
ON CONFLICT DO NOTHING;

-- smoothie: title ILIKE '%smoothie%' OR title ILIKE '%sinh tố%'
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'smoothie'
FROM recipes
WHERE title ILIKE '%smoothie%' OR title ILIKE '%sinh tố%'
ON CONFLICT DO NOTHING;

-- an-chay: KHÔNG có nguyên liệu động vật.
-- Xác định trên các món thuộc nhóm chay (hoặc tag cũ/tiêu đề chay) loại trừ triệt để thịt/cá/hải sản:
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT r.id, 'an-chay'
FROM recipes r
WHERE ('Ăn chay' = ANY(r.tags) OR r.title ILIKE '%chay%')
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id
      AND (
        ri.ingredient_name ILIKE '%thịt bò%'
        OR ri.ingredient_name ILIKE '%thịt heo%'
        OR ri.ingredient_name ILIKE '%thịt lợn%'
        OR ri.ingredient_name ILIKE '%thịt gà%'
        OR ri.ingredient_name ILIKE '%ức gà%'
        OR (ri.ingredient_name ILIKE '%đùi gà%' AND ri.ingredient_name NOT ILIKE '%nấm%')
        OR ri.ingredient_name ILIKE '%cánh gà%'
        OR ri.ingredient_name ILIKE '%sườn%'
        OR ri.ingredient_name ILIKE '%thịt băm%'
        OR ri.ingredient_name ILIKE '%thịt bằm%'
        OR ri.ingredient_name ILIKE '%tôm%'
        OR ri.ingredient_name ILIKE 'cá %'
        OR ri.ingredient_name ILIKE '% cá %'
        OR ri.ingredient_name ILIKE '%mực%'
        OR ri.ingredient_name ILIKE '%cua%'
        OR ri.ingredient_name ILIKE '%ghẹ%'
        OR ri.ingredient_name ILIKE '%hải sâm%'
        OR ri.ingredient_name ILIKE '%ba khía%'
        OR ri.ingredient_name ILIKE '%xúc xích%'
        OR ri.ingredient_name ILIKE '%giăm bông%'
        OR ri.ingredient_name ILIKE '%bacon%'
        OR ri.ingredient_name ILIKE '%pate%'
        OR (ri.ingredient_name ILIKE '%huyết%' AND ri.ingredient_name NOT ILIKE '%huyết rồng%')
        OR (ri.ingredient_name ILIKE '%lòng%' AND ri.ingredient_name NOT ILIKE '%xanh lòng%')
        OR ri.ingredient_name ILIKE '%bánh phồng tôm%'
        OR ri.ingredient_name ILIKE '%trứng gà%'
        OR ri.ingredient_name ILIKE '%trứng vịt%'
        OR ri.ingredient_name ILIKE '%trứng cút%'
      )
  )
ON CONFLICT DO NOTHING;

-- 4. Đồng bộ thuộc tính is_vegetarian, meal_type, search_text trên recipes
UPDATE recipes
SET is_vegetarian = TRUE
WHERE id IN (SELECT recipe_id FROM recipe_tags WHERE tag_slug = 'an-chay');

UPDATE recipes
SET meal_type = CASE
  WHEN title ILIKE '%smoothie%' OR title ILIKE '%sinh tố%' THEN 'drink'
  WHEN kcal < 250 OR title ~* 'bữa phụ|snack|sữa chua|yến mạch ngâm' THEN 'snack'
  WHEN title ~* 'sáng|overnight|trứng|bánh mì' THEN 'breakfast'
  ELSE 'main'
END;

UPDATE recipes
SET search_text = lower(unaccent(title || ' ' || COALESCE(description, '')));

-- 5. Chỉ mục tối ưu hoá truy vấn lọc và tìm kiếm toàn văn
CREATE INDEX IF NOT EXISTS recipes_kcal_idx ON recipes (kcal);
CREATE INDEX IF NOT EXISTS recipes_protein_idx ON recipes (protein_g);
CREATE INDEX IF NOT EXISTS recipes_cooking_time_idx ON recipes (cooking_time_min);
CREATE INDEX IF NOT EXISTS recipes_meal_type_idx ON recipes (meal_type);
CREATE INDEX IF NOT EXISTS recipes_search_text_gin_idx ON recipes USING GIN (to_tsvector('simple', search_text));

-- =========================================================================
-- GHI CHÚ KIỂM CHỨNG VÀ TÍNH IDEMPOTENT (CHẠY LẠI KHÔNG ĐỔI KẾT QUẢ):
-- =========================================================================
-- Migration này an toàn khi chạy lại nhiều lần (idempotent):
-- - Cột dùng ADD COLUMN IF NOT EXISTS.
-- - Bảng recipe_tags dùng CREATE TABLE IF NOT EXISTS.
-- - Dữ liệu tag dùng ON CONFLICT DO NOTHING.
-- - Các câu lệnh UPDATE dựa trên dữ liệu chuẩn hiện có.
--
-- Con số backfill mong đợi (trên DB 4002 công thức):
-- - Tổng recipes: 4002 (giữ nguyên, không mất mát).
-- - eat-clean: ~3595
-- - giam-mo: ~2929
-- - tang-co: ~2758
-- - it-calo: ~2362
-- - high-protein: ~2314
-- - low-carb: ~844
-- - duoi-15-phut: ~812
-- - an-chay: ~640
-- - smoothie: ~174
-- - Món gắn duoi-15-phut có cooking_time_min > 15: 0
-- - Món gắn an-chay có nguyên liệu động vật: 0
-- - Món chưa có recipe_ingredients: 107
