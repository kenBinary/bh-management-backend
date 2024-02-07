// const pool = require('../models/dbPool');
const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const { body, param } = require("express-validator");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 10 });
const { format } = require("date-fns");

exports.getTenants = asyncHandler(async (req, res, next) => {
    let connection = await pool.getConnection();
    const [results] = await connection.query("SELECT * FROM tenant WHERE archive_status = false ORDER BY last_name ASC;");
    connection.release();
    res.json(results);
});

exports.newTenant = [
    body("firstName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("lastName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("contactNum").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const { firstName, lastName, contactNum } = req.body;
        const tenantId = uid.rnd();
        const arguments = [tenantId, firstName, lastName, contactNum];
        const data = {
            tenant_id: tenantId,
            first_name: firstName,
            last_name: lastName,
            occupancy_status: 0,
            contact_number: contactNum,
            archive_status: 0,
        };
        const connection = await pool.getConnection();
        await connection.execute("INSERT INTO `tenant` (`tenant_id`,`first_name`, `last_name`, `contact_number`) VALUES (?,?,?,?)", arguments);
        connection.release();
        res.status(200).json({
            "message": "Tenant Created",
            "data": data,
        });
    })
];

exports.getTenant = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
    let connection = await pool.getConnection();
    const [results] = await connection.execute("SELECT * from tenant where tenant_id = ?", [tenantId]);
    connection.release();
    res.json(results)
});

exports.editTenant = [
    param("tenantid").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newFirstName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newLastName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newContactNum").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const { tenantid } = req.params;
        const { newFirstName, newLastName, newContactNum } = req.body;
        const values = [newFirstName, newLastName, newContactNum, tenantid];

        const data = {
            tenant_id: tenantid,
            first_name: newFirstName,
            last_name: newLastName,
            contact_number: newContactNum,
        };

        const connection = await pool.getConnection();
        await connection.execute("UPDATE tenant SET first_name = ?, last_name = ?, contact_number = ? WHERE tenant_id = ?;", values);
        connection.release();

        res.status(200).json({
            "message": "record updated",
            "data": data,
        });
    })
];

exports.getUnassignedTenants = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const query = "select tenant.tenant_id, tenant.first_name, tenant.last_name, contract.contract_id from tenant inner join contract on tenant.tenant_id = contract.tenant_id where tenant.occupancy_status = false;"
    const [data] = await connection.query(query);
    connection.release();
    res.status(200).json(data);
});

exports.addNecessity = [
    body("newId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newFee").isInt().trim().escape().isLength({ min: 1 }),
    body("newType").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const id = req.body.newId;
        const fee = req.body.newFee;
        const type = req.body.newType;
        const connection = await pool.getConnection();
        await connection.execute("call p_add_necessity(?,?,?)", [fee, type, id]);
        connection.end();
        res.status(200).json({
            message: "necessity added"
        });
    })
];

exports.getPaymentHistory = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.id;
    const connection = await pool.getConnection();
    const history = await connection.execute("CALL `p_tenant_payment_history`(?)", [tenantId]);
    const data = []
    if (history.flat().length > 2) {
        history.flat().forEach((element, index, array) => {
            if (!(index === array.length - 1)) {
                data.push(element);
            }
        });
    }
    connection.end();
    res.json(data);
});

exports.getTenantNecessity = asyncHandler(async (req, res, next) => {
    const id = req.params.tenantid;
    const connection = await pool.getConnection();
    const rows = await connection.execute("SELECT DISTINCT necessity.necessity_type as 'necessity type', necessity.necessity_fee as 'necessity fee' FROM necessity INNER JOIN necessity_fee ON necessity_fee.necessity_id = necessity.necessity_id INNER JOIN tenant ON necessity_fee.tenant_id = tenant.tenant_id WHERE tenant.tenant_id = ?;", [id]);
    connection.end();
    res.json(rows);
});

exports.newTenantNecessity = [
    param("tenantid").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newFee").isInt().trim().escape().isLength({ min: 1 }),
    body("newType").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const id = req.params.tenantid;
        const fee = req.body.newFee;
        const type = req.body.newType;
        const connection = await pool.getConnection();
        await connection.execute("call p_add_necessity(?,?,?)", [fee, type, id]);
        connection.end();
        res.status(200).json({
            message: "necessity added"
        });
    })
];

exports.getPaymentHistory = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
    const connection = await pool.getConnection();
    const history = await connection.execute("CALL `p_tenant_payment_history`(?)", [tenantId]);
    const data = []
    if (history.flat().length > 2) {
        history.flat().forEach((element, index, array) => {
            if (!(index === array.length - 1)) {
                data.push(element);
            }
        });
    }
    connection.end();
    res.json(data);
});
exports.getContracts = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
    const connection = await pool.getConnection();
    const [contracts] = await connection.execute("select * from contract where tenant_id = ?", [tenantId]);
    if (contracts.length > 0) {
        const newDate = format(new Date(contracts[0].start_date), "MMM d, yyyy");
        contracts[0].start_date = newDate;
    }
    connection.release();
    res.status(200).json(contracts);
});

exports.editContract = asyncHandler(async (req, res, next) => {
    const { tenantid, contract_id } = req.params;
    const { room_number, end_date, contract_status } = req.body;
    const connection = await pool.getConnection();
    const statementAguments = [room_number, end_date, contract_status, tenantid, contract_id];
    await connection.execute("update contract set room_number = ?, end_date = ?, contract_status = ? where tenant_id = ? and contract_id = ?", statementAguments);
    connection.release();
    res.status(200).json({
        "message": "contract edited"
    });
});