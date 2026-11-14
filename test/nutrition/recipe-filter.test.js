// EatGym-Backend/test/nutrition/recipe-filter.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTagSlug,
  buildRecipeFilterQuery,
  TAG_METADATA,
  MEAL_TYPE_METADATA,
} from '../../src/nutrition/recipe-filter.js';

test('normalizeTagSlug converts Vietnamese diacritics and aliases to standard slugs', () => {
  assert.equal(normalizeTagSlug('Tăng cơ'), 'tang-co');
  assert.equal(normalizeTagSlug('Giảm mỡ'), 'giam-mo');
  assert.equal(normalizeTagSlug('Ít calo'), 'it-calo');
  assert.equal(normalizeTagSlug('Dưới 15 phút'), 'duoi-15-phut');
  assert.equal(normalizeTagSlug('Dưới 15p'), 'duoi-15-phut');
  assert.equal(normalizeTagSlug('High Protein'), 'high-protein');
  assert.equal(normalizeTagSlug('High-Pro'), 'high-protein');
  assert.equal(normalizeTagSlug('Eat Clean'), 'eat-clean');
  assert.equal(normalizeTagSlug('Ăn chay'), 'an-chay');
  assert.equal(normalizeTagSlug('Smoothie'), 'smoothie');
  assert.equal(normalizeTagSlug('Sinh tố'), 'smoothie');
  assert.equal(normalizeTagSlug('Low Carb'), 'low-carb');
  assert.equal(normalizeTagSlug('Gluten Free'), 'gluten-free');
  assert.equal(normalizeTagSlug('Tất cả'), 'tat-ca');
});

test('normalizeTagSlug strips UI emoji prefixes cleanly', () => {
  assert.equal(normalizeTagSlug('🔥 Giảm mỡ'), 'giam-mo');
  assert.equal(normalizeTagSlug('💪 Tăng cơ'), 'tang-co');
  assert.equal(normalizeTagSlug('🍗 High-Pro'), 'high-protein');
  assert.equal(normalizeTagSlug('⏱️ Dưới 15p'), 'duoi-15-phut');
  assert.equal(normalizeTagSlug('🥦 Ăn chay'), 'an-chay');
  assert.equal(normalizeTagSlug('🥤 Smoothie'), 'smoothie');
});

test('normalizeTagSlug safely handles null, undefined, empty and invalid values', () => {
  assert.equal(normalizeTagSlug(''), '');
  assert.equal(normalizeTagSlug('   '), '');
  assert.equal(normalizeTagSlug(null), '');
  assert.equal(normalizeTagSlug(undefined), '');
  assert.equal(normalizeTagSlug(123), '');
});

test('buildRecipeFilterQuery generates defaults for empty input', () => {
  const result = buildRecipeFilterQuery({});
  assert.equal(result.whereClause, '');
  assert.deepEqual(result.params, []);
  assert.equal(result.sortClause, 'r.title ASC');
  assert.equal(result.limit, 1000);
  assert.equal(result.offset, 0);
});

test('buildRecipeFilterQuery handles text search with search_text and title', () => {
  const result = buildRecipeFilterQuery({ q: 'ức gà' });
  assert.ok(result.whereClause.includes('unaccent(r.search_text) ILIKE'));
  assert.ok(result.whereClause.includes('unaccent(r.title) ILIKE'));
  assert.deepEqual(result.params, ['ức gà']);
});

test('buildRecipeFilterQuery maps single tag and ignores "Tất cả"', () => {
  const withTag = buildRecipeFilterQuery({ tag: 'Tăng cơ' });
  assert.ok(withTag.whereClause.includes('rt.tag_slug = $1'));
  assert.deepEqual(withTag.params, ['tang-co']);

  const withAll = buildRecipeFilterQuery({ tag: 'Tất cả' });
  assert.equal(withAll.whereClause, '');
  assert.deepEqual(withAll.params, []);
});

