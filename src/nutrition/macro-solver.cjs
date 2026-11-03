// macro_solver.cjs — Giải hệ 4x4 (kcal, P, C, F) để tìm lượng nguyên liệu khớp macro
// Dùng: gaussian elimination, chọn tổ hợp 4 nguyên liệu từ ứng viên, lấy nghiệm dương tốt nhất.

function solveLinear(A, b) {
  // A: n x n, b: n  → trả về x hoặc null nếu suy biến
  const n = b.length;
  const M = A.map((row, i) => [...row.map(Number), Number(b[i])]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (Math.abs(f) < 1e-12) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map(row => row[n]);
}

// A_tự = macro/1g của từng nguyên liệu
function macroPerGram(ing) {
  return {
    kcal: Number(ing.kcal_per_100g) / 100,
    p: Number(ing.protein_g) / 100,
    c: Number(ing.carbs_g) / 100,
    f: Number(ing.fat_g) / 100,
  };
}

// Tìm tổ hợp 4 nguyên liệu cho nghiệm (g) hợp lệ, sai số kcal nhỏ nhất
function solveAmounts(cands, target, { maxGram = 600, minGram = 0.5 } = {}) {
  const M = cands.map(macroPerGram);
  const idx = cands.map((_, i) => i);
  const combos = [];
  const n = idx.length;
  const pick = (start, cur) => {
    if (cur.length === 4) { combos.push([...cur]); return; }
    for (let i = start; i < n; i++) { cur.push(i); pick(i + 1, cur); cur.pop(); }
  };
  pick(0, []);

  let best = null;
  for (const cb of combos) {
    // Ưu tiên ràng buộc kcal + macro quan trọng (bỏ macro nào target = 0)
    const rows = [];
    const rhs = [];
    rows.push(cb.map(i => M[i].kcal)); rhs.push(target.kcal);
    if (target.p > 0.5) { rows.push(cb.map(i => M[i].p)); rhs.push(target.p); }
    if (target.c > 0.5) { rows.push(cb.map(i => M[i].c)); rhs.push(target.c); }
    if (target.f > 0.5) { rows.push(cb.map(i => M[i].f)); rhs.push(target.f); }

    let sol;
    if (rows.length === 4) {
      sol = solveLinear(rows, rhs);
    } else if (rows.length === 3) {
      // 3 ràng buộc, 4 ẩn: cố định ẩn nhỏ nhất (dầu/gia vị) = 0.5g rồi giải 3x3
      const free = cb.slice(1);
      const fixI = cb[0];
      const A3 = rows.map(r => free.map(i => M[i][r === rows[0] ? 'kcal' : ''] ?? 0));
      // build properly
      const mat = rows.map((row) => free.map((_, j) => row[j + 1]));
      const b3 = rhs.map((v, i) => v - rows[i][0] * 1.0);
      sol = solveLinear(mat, b3);
      if (sol) sol = [1.0, ...sol];
    } else {
      continue;
    }
    if (!sol) continue;
    const grams = cb.map((_, k) => sol[k]);
    if (grams.some(g => !isFinite(g) || g < minGram || g > maxGram)) continue;

    // tính lại & sai số
    let t = { kcal: 0, p: 0, c: 0, f: 0 };
    cb.forEach((ci, k) => {
      t.kcal += M[ci].kcal * grams[k];
      t.p += M[ci].p * grams[k];
      t.c += M[ci].c * grams[k];
      t.f += M[ci].f * grams[k];
    });
    const err = Math.abs(t.kcal - target.kcal) / Math.max(target.kcal, 1)
      + Math.abs(t.p - target.p) / Math.max(target.p, 0.5)
      + Math.abs(t.c - target.c) / Math.max(target.c, 0.5)
      + Math.abs(t.f - target.f) / Math.max(target.f, 0.5);

    if (!best || err < best.err) best = { err, cb, grams, totals: t };
  }
  return best;
}

module.exports = { solveLinear, macroPerGram, solveAmounts };
