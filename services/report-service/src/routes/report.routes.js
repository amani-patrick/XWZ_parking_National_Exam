const express = require('express');
const Joi = require('joi');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required().messages({ 'any.required': 'Start date is required' }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
    'any.required': 'End date is required',
    'date.min': 'End date must be after start date',
  }),
  parkingCode: Joi.string().uppercase().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

// GET /api/reports/outgoing - Outgoing cars with total amount between dates
router.get('/outgoing', authenticate, authorize('admin'), async (req, res) => {
  const { error, value } = dateRangeSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
  }

  const { startDate, endDate, parkingCode, page, limit } = value;
  const offset = (page - 1) * limit;

  let whereClause = `WHERE ce.status = 'exited' AND ce.exit_datetime BETWEEN $1 AND $2`;
  const params = [startDate, endDate];

  if (parkingCode) {
    params.push(parkingCode);
    whereClause += ` AND ce.parking_code = $${params.length}`;
  }

  const countRes = await db.query(
    `SELECT COUNT(*), SUM(charged_amount) as total_revenue FROM car_entries ce ${whereClause}`,
    params
  );

  const { count, total_revenue } = countRes.rows[0];

  params.push(limit, offset);
  const result = await db.query(
    `SELECT ce.*, p.name as parking_name, p.fee_per_hour, p.location as parking_location
     FROM car_entries ce JOIN parkings p ON p.code = ce.parking_code
     ${whereClause}
     ORDER BY ce.exit_datetime DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map(formatEntry),
    summary: {
      totalCars: parseInt(count),
      totalRevenue: parseFloat(total_revenue || 0).toFixed(2),
      currency: 'RWF',
      period: { startDate, endDate },
    },
    pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(parseInt(count) / limit) },
  });
});

// GET /api/reports/entered - All entered cars between dates
router.get('/entered', authenticate, authorize('admin'), async (req, res) => {
  const { error, value } = dateRangeSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
  }

  const { startDate, endDate, parkingCode, page, limit } = value;
  const offset = (page - 1) * limit;

  let whereClause = `WHERE ce.entry_datetime BETWEEN $1 AND $2`;
  const params = [startDate, endDate];

  if (parkingCode) {
    params.push(parkingCode);
    whereClause += ` AND ce.parking_code = $${params.length}`;
  }

  const countRes = await db.query(
    `SELECT COUNT(*) FROM car_entries ce ${whereClause}`, params
  );
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await db.query(
    `SELECT ce.*, p.name as parking_name, p.fee_per_hour
     FROM car_entries ce JOIN parkings p ON p.code = ce.parking_code
     ${whereClause}
     ORDER BY ce.entry_datetime DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map(formatEntry),
    summary: { totalCars: total, period: { startDate, endDate } },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/reports/dashboard - Real-time stats
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  const [totalParking, totalCars, currentlyParked, todayRevenue, parkingStats] = await Promise.all([
    db.query('SELECT COUNT(*), SUM(total_spaces) as total_spaces, SUM(available_spaces) as available_spaces FROM parkings WHERE is_active = true'),
    db.query('SELECT COUNT(*) FROM car_entries'),
    db.query(`SELECT COUNT(*) FROM car_entries WHERE status = 'parked'`),
    db.query(`SELECT COALESCE(SUM(charged_amount), 0) as revenue FROM car_entries WHERE status = 'exited' AND exit_datetime >= CURRENT_DATE`),
    db.query(`SELECT p.code, p.name, p.total_spaces, p.available_spaces, p.fee_per_hour,
              COUNT(ce.id) FILTER (WHERE ce.status = 'parked') as currently_parked
              FROM parkings p LEFT JOIN car_entries ce ON ce.parking_code = p.code
              WHERE p.is_active = true GROUP BY p.id ORDER BY p.name`),
  ]);

  res.json({
    success: true,
    data: {
      totalParkings: parseInt(totalParking.rows[0].count),
      totalSpaces: parseInt(totalParking.rows[0].total_spaces || 0),
      availableSpaces: parseInt(totalParking.rows[0].available_spaces || 0),
      totalCarsRegistered: parseInt(totalCars.rows[0].count),
      currentlyParked: parseInt(currentlyParked.rows[0].count),
      todayRevenue: parseFloat(todayRevenue.rows[0].revenue).toFixed(2),
      currency: 'RWF',
      parkingBreakdown: parkingStats.rows.map(p => ({
        code: p.code,
        name: p.name,
        totalSpaces: p.total_spaces,
        availableSpaces: p.available_spaces,
        currentlyParked: parseInt(p.currently_parked),
        feePerHour: parseFloat(p.fee_per_hour),
      })),
    },
  });
});

// GET /api/reports/parking/:code/cars - Cars in specific parking
router.get('/parking/:code/cars', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  let countQuery = `SELECT COUNT(*) FROM car_entries WHERE parking_code = $1 AND status = 'parked'`;
  let queryParams = [req.params.code.toUpperCase()];

  if (req.user.role !== 'admin') {
    queryParams.push(req.user.id);
    countQuery += ` AND attendant_id = $${queryParams.length}`;
  }

  const countRes = await db.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].count);

  let dataQuery = `SELECT ce.*, p.name as parking_name, p.fee_per_hour
     FROM car_entries ce JOIN parkings p ON p.code = ce.parking_code
     WHERE ce.parking_code = $1 AND ce.status = 'parked'`;

  if (req.user.role !== 'admin') {
    dataQuery += ` AND ce.attendant_id = $${queryParams.length}`;
  }

  dataQuery += ` ORDER BY ce.entry_datetime DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  
  const result = await db.query(dataQuery, [...queryParams, limit, offset]);

  res.json({
    success: true,
    data: result.rows.map(formatEntry),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

function formatEntry(e) {
  return {
    id: e.id,
    plateNumber: e.plate_number,
    parkingCode: e.parking_code,
    parkingName: e.parking_name,
    parkingLocation: e.parking_location,
    entryDatetime: e.entry_datetime,
    exitDatetime: e.exit_datetime,
    chargedAmount: parseFloat(e.charged_amount),
    ticketNumber: e.ticket_number,
    status: e.status,
    feePerHour: e.fee_per_hour ? parseFloat(e.fee_per_hour) : null,
  };
}

module.exports = router;
