const express = require('express');
const Joi = require('joi');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const parkingSchema = Joi.object({
  code: Joi.string().alphanum().min(2).max(20).uppercase().required().messages({
    'string.alphanum': 'Parking code must be alphanumeric',
    'any.required': 'Parking code is required',
  }),
  name: Joi.string().min(3).max(255).required(),
  totalSpaces: Joi.number().integer().min(1).required().messages({
    'number.min': 'Total spaces must be at least 1',
    'any.required': 'Total spaces is required',
  }),
  location: Joi.string().min(3).max(500).required(),
  feePerHour: Joi.number().min(0).required().messages({
    'number.min': 'Fee per hour cannot be negative',
    'any.required': 'Fee per hour is required',
  }),
});

// POST /api/parkings - Admin registers a parking
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { error, value } = parkingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => d.message),
    });
  }

  const { code, name, totalSpaces, location, feePerHour } = value;

  const existing = await db.query('SELECT id FROM parkings WHERE code = $1', [code]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ success: false, message: 'Parking code already exists' });
  }

  const result = await db.query(
    `INSERT INTO parkings (code, name, total_spaces, available_spaces, location, fee_per_hour, created_by)
     VALUES ($1, $2, $3, $3, $4, $5, $6)
     RETURNING *`,
    [code, name, totalSpaces, location, feePerHour, req.user.id]
  );

  const p = result.rows[0];
  res.status(201).json({
    success: true,
    message: 'Parking registered successfully',
    data: formatParking(p),
  });
});

// GET /api/parkings - All users can view
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  const countRes = await db.query(
    `SELECT COUNT(*) FROM parkings WHERE (name ILIKE $1 OR code ILIKE $1 OR location ILIKE $1) AND is_active = true`,
    [`%${search}%`]
  );
  const total = parseInt(countRes.rows[0].count);

  const result = await db.query(
    `SELECT * FROM parkings
     WHERE (name ILIKE $1 OR code ILIKE $1 OR location ILIKE $1) AND is_active = true
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows.map(formatParking),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/parkings/:code - Get single parking
router.get('/:code', authenticate, async (req, res) => {
  const result = await db.query('SELECT * FROM parkings WHERE code = $1 AND is_active = true', [req.params.code.toUpperCase()]);
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Parking not found' });
  }
  res.json({ success: true, data: formatParking(result.rows[0]) });
});

// PUT /api/parkings/:code - Admin update parking
router.put('/:code', authenticate, authorize('admin'), async (req, res) => {
  const { error, value } = parkingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
  }

  const existing = await db.query('SELECT * FROM parkings WHERE code = $1', [req.params.code.toUpperCase()]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Parking not found' });
  }

  const old = existing.rows[0];
  const diff = value.totalSpaces - old.total_spaces;
  const newAvailable = Math.max(0, old.available_spaces + diff);

  const result = await db.query(
    `UPDATE parkings SET name=$1, total_spaces=$2, available_spaces=$3, location=$4, fee_per_hour=$5, code=$6
     WHERE code=$7 RETURNING *`,
    [value.name, value.totalSpaces, newAvailable, value.location, value.feePerHour, value.code, req.params.code.toUpperCase()]
  );

  res.json({ success: true, message: 'Parking updated successfully', data: formatParking(result.rows[0]) });
});

// DELETE /api/parkings/:code - Admin deactivate parking
router.delete('/:code', authenticate, authorize('admin'), async (req, res) => {
  const result = await db.query(
    'UPDATE parkings SET is_active = false WHERE code = $1 RETURNING code',
    [req.params.code.toUpperCase()]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Parking not found' });
  }
  res.json({ success: true, message: 'Parking deactivated successfully' });
});

function formatParking(p) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    totalSpaces: p.total_spaces,
    availableSpaces: p.available_spaces,
    occupiedSpaces: p.total_spaces - p.available_spaces,
    occupancyRate: p.total_spaces > 0 ? (((p.total_spaces - p.available_spaces) / p.total_spaces) * 100).toFixed(1) : 0,
    location: p.location,
    feePerHour: parseFloat(p.fee_per_hour),
    isActive: p.is_active,
    createdAt: p.created_at,
  };
}

module.exports = router;
