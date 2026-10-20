-- User dietary preferences and saved recipes/ingredients (task image 1).
CREATE TABLE IF NOT EXISTS user_favorite_recipes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS user_favorite_ingredients (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, ingredient_id)
);
