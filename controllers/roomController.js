const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler')
const format = require('date-fns/format');
const { addMonths } = require('date-fns');
const { body, param } = require("express-validator");


exports.getRooms = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rooms = await connection.query("select * from room");
    connection.end();
    res.json(rooms);
});

exports.assignRoom = [
    param("roomId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("tenantId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("internetTrue").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const connection = await pool.getConnection();
        const rows = await connection.execute("select headcount,room_type from room where room_number = ?", [req.params.roomId]);
        if ((rows[0].headcount < 1 && rows[0].room_type === "single room") || (rows[0].headcount < 2 && rows[0].room_type === "double room")) {
            const dueYearMonth = format(addMonths(new Date(), 1), 'yyyy-MM');
            const roomNumber = req.params.roomId;
            const tenantId = req.body.tenantId;
            const internetTrue = (req.body.internetTrue === true) ? "1" : "0";
            const currentDue = `${dueYearMonth}-05`;
            await connection.execute("CALL p_assign_room(?,?,?,?);", [roomNumber, tenantId, internetTrue, currentDue]);
            res.status(200).json({
                message: "tenant assigned to room"
            });
        }
        else {
            res.status(400).json({
                message: "Room Full"
            });
        }
        connection.end();
    })
];

exports.freeRoom = [
    param("roomId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("tenantId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const roomNumber = req.params.roomId;
        const tenantId = req.body.tenantId;
        const connection = await pool.getConnection();
        await connection.execute("CALL p_remove_tenant_room(?,?);", [roomNumber, tenantId]);
        connection.end();
        res.status(200).json({
            message: "tenant removed from room"
        });
    })
];

exports.getTenantsFromRoom = asyncHandler(async (req, res, next) => {
    let connection = await pool.getConnection();
    let roomNumber = req.params.roomId;
    const rows = await connection.execute("select distinct tenant.first_name, tenant.last_name, tenant.tenant_id from tenant inner join room_fee on room_fee.tenant_id = tenant.tenant_id inner join room on room.room_number = room_fee.room_number where room.room_number = ?;", [roomNumber]);
    if (connection) {
        connection.end();
    }
    res.json(rows)
});