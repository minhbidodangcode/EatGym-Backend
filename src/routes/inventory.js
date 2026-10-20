import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// -------------------------------------------------------------
// GET /api/inventory - Lấy danh sách nguyên liệu trong kho
// -------------------------------------------------------------
router.get('/inventory', async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { category, q } = req.query;

    let query = `
      SELECT id, name, quantity, unit, calories, protein, carbs, fat, category, icon, created_at
      FROM user_inventory
      WHERE user_id = $1
    `;
    const params = [userId];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        quantity: Number(row.quantity),
        unit: row.unit,
        calories: Number(row.calories),
        protein: Number(row.protein),
        carbs: Number(row.carbs),
        fat: Number(row.fat),
        category: row.category,
        icon: row.icon || '🥗',
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/inventory - Thêm danh sách nguyên liệu vào kho (Batch)
// -------------------------------------------------------------
router.post('/inventory', async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Danh sách nguyên liệu không được rỗng.' });
    }

    const inserted = [];
    for (const item of items) {
      const name = item.name || 'Nguyên liệu';
      const quantity = Number(item.quantity) || 100;
      const unit = item.unit || 'g';
      const calories = Number(item.calories) || 0;
      const protein = Number(item.protein) || 0;
      const carbs = Number(item.carbs) || 0;
      const fat = Number(item.fat) || 0;
      const category = item.category || 'other';
      const icon = item.icon || '🥗';

      const insRes = await pool.query(
        `INSERT INTO user_inventory (user_id, name, quantity, unit, calories, protein, carbs, fat, category, icon)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [userId, name, quantity, unit, calories, protein, carbs, fat, category, icon]
      );
      inserted.push(insRes.rows[0]);
    }

    res.status(201).json({
      message: 'Đã lưu nguyên liệu vào kho thành công!',
      count: inserted.length,
      items: inserted
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/inventory/:id/consume - Sử dụng một phần nguyên liệu
// -------------------------------------------------------------
router.post('/inventory/:id/consume', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount = 0, deleteIfDepleted = true } = req.body;

    const currentRes = await pool.query('SELECT * FROM user_inventory WHERE id = $1 AND user_id = $2', [id, req.auth.userId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy nguyên liệu trong kho.' });
    }

    const currentItem = currentRes.rows[0];
    const newQty = Number(currentItem.quantity) - Number(amount);

    if (newQty <= 0 && deleteIfDepleted) {
      await pool.query('DELETE FROM user_inventory WHERE id = $1 AND user_id = $2', [id, req.auth.userId]);
      return res.json({ message: 'Đã sử dụng hết nguyên liệu.', deleted: true });
    } else {
      const updateRes = await pool.query(
        'UPDATE user_inventory SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
        [Math.max(0, newQty), id, req.auth.userId]
      );
      return res.json({ message: 'Đã cập nhật số lượng tồn kho.', item: updateRes.rows[0] });
    }
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// DELETE /api/inventory/:id - Xóa nguyên liệu khỏi kho
// -------------------------------------------------------------
router.delete('/inventory/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM user_inventory WHERE id = $1 AND user_id = $2', [id, req.auth.userId]);
    res.json({ message: 'Đã xóa nguyên liệu khỏi kho.' });
  } catch (error) {
    next(error);
  }
});

export default router;
