const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler');
const uuid = require("short-uuid");
router.get('/', asyncHandler(async (req, res, next) => {
    // get all necessity
    const connection = await pool.getConnection();
    const rows = await connection.query("select * from necessity;");
    connection.end();
    res.json(rows);
}))

router.post("/", asyncHandler(async (req, res, next) => {
    // add new necessity
    const id = req.body.newId;
    const fee = req.body.newFee;
    const type = req.body.newType;
    const connection = await pool.getConnection();
    await connection.execute("call p_add_necessity(?,?,?)", [fee, type, id]);
    connection.end();
    res.status(200).json({
        message: "necessity added"
    });
}))

router.put("/:feeid", asyncHandler(async (req, res, next) => {
    // update specific necessity
    const id = req.params.feeid;
    const fee = req.body.newFee;
    const type = req.body.newType;
    const connection = await pool.getConnection();
    await connection.execute("update necessity set necessity_fee = ? , necessity_type = ? where necessity_id = ?", [fee, type, id]);
    connection.end();
    res.status(200).json({
        message: "record updated"
    });
}));
router.get("/:necessityid", asyncHandler(async (req, res, next) => {
    // get specific necessity
    const id = req.params.necessityid;
    const connection = await pool.getConnection();
    const rows = await connection.execute("SELECT DISTINCT necessity.necessity_type as 'necessity type', necessity.necessity_fee as 'necessity fee' FROM necessity INNER JOIN necessity_fee ON necessity_fee.necessity_id = necessity.necessity_id INNER JOIN tenant ON necessity_fee.tenant_id = tenant.tenant_id WHERE tenant.tenant_id = ?;", [id]);
    connection.end();
    res.json(rows);
}));

module.exports = router;