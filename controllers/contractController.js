// const pool = require('../models/dbPool');
const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const { body, param } = require("express-validator");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 10 });

// # TODO: Add validation
exports.newContract = asyncHandler(async (req, res, next) => {
    const contractId = uid.rnd();
    const tenantId = req.body.tenantId;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    let connection = await pool.getConnection();
    await connection.execute("insert into contract(contract_id, tenant_id, start_date, end_date, contract_status) values(?,?,?,?,?);", [contractId, tenantId, startDate, endDate, 0]);
    connection.release();
    res.status(200).json({
        "message": "contract created",
    });
});
