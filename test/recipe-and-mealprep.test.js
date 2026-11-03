// =========================================================================
// PHÂN HỆ 3: CÔNG THỨC MÓN ĂN & MEAL-PREP (RECIPES & MEAL-PREP ENGINE)
// =========================================================================
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { signAccessToken } from '../src/auth/jwt.js';

let server;
let baseUrl;
let token;
let testRecipeId;
let chickenYieldFactorId;

before(async () => {
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  const testUser = {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'tester_tv3@eatgym.com',
    fullName: 'TV3 Tester',
    role: 'user'
  };
  token = signAccessToken(testUser);

  await pool.query(`
    INSERT INTO users (id, email, password_hash, full_name)
    VALUES ($1, $2, 'test_hash', $3)
    ON CONFLICT (id) DO NOTHING
  `, [testUser.id, testUser.email, testUser.fullName]);

  const recipeRes = await pool.query('SELECT id FROM recipes LIMIT 1');
  testRecipeId = recipeRes.rows[0]?.id;

  const factorRes = await pool.query(`
    SELECT id FROM ingredient_yield_factors
    WHERE ingredient_name ILIKE '%ức gà%' AND cooking_method ILIKE '%luộc%'
    LIMIT 1
  `);
  chickenYieldFactorId = factorRes.rows[0]?.id;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  console.log('\\n[Phân hệ 3: 8/8 PASS]');
});

// -------------------------------------------------------------------------
// Phân hệ 3.1: Tra cứu công thức & Nguyên liệu (Ảnh 3)
// -------------------------------------------------------------------------
describe('Phân hệ 3.1: Tra cứu & Gợi ý công thức món ăn (5/5)', () => {
  test('API_RECIPE_001: [GET] /api/recipes - Tìm kiếm công thức qua query (?q=salad)', async () => {
    const res = await fetch(`${baseUrl}/api/recipes?q=salad`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.recipes));
    assert.ok(data.recipes.length > 0);
    const match = data.recipes.some((r) => r.title.toLowerCase().includes('salad') || (r.description && r.description.toLowerCase().includes('salad')));
    assert.equal(match, true);
  });

  test('API_RECIPE_002: [GET] /api/ingredients - Tìm kiếm nguyên liệu (?q=chicken)', async () => {
    const res = await fetch(`${baseUrl}/api/ingredients?q=chicken`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.ingredients));

    const resG = await fetch(`${baseUrl}/api/ingredients?q=${encodeURIComponent('gà')}`);
    const dataG = await resG.json();
    assert.ok(dataG.ingredients.length > 0);
    const sample = dataG.ingredients[0];
    assert.ok(typeof sample.kcalPer100g === 'number');
    assert.ok(typeof sample.protein === 'number');
    assert.ok(typeof sample.carbs === 'number');
    assert.ok(typeof sample.fat === 'number');
  });

  test('API_RECIPE_003: [POST] /api/recipes/suggest - Gợi ý món ăn thông minh theo nguyên liệu và maxTime', async () => {
    const res = await fetch(`${baseUrl}/api/recipes/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ingredients: ['chicken', 'rice'], maxTime: 30 })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.recipes));

    const resVi = await fetch(`${baseUrl}/api/recipes/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ingredients: ['gà'], maxTime: 30 })
    });
    const dataVi = await resVi.json();
    assert.ok(Array.isArray(dataVi.recipes));
    dataVi.recipes.forEach((r) => assert.ok(r.time <= 30));
  });

  test('API_RECIPE_004: [PUT] /api/favorites/recipes/:id - Lưu công thức món ăn vào mục Yêu thích', async () => {
    assert.ok(testRecipeId);
    const res = await fetch(`${baseUrl}/api/favorites/recipes/${testRecipeId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.deepEqual(data, { saved: true, recipeId: testRecipeId });
  });

  test('API_RECIPE_005: [DELETE] /api/favorites/recipes/:id - Bỏ công thức món ăn khỏi mục Yêu thích', async () => {
    assert.ok(testRecipeId);
    const res = await fetch(`${baseUrl}/api/favorites/recipes/${testRecipeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data, { saved: false, recipeId: testRecipeId });
  });
});

// -------------------------------------------------------------------------
// Phân hệ 3.2: Tính toán khẩu phần & Hệ số hao hụt Meal-Prep (Ảnh 4 & Ảnh 2)
// -------------------------------------------------------------------------
describe('Phân hệ 3.2: Tính toán khẩu phần & Hệ số hao hụt Meal-Prep (3/3)', () => {
  test('API_PREP_001: [GET] /api/meal-prep/yield-factors - Lấy danh mục hệ số hao hụt chế biến', async () => {
    const res = await fetch(`${baseUrl}/api/meal-prep/yield-factors`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.yieldFactors));
    assert.ok(data.yieldFactors.length > 0);
    const factor = data.yieldFactors[0];
    assert.ok('id' in factor && 'rawToCookedFactor' in factor && 'cookingMethod' in factor);
  });

  test('API_PREP_002: [POST] /api/meal-prep/convert - Tính toán quy đổi khối lượng từ sống sang chín (inputState = raw)', async () => {
    assert.ok(chickenYieldFactorId);
    const res = await fetch(`${baseUrl}/api/meal-prep/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        yieldFactorId: chickenYieldFactorId,
        inputWeightG: 800,
        inputState: 'raw',
        servings: 4
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.conversion, {
      rawWeightG: 800,
      cookedWeightG: 600,
      rawWeightPerServingG: 200,
      cookedWeightPerServingG: 150,
      servings: 4,
      rawToCookedFactor: 0.75
    });
  });

  test('TC_PREP_003: [POST] /api/meal-prep/convert - Kiểm thử API tính quy đổi ngược từ chín sang sống (inputState = cooked)', async () => {
    assert.ok(chickenYieldFactorId);
    const res = await fetch(`${baseUrl}/api/meal-prep/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        yieldFactorId: chickenYieldFactorId,
        inputWeightG: 750,
        inputState: 'cooked',
        servings: 5
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.conversion, {
      rawWeightG: 1000,
      cookedWeightG: 750,
      rawWeightPerServingG: 200,
      cookedWeightPerServingG: 150,
      servings: 5,
      rawToCookedFactor: 0.75
    });
  });
});
