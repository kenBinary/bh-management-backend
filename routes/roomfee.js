const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');

router.get('/', asyncHandler(async (req, res, next) => {
    // get all fees
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from room_fee");
    connection.end();
    res.json(rows);
}))
router.post("/", asyncHandler(async (req, res, next) => {
    // add new fee
    const feeId = uuidv4();
    const datePaid = req.body.datePaid;
    const rentDue = req.body.rentDue;
    const isPaid = req.body.isPaid;
    const roomNumber = req.body.roomNumber;
    const tenantId = req.body.tenantId;
    const connection = await pool.getConnection();
    await connection.execute("insert into room_fee values(?,?,?,?,?,?)", [feeId, datePaid, rentDue, isPaid, roomNumber, tenantId]);
    connection.end();
    res.status(200).json({
        message: "record added"
    });
}))
router.get("/unpaid", asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from v_room_fee_invoice");
    connection.end();
    res.json(rows);
}));
router.get("/:feeid", asyncHandler(async (req, res, next) => {
    // get specific fees
    const connection = await pool.getConnection();
    const feeId = req.params.feeid;
    const row = await connection.execute("select room_fee.room_number, room_fee.rent_due, room.room_fee from room_fee inner join room on room_fee.room_number = room.room_number where room_fee_id = ?", [feeId]);
    connection.end();
    res.json(row);
}));

router.put("/:feeid", asyncHandler(async (req, res, next) => {
    // update/pay specific fee
    const feeId = req.params.feeid;
    const connection = await pool.getConnection();
    await connection.execute("call p_pay_room(?)", [feeId]);
    connection.end();
    res.status(200).json({
        message: "record updated"
    });
}));

module.exports = router;