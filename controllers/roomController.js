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

            const [tenantList] = await connection.query("select tenant.tenant_id, tenant.first_name, tenant.last_name, contract.contract_id from tenant inner join contract on tenant.tenant_id = contract.tenant_id where tenant.occupancy_status = false;");
            const [roomList] = await connection.query("select * from room");

            await connection.commit();
            res.status(200).json({
                "message": "assign tenant success",
                "tenantList": tenantList,
                "roomList": roomList,
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
    param("roomId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("tenantId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("contractId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { roomId } = req.params;
            const { tenantId, contractId } = req.body;

            const tenantQuery = "update tenant set occupancy_status = false where tenant_id = ?";
            const tenantValues = [tenantId];
            await connection.execute(tenantQuery, tenantValues);

            const contractQuery = "update contract set room_number = ? where tenant_id = ? and contract_id = ?";
            const contractValues = [0, tenantId, contractId];
            await connection.execute(contractQuery, contractValues);

            const roomStatusQuery = "select headcount, occupant_count, room_type from room where room_number = ?"
            const roomStatusValues = [roomId];
            const [roomDetail] = await connection.execute(roomStatusQuery, roomStatusValues);
            let isFull = null
            let occupantCount = null;
            if (roomDetail.length > 0) {
                occupantCount = roomDetail[0].occupant_count - 1;
                isFull = !(occupantCount < roomDetail[0].headcount);
            }

            const isOccupied = (occupantCount > 0) ? "occupied" : "vacant";
            const roomQuery = "update room set room_status = ?, is_full = ?, occupant_count = ? where room_number = ? ";
            const roomValues = [isOccupied, isFull, occupantCount, roomId];
            await connection.execute(roomQuery, roomValues);

            const tenantListQuery = "select tenant.tenant_id, tenant.first_name, tenant.last_name, contract.contract_id from tenant inner join contract on contract.tenant_id = tenant.tenant_id inner join room on contract.room_number = room.room_number where room.room_number = ?";
            const tenantListValues = [roomId];
            const [tenantList] = await connection.execute(tenantListQuery, tenantListValues);
            const [roomList] = await connection.query("select * from room");

            await connection.commit();
            res.status(200).json({
                "message": "remove tenant success",
                "tenantList": tenantList,
                "roomList": roomList,
            });
        } catch (error) {
            await connection.rollback();
            res.status(400).json({
                "message": "failed to remove tenant",
            });
        } finally {
            connection.release();
        }

    })
];

exports.getTenantsFromRoom = asyncHandler(async (req, res, next) => {
    const { room_number } = req.params;
    const query = "select tenant.tenant_id, tenant.first_name, tenant.last_name, contract.contract_id from tenant inner join contract on contract.tenant_id = tenant.tenant_id inner join room on contract.room_number = room.room_number where room.room_number = ?;"
    const connection = await pool.getConnection();
    const [data] = await connection.execute(query, [room_number]);;
    connection.release();
    res.status(200).json(data);
});