test('buildRecipeFilterQuery supports csv tags with OR semantics and excludeTags', () => {
  const result = buildRecipeFilterQuery({
    tags: 'tang-co,high-protein',
    excludeTags: 'smoothie',
  });
  assert.ok(result.whereClause.includes('rt.tag_slug = ANY($1)'));
  assert.ok(result.whereClause.includes('NOT EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_slug = ANY($2))'));
  assert.deepEqual(result.params, [['tang-co', 'high-protein'], ['smoothie']]);
});

test('buildRecipeFilterQuery validates and filters macro and time ranges', () => {
  const result = buildRecipeFilterQuery({
    minKcal: '300',
    maxKcal: '600',
    minProtein: '25',
    maxProtein: '50',
    maxCarbs: '40',
    maxFat: '15',
    maxTime: '20',
  });
  assert.ok(result.whereClause.includes('r.kcal >= $1'));
  assert.ok(result.whereClause.includes('r.kcal <= $2'));
  assert.ok(result.whereClause.includes('r.protein_g >= $3'));
  assert.ok(result.whereClause.includes('r.protein_g <= $4'));
  assert.ok(result.whereClause.includes('r.carbs_g <= $5'));
  assert.ok(result.whereClause.includes('r.fat_g <= $6'));
  assert.ok(result.whereClause.includes('r.cooking_time_min <= $7'));
  assert.deepEqual(result.params, [300, 600, 25, 50, 40, 15, 20]);
});

test('buildRecipeFilterQuery ignores negative or garbage numeric inputs without error', () => {
  const result = buildRecipeFilterQuery({
    minKcal: '-100',
    maxKcal: 'invalid',
    minProtein: '-5',
    maxTime: '0',
  });
  assert.equal(result.whereClause, '');
  assert.deepEqual(result.params, []);
});

test('buildRecipeFilterQuery handles mealType, vegetarian, difficulty and ingredients', () => {
  const result = buildRecipeFilterQuery({
    mealType: 'breakfast,drink,invalid_type',
    vegetarian: 'true',
    difficulty: 'Dễ',
    ingredient: 'ức gà,trứng',
  });
  assert.ok(result.whereClause.includes('r.meal_type = ANY($1)'));
  assert.ok(result.whereClause.includes('r.is_vegetarian = TRUE'));
  assert.ok(result.whereClause.includes('r.difficulty = $2'));
  assert.ok(result.whereClause.includes('unaccent(ri.ingredient_name) ILIKE'));
  assert.deepEqual(result.params[0], ['breakfast', 'drink']);
  assert.equal(result.params[1], 'Dễ');
  assert.equal(result.params[2], 'ức gà');
  assert.equal(result.params[3], 'trứng');
});

test('buildRecipeFilterQuery validates sorting options and falls back to default title', () => {
  assert.equal(buildRecipeFilterQuery({ sort: 'protein_desc' }).sortClause, 'r.protein_g DESC, r.title ASC');
  assert.equal(buildRecipeFilterQuery({ sort: 'kcal_asc' }).sortClause, 'r.kcal ASC, r.title ASC');
  assert.equal(buildRecipeFilterQuery({ sort: 'time_asc' }).sortClause, 'r.cooking_time_min ASC, r.title ASC');
  assert.equal(buildRecipeFilterQuery({ sort: 'newest' }).sortClause, 'r.created_at DESC, r.title ASC');
  assert.equal(buildRecipeFilterQuery({ sort: 'unsupported_sort' }).sortClause, 'r.title ASC');
});

test('buildRecipeFilterQuery clamps limit between 1 and 5000, and ensures offset >= 0', () => {
  assert.equal(buildRecipeFilterQuery({ limit: '6000' }).limit, 5000);
  assert.equal(buildRecipeFilterQuery({ limit: '150' }).limit, 150);
  assert.equal(buildRecipeFilterQuery({ limit: '50' }).limit, 50);
  assert.equal(buildRecipeFilterQuery({ limit: '-5' }).limit, 1000);
  assert.equal(buildRecipeFilterQuery({ limit: 'abc' }).limit, 1000);
  assert.equal(buildRecipeFilterQuery({ offset: '40' }).offset, 40);
  assert.equal(buildRecipeFilterQuery({ offset: '-10' }).offset, 0);
});
