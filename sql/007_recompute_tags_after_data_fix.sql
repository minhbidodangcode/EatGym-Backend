-- 007_recompute_tags_after_data_fix.sql
-- Sau khi backfill_v4.cjs sửa kcal/protein/fat của 64 món + 8 món, TOÀN BỘ tag
-- phải được dẫn xuất lại từ số liệu mới (tag cũ gắn theo macro cũ đã lỗi thời).
-- Idempotent: DELETE toàn bộ rồi INSERT lại theo rule; chạy nhiều lần vẫn cho cùng kết quả.

BEGIN;

-- 1. Xoá sạch để re-derive (nguồn sự thật là công thức số học, không phải lịch sử)
DELETE FROM recipe_tags;

-- 2. Re-derive từng tag theo rule chuẩn (giống 006, nhưng chạy trên dữ liệu đã sửa)
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'tang-co' FROM recipes WHERE protein_g >= 25;

INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'giam-mo' FROM recipes WHERE kcal <= 460 AND fat_g <= 16 AND protein_g >= 10;

INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'it-calo' FROM recipes WHERE kcal <= 360;

INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'duoi-15-phut' FROM recipes WHERE cooking_time_min <= 15;

INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'eat-clean' FROM recipes
WHERE (kcal <= 550 AND fat_g <= 20) OR title ILIKE '%eat clean%';

INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'high-protein' FROM recipes WHERE protein_g >= 30;

INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'low-carb' FROM recipes WHERE carbs_g <= 20;

INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT id, 'smoothie' FROM recipes
WHERE title ILIKE '%smoothie%' OR title ILIKE '%sinh tố%';

-- an-chay: không có nguyên liệu động vật (bánh phồng tôm, trứng cũng loại)
INSERT INTO recipe_tags (recipe_id, tag_slug)
SELECT r.id, 'an-chay' FROM recipes r
WHERE ('Ăn chay' = ANY(r.tags) OR r.title ILIKE '%chay%')
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id AND (
      ri.ingredient_name ILIKE '%thịt bò%' OR ri.ingredient_name ILIKE '%thịt heo%'
      OR ri.ingredient_name ILIKE '%thịt lợn%' OR ri.ingredient_name ILIKE '%thịt gà%'
      OR ri.ingredient_name ILIKE '%ức gà%'
      OR (ri.ingredient_name ILIKE '%đùi gà%' AND ri.ingredient_name NOT ILIKE '%nấm%')
      OR ri.ingredient_name ILIKE '%cánh gà%' OR ri.ingredient_name ILIKE '%sườn%'
      OR ri.ingredient_name ILIKE '%thịt băm%' OR ri.ingredient_name ILIKE '%thịt bằm%'
      OR ri.ingredient_name ILIKE '%tôm%' OR ri.ingredient_name ILIKE 'cá %'
      OR ri.ingredient_name ILIKE '% cá %' OR ri.ingredient_name ILIKE '%mực%'
      OR ri.ingredient_name ILIKE '%cua%' OR ri.ingredient_name ILIKE '%ghẹ%'
      OR ri.ingredient_name ILIKE '%hải sâm%' OR ri.ingredient_name ILIKE '%ba khía%'
      OR ri.ingredient_name ILIKE '%xúc xích%' OR ri.ingredient_name ILIKE '%giăm bông%'
      OR ri.ingredient_name ILIKE '%bacon%' OR ri.ingredient_name ILIKE '%pate%'
      OR ri.ingredient_name ILIKE '%pa-tê%'
      OR (ri.ingredient_name ILIKE '%huyết%' AND ri.ingredient_name NOT ILIKE '%huyết rồng%')
      OR (ri.ingredient_name ILIKE '%lòng%' AND ri.ingredient_name NOT ILIKE '%xanh lòng%')
      OR ri.ingredient_name ILIKE '%bánh phồng tôm%'
      OR ri.ingredient_name ILIKE '%trứng gà%' OR ri.ingredient_name ILIKE '%trứng vịt%'
      OR ri.ingredient_name ILIKE '%trứng cút%'
      OR ri.ingredient_name ILIKE '%thịt vịt%' OR ri.ingredient_name ILIKE '%lạp xưởng%'
      OR ri.ingredient_name ILIKE '%chả lụa%' OR ri.ingredient_name ILIKE '%chả bò%'
      OR ri.ingredient_name ILIKE '%nem chua%' OR ri.ingredient_name ILIKE '%mắm tôm%'
    )
  );

-- 3. Đồng bộ lại cờ dẫn xuất trên bảng recipes
UPDATE recipes SET is_vegetarian = FALSE;
UPDATE recipes SET is_vegetarian = TRUE
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

COMMIT;

-- =========================================================================
-- BẤT BIẾN SAU KHI CHẠY (verify bằng SQL, không hardcode):
-- - Mỗi tag_slug có 0 dòng vi phạm rule số học của nó.
-- - is_vegetarian = TRUE  <=>  có tag an-chay.
-- - Tổng số recipes không đổi (4002).
-- - Không còn recipes nào thiếu recipe_ingredients.
-- =========================================================================