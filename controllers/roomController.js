const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler')
const format = require('date-fns/format');
const { addMonths } = require('date-fns');

exports.getRooms = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rooms = await connection.query("select * from room");
    connection.end();
    res.json(rooms);
});

exports.assignRoom = asyncHandler(async (req, res, next) => {
    const dueYearMonth = format(addMonths(new Date(), 1), 'yyyy-MM');
    const roomNumber = req.params.roomId;
    const tenantId = req.body.tenantId;
    const internetTrue = (req.body.internetTrue === true) ? "1" : "0";
    const currentDue = `${dueYearMonth}-05`;
    const connection = await pool.getConnection();
    await connection.execute("CALL p_assign_room(?,?,?,?);", [roomNumber, tenantId, internetTrue, currentDue]);
    connection.end();
    res.status(200).json({
        message: "tenant assigned to room"
    });

});

exports.freeRoom = asyncHandler(async (req, res, next) => {
    const roomNumber = req.params.roomId;
    const tenantId = req.body.tenantId;
    const connection = await pool.getConnection();
    await connection.execute("CALL p_remove_tenant_room(?,?);", [roomNumber, tenantId]);
    connection.end();
    res.status(200).json({
        message: "tenant removed from room"
    });
});