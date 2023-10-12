const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler')


router.get('/', asyncHandler(async (req, res, next) => {
    // get all tenant
    let connection = await pool.getConnection();
    const rows = await connection.query("SELECT * FROM tenant WHERE archive_status = false ORDER BY last_name ASC;");
    if (connection) {
        connection.end();
    }
    res.json(rows)
}));
router.post('/', asyncHandler(async (req, res, next) => {
    // create new tenant
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
}));
router.get("/new-tenants", asyncHandler(async (req, res, next) => {
    // get all new tenants
    let connection = await pool.getConnection();
    const rows = await connection.query("SELECT * FROM v_new_tenant;");
    if (connection) {
        connection.end();
    }
    res.json(rows)
}));
router.get("/tenant-from-room/:roomNumber", asyncHandler(async (req, res, next) => {
    // get tenants from room;
    let connection = await pool.getConnection();
    let roomNumber = req.params.roomNumber;
    const rows = await connection.execute("select distinct tenant.first_name, tenant.last_name, tenant.tenant_id from tenant inner join room_fee on room_fee.tenant_id = tenant.tenant_id inner join room on room.room_number = room_fee.room_number where room.room_number = ?;", [roomNumber]);
    if (connection) {
        connection.end();
    }
    res.json(rows)
}));

router.get("/:tenantid", asyncHandler(async (req, res, next) => {
    // get specific tenant info
    const tenantId = req.params.tenantid;
    let connection = await pool.getConnection();
    const row = await connection.execute("SELECT tenant.first_name, tenant.last_name, tenant.contact_number, tenant.occupancy_status, tenant.identification_number, room.room_number, room.room_type FROM tenant left JOIN room_fee ON tenant.tenant_id = room_fee.tenant_id left JOIN room ON room_fee.room_number = room.room_number WHERE tenant.tenant_id = ?;", [tenantId]);
    connection.end();
    res.json(row)
}));
router.put("/:tenantid", asyncHandler(async (req, res, next) => {
    // edit a tenant
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
}));
// assign a tenant to a room
// - room_fee gets created
// - room_fee links tenant to room
// assign a tenant to an amenity
// assign a tenant to a utility
// make tenant pay room along with utility
// make tenant optionally pay amenity

module.exports = router;
