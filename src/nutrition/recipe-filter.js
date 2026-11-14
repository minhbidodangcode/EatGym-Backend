// EatGym-Backend/src/nutrition/recipe-filter.js
// Logic chuẩn hoá tag, metadata bộ lọc và xây dựng truy vấn SQL lọc công thức.

export const TAG_METADATA = {
  'tang-co': { slug: 'tang-co', label: 'Tăng cơ', icon: '💪' },
  'giam-mo': { slug: 'giam-mo', label: 'Giảm mỡ', icon: '🔥' },
  'it-calo': { slug: 'it-calo', label: 'Ít calo', icon: '🥗' },
  'duoi-15-phut': { slug: 'duoi-15-phut', label: 'Dưới 15 phút', icon: '⏱️' },
  'eat-clean': { slug: 'eat-clean', label: 'Eat Clean', icon: '🥑' },
  'high-protein': { slug: 'high-protein', label: 'High Protein', icon: '🍗' },
  'low-carb': { slug: 'low-carb', label: 'Low Carb', icon: '🌾' },
  'an-chay': { slug: 'an-chay', label: 'Ăn chay', icon: '🥦' },
  'smoothie': { slug: 'smoothie', label: 'Smoothie', icon: '🥤' },
  'gluten-free': { slug: 'gluten-free', label: 'Gluten Free', icon: '🌾' },
};

export const MEAL_TYPE_METADATA = {
  breakfast: { value: 'breakfast', label: 'Bữa sáng' },
  lunch: { value: 'lunch', label: 'Bữa trưa' },
  dinner: { value: 'dinner', label: 'Bữa tối' },
  snack: { value: 'snack', label: 'Bữa phụ' },
  drink: { value: 'drink', label: 'Đồ uống' },
  main: { value: 'main', label: 'Bữa chính' },
};

/**
 * Chuẩn hoá tag bất kỳ sang slug chuẩn (bỏ dấu tiếng Việt, lowercase, thay khoảng trắng bằng '-')
 * Hỗ trợ backward-compat cho tên tag cũ ('Tăng cơ', 'Ít calo', emoji prefixes).
 */
export function normalizeTagSlug(raw) {
  if (typeof raw !== 'string') return '';
  let str = raw.trim();
  if (!str) return '';

  // Bỏ emoji và ký hiệu đặc biệt ở chip UI (bao gồm stopwatches, fire, biceps, v.v.)
  str = str.replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '').trim();

  // Map các biến thể tên cũ / alias sang slug chuẩn
  const aliasLower = str.toLowerCase();
  if (aliasLower === 'tất cả' || aliasLower === 'tat ca' || aliasLower === 'all') return 'tat-ca';
  if (aliasLower === 'tăng cơ' || aliasLower === 'tang co' || aliasLower === 'tang-co') return 'tang-co';
  if (aliasLower === 'giảm mỡ' || aliasLower === 'giam mo' || aliasLower === 'giam-mo') return 'giam-mo';
  if (aliasLower === 'ít calo' || aliasLower === 'it calo' || aliasLower === 'it-calo') return 'it-calo';
  if (
    aliasLower === 'dưới 15 phút' ||
    aliasLower === 'dưới 15p' ||
    aliasLower === 'duoi 15 phut' ||
    aliasLower === 'duoi 15p' ||
    aliasLower === 'duoi-15-phut' ||
    aliasLower === 'duoi-15p'
  ) return 'duoi-15-phut';
  if (aliasLower === 'high protein' || aliasLower === 'high-pro' || aliasLower === 'high pro' || aliasLower === 'high-protein') return 'high-protein';
  if (aliasLower === 'eat clean' || aliasLower === 'eat-clean') return 'eat-clean';
  if (aliasLower === 'ăn chay' || aliasLower === 'an chay' || aliasLower === 'an-chay') return 'an-chay';
  if (aliasLower === 'smoothie' || aliasLower === 'sinh tố' || aliasLower === 'sinh to') return 'smoothie';
  if (aliasLower === 'low carb' || aliasLower === 'low-carb') return 'low-carb';
  if (aliasLower === 'gluten free' || aliasLower === 'gluten-free') return 'gluten-free';

  // Chuyển đổi ký tự tiếng Việt có dấu sang không dấu
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Xây dựng câu WHERE, danh sách params an toàn ($n), mệnh đề ORDER BY, limit, offset
 * @param {object} query - Các query parameters từ req.query
 * @param {number} startParamIndex - Chỉ số param bắt đầu (mặc định 1)
 */
