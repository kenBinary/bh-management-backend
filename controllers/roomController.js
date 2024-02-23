// const pool = require('../models/dbPool');
const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const format = require('date-fns/format');
const { addMonths } = require('date-fns');
const { body, param } = require("express-validator");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 10 });


exports.getRooms = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const [rooms] = await connection.query("select * from room");
    connection.release();
    res.json(rooms);
});

exports.assignRoom = [
    param("room_number").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("tenantId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("contractId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const connection = await pool.getConnection();
        const { room_number } = req.params;
        const { tenantId, contractId } = req.body;

        try {
            await connection.beginTransaction();

            // updates tenants occupancy status
            const tenantQuery = "update tenant set occupancy_status = true where tenant_id = ?";
            const tenantValues = [tenantId];
            await connection.execute(tenantQuery, tenantValues);

            // updates tenant's contract room_number
            const contractQuery = "update contract set room_number = ? where tenant_id = ? and contract_id = ?";
            const contractValues = [room_number, tenantId, contractId];
            await connection.execute(contractQuery, contractValues);

            // check if status of a room and updates its headcount and is_full
            const roomStatusQuery = "select headcount, occupant_count, room_type from room where room_number = ?"
            const roomStatusValues = [room_number];
            const [roomDetail] = await connection.execute(roomStatusQuery, roomStatusValues);
            let isFull = null
            let occupantCount = null;
            if (roomDetail.length > 0) {
                occupantCount = roomDetail[0].occupant_count + 1;
                isFull = (occupantCount >= roomDetail[0].headcount) ? true : false;
            }
            const roomQuery = "update room set room_status = ?, is_full = ?, occupant_count = ? where room_number = ? ";
            const roomValues = ["occupied", isFull, occupantCount, room_number];
            await connection.execute(roomQuery, roomValues);

            // gets the fee for room and utilities
            const [roomFee] = await connection.execute("select room_fee  from room where room_number = ?", [room_number]);
            const [utilityFee] = await connection.query("select utility_fee, utility_id from utility");
            const totalBill = Number(roomFee[0].room_fee) + Number(utilityFee.reduce((accumulator, currentValue) => {
                return accumulator + currentValue.utility_fee;
            }, 0));

            // get start date of contract
            const qContractCratedDate = "select start_date from contract where contract_id = ?"
            const vContractCratedDate = [contractId];
            const [contractCratedDate] = await connection.execute(qContractCratedDate, vContractCratedDate);
            const startDate = contractCratedDate[0].start_date;


            // check if there is a bill for contract
            const nextMonth = format(addMonths(new Date(startDate), 1), "yyyy-MM-dd");
            const existingBill = "select * from room_utility_bill where contract_id = ? and bill_due = ?;";
            const existingBillValues = [contractId, nextMonth];
            const [bill] = await connection.execute(existingBill, existingBillValues);


            let billId = null;
            if (bill.length > 0) {
                billId = bill[0].room_utility_bill_id;

                // Creates room fee
                const roomFeeId = uid.rnd();
                const newNecessityFee = "insert into room_fee values(?,?,?,?);";
                const newNecessityFeeValues = [roomFeeId, billId, room_number, false];
                await connection.execute(newNecessityFee, newNecessityFeeValues);

                // creates utilitFees
                utilityFee.forEach(async (e) => {
                    const utilityFeeId = uid.rnd();
                    const newUtilityFee = "insert into utility_fee values(?,?,?,?);";
                    const newUtilityFeeValues = [utilityFeeId, billId, e.utility_id, false];
                    await connection.execute(newUtilityFee, newUtilityFeeValues);
                });

                // update total bill of existing bill
                const updateBill = "update room_utility_bill set total_bill = ? where contract_id = ?;"
                const updateBillValues = [totalBill, contractId];
                await connection.execute(updateBill, updateBillValues);

            } else {
                // creates new bill
                billId = uid.rnd();
                const createBill = "insert into room_utility_bill (room_utility_bill_id, contract_id, bill_due, payment_status, total_bill) values(?,?,?,?,?);";
                const createBillValues = [billId, contractId, nextMonth, false, totalBill];
                await connection.execute(createBill, createBillValues);

                // Creates room fee
                const roomFeeId = uid.rnd();
                const newNecessityFee = "insert into room_fee values(?,?,?,?);";
                const newNecessityFeeValues = [roomFeeId, billId, room_number, false];
                await connection.execute(newNecessityFee, newNecessityFeeValues);

                // creates utilitFees
                utilityFee.forEach(async (e) => {
                    const utilityFeeId = uid.rnd();
                    const newUtilityFee = "insert into utility_fee values(?,?,?,?);";
                    const newUtilityFeeValues = [utilityFeeId, billId, e.utility_id, false];
                    await connection.execute(newUtilityFee, newUtilityFeeValues);
                });
            }



            // returns new tenantList and roomList
            const [tenantList] = await connection.query("select tenant.tenant_id, tenant.first_name, tenant.last_name, contract.contract_id from tenant inner join contract on tenant.tenant_id = contract.tenant_id where tenant.occupancy_status = false;");
            const [roomList] = await connection.query("select * from room");

            await connection.commit();
            res.status(200).json({
                "message": "assign tenant success",
                "tenantList": tenantList,
                "roomList": roomList,
            });
        } catch (error) {
            console.log(error)
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
    param("room_number").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("tenantId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    body("contractId").isAlphanumeric().escape().trim().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const { room_number } = req.params;
            const { tenantId, contractId } = req.body;

            const tenantQuery = "update tenant set occupancy_status = false where tenant_id = ?";
            const tenantValues = [tenantId];
            await connection.execute(tenantQuery, tenantValues);

            const contractQuery = "update contract set room_number = ? where tenant_id = ? and contract_id = ?";
            const contractValues = [0, tenantId, contractId];
            await connection.execute(contractQuery, contractValues);

            const roomStatusQuery = "select headcount, occupant_count, room_type from room where room_number = ?"
            const roomStatusValues = [room_number];
            const [roomDetail] = await connection.execute(roomStatusQuery, roomStatusValues);
            let isFull = null
            let occupantCount = null;
            if (roomDetail.length > 0) {
                occupantCount = roomDetail[0].occupant_count - 1;
                isFull = !(occupantCount < roomDetail[0].headcount);
            }

            const isOccupied = (occupantCount > 0) ? "occupied" : "vacant";
            const roomQuery = "update room set room_status = ?, is_full = ?, occupant_count = ? where room_number = ? ";
            const roomValues = [isOccupied, isFull, occupantCount, room_number];
            await connection.execute(roomQuery, roomValues);

            const tenantListQuery = "select tenant.tenant_id, tenant.first_name, tenant.last_name, contract.contract_id from tenant inner join contract on contract.tenant_id = tenant.tenant_id inner join room on contract.room_number = room.room_number where room.room_number = ?";
            const tenantListValues = [room_number];
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

