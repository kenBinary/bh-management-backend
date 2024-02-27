const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 10 });
const { format, addMonths } = require("date-fns");

exports.checkNecessityBillStatus = asyncHandler(async (req, res, next) => {
    const { contractId } = req.params;
    const connection = await pool.getConnection();
    const currentDate = format(new Date(), "yyyy-MM-dd");
    try {
        // check if there is an unpaid bill in previous months
        const qCurrentBill = "select necessity_bill.necessity_bill_id, necessity_bill.total_bill, necessity_bill.bill_due, necessity_bill.date_paid,  necessity_bill.payment_status from necessity_bill inner join contract on necessity_bill.contract_id = contract.contract_id  where necessity_bill.payment_status = false and contract.contract_id = ? and necessity_bill.bill_due < ? order by necessity_bill.bill_due desc";
        const vCurrentBill = [contractId, currentDate];
        const [currentNecessityBills] = await connection.execute(qCurrentBill, vCurrentBill);

        const qFutureBills = "select necessity_bill.necessity_bill_id, necessity_bill.total_bill, necessity_bill.bill_due, necessity_bill.date_paid,  necessity_bill.payment_status from necessity_bill inner join contract on necessity_bill.contract_id = contract.contract_id  where necessity_bill.payment_status = false and contract.contract_id = ? and necessity_bill.bill_due > ? order by necessity_bill.bill_due desc";
        const vFutureBills = [contractId, currentDate];
        const [futureNecessityBills] = await connection.execute(qFutureBills, vFutureBills);

        if ((currentNecessityBills.length > 0) && (futureNecessityBills.length < 1)) {
            const previousDue = currentNecessityBills[0].bill_due;
            const nextBillDue = format(addMonths(new Date(previousDue), 1), "yyyy-MM-dd");

            // gets necessities of tenant
            const qNecessities = "select distinct necessity.necessity_id, necessity.necessity_type, necessity.necessity_fee from necessity inner join necessity_fee on necessity.necessity_id = necessity_fee.necessity_id inner join necessity_bill on necessity_fee.necessity_bill_id = necessity_bill.necessity_bill_id inner join contract on necessity_bill.contract_id = contract.contract_id where contract.contract_id = ? order by necessity.necessity_type;";
            const vNecessities = [contractId];
            const [necessities] = await connection.execute(qNecessities, vNecessities);

            // total of necessity
            const necessityTotal = necessities.reduce((accumulator, currentValue) => {
                return accumulator + Number(currentValue.necessity_fee);
            }, 0);

            // create new bill
            const newBillId = uid.rnd();;
            const createBill = "insert into necessity_bill (necessity_bill_id,contract_id,bill_due,payment_status,total_bill) values(?,?,?,?,?);";
            const createBillValues = [newBillId, contractId, nextBillDue, false, Number(necessityTotal)];
            await connection.execute(createBill, createBillValues);

            // create new fees for paid necessitites
            necessities.forEach(async (necessity) => {
                const necessityFeeId = uid.rnd();
                const qNewNecessityFee = "insert into necessity_fee values(?,?,?,?);";
                const vNewNecessityFeeValues = [necessityFeeId, newBillId, necessity.necessity_id, false];
                await connection.execute(qNewNecessityFee, vNewNecessityFeeValues);
            });

            console.log("bill created");
        }

    } catch (error) {
        console.log(error);
        throw new Error("Error checking bill status");
    } finally {
        connection.release();
    }
    next();
});

exports.checkRoomUtilityBillStatus = asyncHandler(async (req, res, next) => {
    const { contractId } = req.params;
    const connection = await pool.getConnection();
    const currentDate = format(new Date(), "yyyy-MM-dd");
    try {
        // check if there is an unpaid bill in previous months
        const uQuery = "select contract.room_number, room_utility_bill.room_utility_bill_id, room_utility_bill.total_bill, room_utility_bill.bill_due, room_utility_bill.date_paid, room_utility_bill.payment_status from room_utility_bill inner join contract on room_utility_bill.contract_id = contract.contract_id where room_utility_bill.payment_status = false and contract.contract_id = ? and room_utility_bill.bill_due <= ? order by room_utility_bill.bill_due desc;";
        const uValues = [contractId, currentDate];
        const [prevRoomUtilityBills] = await connection.execute(uQuery, uValues);

        const cQuery = "select contract.room_number, room_utility_bill.room_utility_bill_id, room_utility_bill.total_bill, room_utility_bill.bill_due, room_utility_bill.date_paid, room_utility_bill.payment_status from room_utility_bill inner join contract on room_utility_bill.contract_id = contract.contract_id where room_utility_bill.payment_status = false and contract.contract_id = ? and room_utility_bill.bill_due > ? order by room_utility_bill.bill_due desc;";
        const vValues = [contractId, currentDate];
        const [nextMonthBills] = await connection.execute(cQuery, vValues);

        if ((prevRoomUtilityBills.length > 0) && (nextMonthBills.length < 1)) {
            const roomNumber = prevRoomUtilityBills[0].room_number;
            const previousDue = prevRoomUtilityBills[0].bill_due;
            const nextBillDue = format(addMonths(new Date(previousDue), 1), "yyyy-MM-dd");


            // gets the fee for room and utilities
            const [roomFee] = await connection.execute("select room_fee  from room where room_number = ?", [roomNumber]);
            const [utilityFee] = await connection.query("select utility_fee, utility_id from utility");

            let newBillId = uid.rnd();
            const newTotalBill = Number(roomFee[0].room_fee) + Number(utilityFee.reduce((accumulator, currentValue) => {
                return accumulator + currentValue.utility_fee;
            }, 0));

            // // create new room bill
            const qNewBill = "insert into room_utility_bill (room_utility_bill_id, contract_id, bill_due, payment_status, total_bill) values(?,?,?,?,?);";
            const vNewBill = [newBillId, contractId, nextBillDue, false, newTotalBill];
            await connection.execute(qNewBill, vNewBill);

            // // Creates room fee
            const roomFeeId = uid.rnd();
            const newNecessityFee = "insert into room_fee values(?,?,?,?);";
            const newNecessityFeeValues = [roomFeeId, newBillId, roomNumber, false];
            await connection.execute(newNecessityFee, newNecessityFeeValues);

            // // creates utilitFees
            utilityFee.forEach(async (e) => {
                const utilityFeeId = uid.rnd();
                const newUtilityFee = "insert into utility_fee values(?,?,?,?);";
                const newUtilityFeeValues = [utilityFeeId, newBillId, e.utility_id, false];
                await connection.execute(newUtilityFee, newUtilityFeeValues);
            });
        }
    } catch (error) {
        console.log(error);
        throw new Error("Error checking bill status");
    } finally {
        connection.release();
    }
    next();
});