const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler');
const { param } = require("express-validator");

exports.getRecentPayments = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const recentPayments = await connection.query("SELECT * FROM v_recent_payments;");
    connection.end();
    res.json(recentPayments);
});
exports.getRoomFees = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from room_fee");
    connection.end();
    res.json(rows);
});

exports.getUnpaidRoomFees = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from v_room_fee_invoice");
    connection.end();
    res.json(rows);
});

exports.getRoomFee = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const feeId = req.params.id;
    const row = await connection.execute("select room_fee.room_number, room_fee.rent_due, room.room_fee from room_fee inner join room on room_fee.room_number = room.room_number where room_fee_id = ?", [feeId]);
    connection.end();
    res.json(row);
});

exports.payRoomFee = [
    param("id").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const feeId = req.params.id;
        const connection = await pool.getConnection();
        await connection.execute("call p_pay_room(?)", [feeId]);
        connection.end();
        res.status(200).json({
            message: "record updated"
        });
    })
];

exports.getNecessityFees = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from necessity_fee");
    connection.end();
    res.json(rows);
});

exports.getUnpaidNecessityFees = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from v_necessity_fee_invoice");
    connection.end();
    res.json(rows);
});

exports.getNecessityFee = asyncHandler(async (req, res, next) => {
    const feeId = req.params.id;
    const connection = await pool.getConnection();
    const rows = await connection.execute("select necessity_fee.necessity_due, necessity.necessity_type, necessity.necessity_fee from necessity_fee inner join necessity on necessity_fee.necessity_id = necessity.necessity_id where necessity_fee.necessity_fee_id = ?", [feeId]);
    connection.end();
    res.json(rows);
});

exports.payNecessityFee = [
    param("id").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const feeId = req.params.id;
        const connection = await pool.getConnection();
        await connection.execute("call p_pay_necessity(?)", [feeId]);
        connection.end();
        res.status(200).json({
            message: "record updated"
        });
    })
];

exports.getUtilityFees = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from utility_fee");
    connection.end();
    res.json(rows);
});

exports.getUnpaidUtilityFees = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from v_utility_fee_invoice");
    connection.end();
    res.json(rows);
});

exports.getUtilityFee = asyncHandler(async (req, res, next) => {
    const feeId = req.params.id;
    const connection = await pool.getConnection();
    const row = await connection.execute("select utility_fee.utility_due, utility.utility_type, utility.utility_fee from utility_fee inner join utility on utility_fee.utility_id = utility.utility_id where utility_fee.utility_fee_id = ?", [feeId]);
    await connection.end();
    res.json(row);
});

exports.payUtilityfee = [
    param("id").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const connection = await pool.getConnection();
        const feeId = req.params.id;
        await connection.execute("call p_pay_utility(?)", [feeId]);
        connection.end();
        res.status(200).json({
            message: "record updated"
        });
    })
];