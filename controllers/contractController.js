// const pool = require('../models/dbPool');
const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const { body, param } = require("express-validator");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 10 });
const { format, addMonths } = require("date-fns");

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

exports.getNecessities = asyncHandler(async (req, res, next) => {
    const { contractId } = req.params;
    const connection = await pool.getConnection();
    try {
        const query = "select necessity.necessity_id, necessity.necessity_type, necessity.necessity_fee from necessity inner join necessity_fee on necessity.necessity_id = necessity_fee.necessity_id inner join necessity_bill on necessity_fee.necessity_bill_id = necessity_bill.necessity_bill_id inner join contract on necessity_bill.contract_id = contract.contract_id where contract.contract_id = ? order by necessity.necessity_type;";
        const values = [contractId];
        const [necessityList] = await connection.execute(query, values);
        res.status(200).json({
            "message": "retrieve list success",
            "data": necessityList,
        });
    } catch (error) {
        res.status(400).json({
            "message": "An error has occured retrieving the list",
        });
    } finally {
        connection.release();

    }
});

exports.newNecessity = [
    param("contractId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("necessityFee").isInt().trim().escape().isLength({ min: 1 }),
    body("necessityType").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const { contractId } = req.params;
        const { necessityFee, necessityType } = req.body;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // adds new necessity
            const necessityId = uid.rnd();
            const newNecessity = "insert into necessity values(?,?,?)";
            const necessityValues = [necessityId, necessityType, necessityFee];
            await connection.execute(newNecessity, necessityValues);

            // check if there is a bill for contract
            const nextMonth = format(addMonths(new Date(), 1), "yyyy-MM-05");
            const existingBill = "select * from necessity_bill where contract_id = ? and bill_due = ?";
            const existingBillValues = [contractId, nextMonth];
            const [bill] = await connection.execute(existingBill, existingBillValues);

            let billId = null;
            if (bill.length > 0) {
                // 
                billId = bill[0].necessity_bill_id;
                // creates necessity_fee
                const necessityFeeId = uid.rnd();
                const newNecessityFee = "insert into necessity_fee values(?,?,?,?);";
                const newNecessityFeeValues = [necessityFeeId, billId, necessityId, false];
                await connection.execute(newNecessityFee, newNecessityFeeValues);

                // update total bill of existing bill
                const totalBill = bill[0].total_bill + Number(necessityFee);
                const updateBill = "update necessity_bill set total_bill = ? where contract_id = ?;"
                const updateBillValues = [totalBill, contractId];
                await connection.execute(updateBill, updateBillValues);

            } else {
                // creates new bill
                billId = uid.rnd();;
                const createBill = "insert into necessity_bill (necessity_bill_id,contract_id,bill_due,payment_status,total_bill) values(?,?,?,?,?);";
                const createBillValues = [billId, contractId, nextMonth, false, Number(necessityFee)];
                await connection.execute(createBill, createBillValues);

                // creates necessity_fee
                const necessityFeeId = uid.rnd();
                const newNecessityFee = "insert into necessity_fee values(?,?,?,?);";
                const newNecessityFeeValues = [necessityFeeId, billId, necessityId, false];
                await connection.execute(newNecessityFee, newNecessityFeeValues);
            }

            // get updated necessities
            const uNecessities = "select necessity.necessity_id, necessity.necessity_type, necessity.necessity_fee from necessity inner join necessity_fee on necessity.necessity_id = necessity_fee.necessity_id inner join necessity_bill on necessity_fee.necessity_bill_id = necessity_bill.necessity_bill_id inner join contract on necessity_bill.contract_id = contract.contract_id where contract.contract_id = ? order by necessity.necessity_type;";
            const uNecessityValues = [contractId];
            const [necessityList] = await connection.execute(uNecessities, uNecessityValues);

            await connection.commit();
            res.status(200).json({
                "message": "add necessity success",
                "necessities": necessityList,
            });
        } catch (error) {
            await connection.rollback();
            console.log(error);
            res.status(400).json({
                "message": "failed to add necessity",
            });
        } finally {
            connection.release();
        }
    })
];

exports.getNecessityBills = asyncHandler(async (req, res, next) => {
    const { contractId } = req.params;
    const connection = await pool.getConnection();
    try {
        const query = "select necessity_bill.total_bill, necessity_bill.bill_due, necessity_bill.date_paid, necessity_bill.payment_status from necessity_bill inner join contract on necessity_bill.contract_id = contract.contract_id where necessity_bill.payment_status = false and contract.contract_id = ?;";
        const values = [contractId];
        const [necessityBills] = await connection.execute(query, values);
        res.status(200).json({
            "message": "retrieve bills success",
            "data": necessityBills,
        });
    } catch (error) {
        res.status(400).json({
            "message": "An error has occured retrieving the bills",
        });
    } finally {
        connection.release();
    }
});

exports.getRoomUtilityBills = asyncHandler(async (req, res, next) => {
    const { contractId } = req.params;
    const connection = await pool.getConnection();
    try {
        const query = "select contract.room_number, room_utility_bill.total_bill, room_utility_bill.bill_due, room_utility_bill.date_paid, room_utility_bill.payment_status from room_utility_bill inner join contract on room_utility_bill.contract_id = contract.contract_id where room_utility_bill.payment_status = false and contract.contract_id = ?;";
        const values = [contractId];
        const [roomUtilityBills] = await connection.execute(query, values);
        res.status(200).json({
            "message": "retrieve bills success",
            "data": roomUtilityBills,
        });
    } catch (error) {
        res.status(400).json({
            "message": "An error has occured retrieving the bills",
        });
    } finally {
        connection.release();
    }
});