export function buildRecipeFilterQuery(query = {}, startParamIndex = 1) {
  const whereClauses = [];
  const params = [];

  const addParam = (val) => {
    params.push(val);
    return `$${params.length + startParamIndex - 1}`;
  };

  // 1. Tìm kiếm q (tiêu đề, mô tả, search_text)
  if (typeof query.q === 'string' && query.q.trim()) {
    const rawSearch = query.q.trim();
    const p = addParam(rawSearch);
    whereClauses.push(`(unaccent(r.search_text) ILIKE '%' || unaccent(${p}) || '%' OR unaccent(r.title) ILIKE '%' || unaccent(${p}) || '%')`);
  }

  // 2. Tag đơn lẻ (?tag=...)
  if (typeof query.tag === 'string' && query.tag.trim()) {
    const slug = normalizeTagSlug(query.tag);
    if (slug && slug !== 'tat-ca') {
      const p = addParam(slug);
      whereClauses.push(`EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_slug = ${p})`);
    }
  }

  // 3. Nhóm tags (?tags=slug1,slug2 - OR trong nhóm)
  if (query.tags) {
    const rawTags = Array.isArray(query.tags) ? query.tags : String(query.tags).split(',');
    const slugs = rawTags
      .map(normalizeTagSlug)
      .filter((s) => s && s !== 'tat-ca');
    if (slugs.length > 0) {
      const p = addParam(slugs);
      whereClauses.push(`EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_slug = ANY(${p}))`);
    }
  }

  // 4. Exclude tags (?excludeTags=slug1,slug2)
  if (query.excludeTags) {
    const rawExTags = Array.isArray(query.excludeTags) ? query.excludeTags : String(query.excludeTags).split(',');
    const exSlugs = rawExTags
      .map(normalizeTagSlug)
      .filter((s) => s && s !== 'tat-ca');
    if (exSlugs.length > 0) {
      const p = addParam(exSlugs);
      whereClauses.push(`NOT EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_slug = ANY(${p}))`);
    }
  }

  // 5. Khoảng Calo (minKcal, maxKcal)
  if (query.minKcal !== undefined && query.minKcal !== null && query.minKcal !== '') {
    const num = Number(query.minKcal);
    if (!Number.isNaN(num) && num >= 0) {
      const p = addParam(num);
      whereClauses.push(`r.kcal >= ${p}`);
    }
  }
  if (query.maxKcal !== undefined && query.maxKcal !== null && query.maxKcal !== '') {
    const num = Number(query.maxKcal);
    if (!Number.isNaN(num) && num >= 0) {
      const p = addParam(num);
      whereClauses.push(`r.kcal <= ${p}`);
    }
  }

  // 6. Khoảng Protein (minProtein, maxProtein)
  if (query.minProtein !== undefined && query.minProtein !== null && query.minProtein !== '') {
    const num = Number(query.minProtein);
    if (!Number.isNaN(num) && num >= 0) {
      const p = addParam(num);
      whereClauses.push(`r.protein_g >= ${p}`);
    }
  }
  if (query.maxProtein !== undefined && query.maxProtein !== null && query.maxProtein !== '') {
    const num = Number(query.maxProtein);
    if (!Number.isNaN(num) && num >= 0) {
      const p = addParam(num);
      whereClauses.push(`r.protein_g <= ${p}`);
    }
  }

  // 7. Giới hạn Carbs, Fat
  if (query.maxCarbs !== undefined && query.maxCarbs !== null && query.maxCarbs !== '') {
    const num = Number(query.maxCarbs);
    if (!Number.isNaN(num) && num >= 0) {
      const p = addParam(num);
      whereClauses.push(`r.carbs_g <= ${p}`);
    }
  }
  if (query.maxFat !== undefined && query.maxFat !== null && query.maxFat !== '') {
    const num = Number(query.maxFat);
    if (!Number.isNaN(num) && num >= 0) {
      const p = addParam(num);
      whereClauses.push(`r.fat_g <= ${p}`);
    }
  }

  // 8. Giới hạn thời gian nấu (maxTime)
  if (query.maxTime !== undefined && query.maxTime !== null && query.maxTime !== '') {
    const num = parseInt(query.maxTime, 10);
    if (!Number.isNaN(num) && num > 0) {
      const p = addParam(num);
      whereClauses.push(`r.cooking_time_min <= ${p}`);
    }
  }

  // 9. Meal Type (?mealType=breakfast,snack)
  if (query.mealType) {
    const allowed = Object.keys(MEAL_TYPE_METADATA);
    const rawTypes = Array.isArray(query.mealType) ? query.mealType : String(query.mealType).split(',');
    const validTypes = rawTypes
      .map((t) => t.trim().toLowerCase())
      .filter((t) => allowed.includes(t));
    if (validTypes.length > 0) {
      const p = addParam(validTypes);
      whereClauses.push(`r.meal_type = ANY(${p})`);
    }
  }

  // 10. Vegetarian (?vegetarian=true/false)
  if (query.vegetarian === 'true' || query.vegetarian === true) {
    whereClauses.push('r.is_vegetarian = TRUE');
  } else if (query.vegetarian === 'false' || query.vegetarian === false) {
    whereClauses.push('r.is_vegetarian = FALSE');
  }

  // 11. Difficulty (?difficulty=Dễ)
  if (typeof query.difficulty === 'string' && query.difficulty.trim()) {
    const p = addParam(query.difficulty.trim());
    whereClauses.push(`r.difficulty = ${p}`);
  }

  // 12. Ingredient (?ingredient=ức gà,trứng - EXISTS trên recipe_ingredients)
  if (query.ingredient) {
    const rawIngs = Array.isArray(query.ingredient) ? query.ingredient : String(query.ingredient).split(',');
    const ings = rawIngs.map((i) => i.trim()).filter(Boolean);
    for (const ing of ings) {
      const p = addParam(ing);
      whereClauses.push(`EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND unaccent(ri.ingredient_name) ILIKE '%' || unaccent(${p}) || '%')`);
    }
  }

  // 13. Sort (?sort=title|kcal_asc|kcal_desc|protein_desc|time_asc|newest)
  let sortClause = 'r.title ASC';
  const sortMap = {
    title: 'r.title ASC',
    kcal_asc: 'r.kcal ASC, r.title ASC',
    kcal_desc: 'r.kcal DESC, r.title ASC',
    protein_desc: 'r.protein_g DESC, r.title ASC',
    time_asc: 'r.cooking_time_min ASC, r.title ASC',
    newest: 'r.created_at DESC, r.title ASC',
  };
  if (typeof query.sort === 'string' && sortMap[query.sort]) {
    sortClause = sortMap[query.sort];
  }

  // 14. Pagination (limit, offset)
  let limit = 1000;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsedLimit = parseInt(query.limit, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 5000);
    }
  }

  let offset = 0;
  if (query.offset !== undefined && query.offset !== null && query.offset !== '') {
    const parsedOffset = parseInt(query.offset, 10);
    if (!Number.isNaN(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset;
    }
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  return {
    whereClause,
    whereConditions: whereClauses,
    params,
    sortClause,
    limit,
    offset,
    nextParamIndex: startParamIndex + params.length,
  };
}
