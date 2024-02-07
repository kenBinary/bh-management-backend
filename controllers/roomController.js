// const pool = require('../models/dbPool');
const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const format = require('date-fns/format');
const { addMonths } = require('date-fns');
const { body, param } = require("express-validator");


exports.getRooms = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const [rooms] = await connection.query("select * from room");
    connection.release();
    res.json(rooms);
});

exports.assignRoom = [
    param("roomId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("tenantId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("contractId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { roomId } = req.params;
            const { tenantId, contractId } = req.body;

            const tenantQuery = "update tenant set occupancy_status = true where tenant_id = ?";
            const tenantValues = [tenantId];
            await connection.execute(tenantQuery, tenantValues);

            const contractQuery = "update contract set room_number = ? where tenant_id = ? and contract_id = ?";
            const contractValues = [roomId, tenantId, contractId];
            await connection.execute(contractQuery, contractValues);

            const roomStatusQuery = "select headcount, occupant_count, room_type from room where room_number = ?"
            const roomStatusValues = [roomId];
            const [roomDetail] = await connection.execute(roomStatusQuery, roomStatusValues);
            let isFull = null
            let occupantCount = null;
            if (roomDetail.length > 0) {
                occupantCount = roomDetail[0].occupant_count + 1;
                isFull = (occupantCount >= roomDetail[0].headcount) ? true : false;
            }

            const roomQuery = "update room set room_status = ?, is_full = ?, occupant_count = ? where room_number = ? ";
            const roomValues = ["occupied", isFull, occupantCount, roomId];
            await connection.execute(roomQuery, roomValues);

            await connection.commit();
            res.status(200).json({
                "message": "assign tenant success"
            });
        } catch (error) {
            await connection.rollback();
            res.status(400).json({
                "message": "failed to assign a tenant",
            });
        } finally {
            connection.release();
        }

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
    const { room_number } = req.params;
    const query = "select tenant.tenant_id, tenant.first_name, tenant.last_name,tenant.occupancy_status, tenant.contact_number,tenant.archive_status from tenant inner join contract on contract.tenant_id = tenant.tenant_id inner join room on contract.room_number = room.room_number where room.room_number = ?;"
    const connection = await pool.getConnection();
    const [data] = await connection.execute(query, [room_number]);;
    connection.release();
    res.status(200).json(data);
});

