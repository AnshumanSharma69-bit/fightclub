// ─── requireAdmin ──────────────────────────────────────────────────────────
// Use AFTER the `protect` middleware on any admin-only route.
// `protect` already attaches req.user — this just checks the isAdmin flag.
//
// Usage:
//   router.get('/admin/fighters', protect, requireAdmin, adminController.getAllFighters);

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { requireAdmin };
