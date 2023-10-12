const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler')

exports.getTenants = asyncHandler(async (req, res, next) => {
    let connection = await pool.getConnection();
    const rows = await connection.query("SELECT * FROM tenant WHERE archive_status = false ORDER BY last_name ASC;");
    if (connection) {
        connection.end();
    }
    res.json(rows)
});

exports.newTenant = asyncHandler(async (req, res, next) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const contactNumber = req.body.contactNum;
    const identificationNumber = req.body.identificationNumber;
    const connection = await pool.getConnection();
    console.log(firstName);
    console.log(lastName);
    console.log(contactNumber);
    console.log(identificationNumber);
    await connection.execute("CALL p_add_tenant(?,?,?,?)", [firstName, lastName, contactNumber, identificationNumber]);
    connection.end();
    res.status(200).json({
        "message": "Tenant Created",
        "status": "200",
    });
});

exports.getNewTenants = asyncHandler(async (req, res, next) => {
    let connection = await pool.getConnection();
    const rows = await connection.query("SELECT * FROM v_new_tenant;");
    if (connection) {
        connection.end();
    }
    res.json(rows)
});

exports.getTenant = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
    let connection = await pool.getConnection();
    const row = await connection.execute("SELECT tenant.first_name, tenant.last_name, tenant.contact_number, tenant.occupancy_status, tenant.identification_number, room.room_number, room.room_type FROM tenant left JOIN room_fee ON tenant.tenant_id = room_fee.tenant_id left JOIN room ON room_fee.room_number = room.room_number WHERE tenant.tenant_id = ?;", [tenantId]);
    connection.end();
    res.json(row)
});

exports.editTenant = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
    const firstName = req.body.newFirstName;
    const lastName = req.body.newLastName;
    const contact = req.body.newContactNum;
    const archiveStatus = req.body.newStatus;
    const identification = req.body.newIdentification;
    const connection = await pool.getConnection();
    await connection.execute("CALL p_edit_tenant(?,?,?,?,?,?)", [tenantId, firstName, lastName, contact, archiveStatus, identification]);
    connection.end();
    res.status(200).json({
        "message": "record updated",
        "status": "200",
    });
});

exports.addNecessity = asyncHandler(async (req, res, next) => {
    const id = req.body.newId;
    const fee = req.body.newFee;
    const type = req.body.newType;
    const connection = await pool.getConnection();
    await connection.execute("call p_add_necessity(?,?,?)", [fee, type, id]);
    connection.end();
    res.status(200).json({
        message: "necessity added"
    });
});

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