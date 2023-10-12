const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');

router.get('/', asyncHandler(async (req, res, next) => {
    // get all fees
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from utility_fee");
    connection.end();
    res.json(rows);
}))
router.get("/unpaid", asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from v_utility_fee_invoice");
    connection.end();
    res.json(rows);
}));

router.post("/", asyncHandler(async (req, res, next) => {
    // add new fee
    const connection = await pool.getConnection();
    const feeId = uuidv4();
    const datePaid = req.body.datePaid;
    const utilityDue = req.body.utilityDue;
    const isPaid = req.body.isPaid;
    const utilityId = req.body.utilityId;
    const tenantId = req.body.tenantId;
    await connection.execute("insert into utility_fee values(?,?,?,?,?,?)", [feeId, datePaid, utilityDue, isPaid, utilityId, tenantId]);
    connection.end();
    res.status(200).json({
        message: "record added"
    });
}))
router.get("/:feeid", asyncHandler(async (req, res, next) => {
    // get specific fees
    const feeId = req.params.feeid;
    const connection = await pool.getConnection();
    const row = await connection.execute("select utility_fee.utility_due, utility.utility_type, utility.utility_fee from utility_fee inner join utility on utility_fee.utility_id = utility.utility_id where utility_fee.utility_fee_id = ?", [feeId]);
    await connection.end();
    res.json(row);
}));
router.put("/:feeid", asyncHandler(async (req, res, next) => {
    // update specific fee
    const connection = await pool.getConnection();
    const feeId = req.params.feeid;
    await connection.execute("call p_pay_utility(?)", [feeId]);
    connection.end();
    res.status(200).json({
        message: "record updated"
    });
}));

module.exports = router;