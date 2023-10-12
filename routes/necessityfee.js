const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler');
const uuid = require('short-uuid');

router.get('/', asyncHandler(async (req, res, next) => {
    // get all fees
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from necessity_fee");
    connection.end();
    res.json(rows);
}))
router.get("/unpaid", asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from v_necessity_fee_invoice");
    connection.end();
    res.json(rows);
}));
router.get("/:feeid", asyncHandler(async (req, res, next) => {
    // get specific fees
    const feeId = req.params.feeid;
    const connection = await pool.getConnection();
    const rows = await connection.execute("select necessity_fee.necessity_due, necessity.necessity_type, necessity.necessity_fee from necessity_fee inner join necessity on necessity_fee.necessity_id = necessity.necessity_id where necessity_fee.necessity_fee_id = ?", [feeId]);
    connection.end();
    res.json(rows);
}));
router.post("/", asyncHandler(async (req, res, next) => {
    // add new fee
    const feeId = uuid.generate();
    const isPaid = req.body.isPaid;
    const datePaid = req.body.datePaid;
    const due = req.body.due;
    const tenantId = req.body.tenantId;
    const necessityId = req.body.necessityId;
    const connection = await pool.getConnection();
    await connection.execute("insert into necessity_fee values (?,?,?,?,?,?)", [feeId, isPaid, datePaid, due, tenantId, necessityId]);
    connection.end();
    res.status(200).json({
        message: "record added"
    });
}))

router.put("/:feeid", asyncHandler(async (req, res, next) => {
    // update specific fee
    const feeId = req.params.feeid;
    const connection = await pool.getConnection();
    await connection.execute("call p_pay_necessity(?)", [feeId]);
    connection.end();
    res.status(200).json({
        message: "record updated"
    });
}));

module.exports = router;