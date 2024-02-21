// const pool = require('../models/dbPool');
const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const { body, param } = require("express-validator");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 10 });
const { format, addMonths } = require("date-fns");

const path = require('path');
const multer = require('multer')
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "assets/testImages");
    },
    filename: (req, file, cb) => {
        const fileExtension = file.mimetype.split("/")[1].toLowerCase();
        cb(null, uid.rnd() + "." + fileExtension)
    },
});
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.svg'];
    const fileExtension = "." + file.mimetype.split("/")[1].toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only jpg, jpeg, png, and svg are allowed.'), false);
    }
}
const upload = multer({
    storage: storage,
    fileFilter: fileFilter
})

// # TODO: Add validation
exports.newContract = asyncHandler(async (req, res, next) => {
    const contractId = uid.rnd();
    const { tenantId, startDate, endDate } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // creates new contract
        const qNewContract = "insert into contract(contract_id, tenant_id, start_date, end_date, contract_status) values(?,?,?,?,?);";
        const vNewContract = [contractId, tenantId, startDate, endDate, 0];
        await connection.execute(qNewContract, vNewContract);

        // returns created contract
        const [contracts] = await connection.execute("select * from contract where tenant_id = ?", [tenantId]);
        if (contracts.length > 0) {
            const newDate = format(new Date(contracts[0].start_date), "MMM d, yyyy");
            contracts[0].start_date = newDate;
        }

        await connection.commit();
        res.status(200).json(contracts);
    } catch (error) {
        console.log(error);
        res.status(400).send("failed to add a contract");
    } finally {
        connection.release();
    }

});

exports.getNecessities = asyncHandler(async (req, res, next) => {
    const { contractId } = req.params;
    const connection = await pool.getConnection();
    try {
        const query = "select distinct necessity.necessity_id, necessity.necessity_type, necessity.necessity_fee from necessity inner join necessity_fee on necessity.necessity_id = necessity_fee.necessity_id inner join necessity_bill on necessity_fee.necessity_bill_id = necessity_bill.necessity_bill_id inner join contract on necessity_bill.contract_id = contract.contract_id where contract.contract_id = ? order by necessity.necessity_type;";
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
            const existingBill = "select * from necessity_bill where contract_id = ? and bill_due = ? and payment_status = false";
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
            const uNecessities = "select distinct necessity.necessity_id, necessity.necessity_type, necessity.necessity_fee from necessity inner join necessity_fee on necessity.necessity_id = necessity_fee.necessity_id inner join necessity_bill on necessity_fee.necessity_bill_id = necessity_bill.necessity_bill_id inner join contract on necessity_bill.contract_id = contract.contract_id where contract.contract_id = ? order by necessity.necessity_type;";
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
        const query = "select necessity_bill.necessity_bill_id, necessity_bill.total_bill, necessity_bill.bill_due, necessity_bill.date_paid, necessity_bill.payment_status from necessity_bill inner join contract on necessity_bill.contract_id = contract.contract_id where necessity_bill.payment_status = false and contract.contract_id = ? order by necessity_bill.bill_due;";
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
        const query = "select contract.room_number, room_utility_bill.room_utility_bill_id, room_utility_bill.total_bill, room_utility_bill.bill_due, room_utility_bill.date_paid, room_utility_bill.payment_status from room_utility_bill inner join contract on room_utility_bill.contract_id = contract.contract_id where room_utility_bill.payment_status = false and contract.contract_id = ? order by room_utility_bill.bill_due;";
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


exports.payRoomUtilityBill = [
    param("contractId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    param("billId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("roomNumber").isInt().trim().escape().isLength({ min: 1 }),
    body("previousDue").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const { contractId, billId } = req.params;
        const { roomNumber, previousDue } = req.body;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const currentDate = format(new Date(), "yyyy-MM-dd");
            const newBillDue = format(addMonths(new Date(previousDue), 1), "yyyy-MM-05");

            // update room bill
            const qRoomBIll = "update room_utility_bill set date_paid = ? , payment_status = ? where room_utility_bill_id = ?;";
            const vRoomBIll = [currentDate, true, billId];
            await connection.execute(qRoomBIll, vRoomBIll);


            // update room fee
            const qRoomFee = "update room_fee set is_paid = ? where room_utility_bill_id = ?;";
            const vRoomFee = [true, billId];
            await connection.execute(qRoomFee, vRoomFee);

            // update utility fee
            const qUtiliyFee = "update utility_fee set is_paid = ? where room_utility_bill_id = ?;";
            const vUtilityFee = [true, billId];
            await connection.execute(qUtiliyFee, vUtilityFee);


            // gets the fee for room and utilities
            const [roomFee] = await connection.execute("select room_fee  from room where room_number = ?", [roomNumber]);
            const [utilityFee] = await connection.query("select utility_fee, utility_id from utility");

            // ----------------------------------- //
            // check if there is a bill for next month
            const qExistingBill = "select * from room_utility_bill where contract_id = ? and bill_due = ?;";
            const vExistingBillValues = [contractId, newBillDue];
            const [existingBill] = await connection.execute(qExistingBill, vExistingBillValues);

            if (existingBill.length < 1) {
                let newBillId = uid.rnd();
                const newTotalBill = Number(roomFee[0].room_fee) + Number(utilityFee.reduce((accumulator, currentValue) => {
                    return accumulator + currentValue.utility_fee;
                }, 0));

                // create new room bill
                const qNewBill = "insert into room_utility_bill (room_utility_bill_id, contract_id, bill_due, payment_status, total_bill) values(?,?,?,?,?);";
                const vNewBill = [newBillId, contractId, newBillDue, false, newTotalBill];
                await connection.execute(qNewBill, vNewBill);

                // Creates room fee
                const roomFeeId = uid.rnd();
                const newNecessityFee = "insert into room_fee values(?,?,?,?);";
                const newNecessityFeeValues = [roomFeeId, newBillId, roomNumber, false];
                await connection.execute(newNecessityFee, newNecessityFeeValues);

                // creates utilitFees
                utilityFee.forEach(async (e) => {
                    const utilityFeeId = uid.rnd();
                    const newUtilityFee = "insert into utility_fee values(?,?,?,?);";
                    const newUtilityFeeValues = [utilityFeeId, newBillId, e.utility_id, false];
                    await connection.execute(newUtilityFee, newUtilityFeeValues);
                });
            }
            // ----------------------------------- //

            // get new room bills
            const qNewRoomBills = "select contract.room_number, room_utility_bill.room_utility_bill_id, room_utility_bill.total_bill, room_utility_bill.bill_due, room_utility_bill.date_paid, room_utility_bill.payment_status from room_utility_bill inner join contract on room_utility_bill.contract_id = contract.contract_id where room_utility_bill.payment_status = false and contract.contract_id = ? order by room_utility_bill.bill_due;";
            const vNewRoomBills = [contractId];
            const [newRoomUtilityBills] = await connection.execute(qNewRoomBills, vNewRoomBills);

            await connection.commit();
            res.status(200).json({
                "message": "pay bill success",
                "data": newRoomUtilityBills,
            });
        } catch (error) {
            await connection.rollback();
            console.log(error);
            res.status(400).json({
                "message": "failed to pay bill",
            });
        } finally {
            connection.release();
        }
    })
];

exports.payNecessityBill = [
    param("contractId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    param("billId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("previousDue").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const { contractId, billId } = req.params;
        const { previousDue, paidNecessities } = req.body;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();


            const currentDate = format(new Date(), "yyyy-MM-dd");
            const newBillDue = format(addMonths(new Date(previousDue), 1), "yyyy-MM-05");

            // get necessity fees for bill
            const qBillNecessityFees = "select * from necessity_fee where necessity_bill_id = ?";
            const vBillNecessityFees = [billId];
            const [billNecessityFees] = await connection.execute(qBillNecessityFees, vBillNecessityFees);

            // update necessity fees
            billNecessityFees.forEach(async (necessityFee) => {
                if (necessityFee.necessity_id in paidNecessities) {
                    const isPaid = paidNecessities[necessityFee.necessity_id];
                    const query = "update necessity_fee set is_paid = ? where necessity_fee_id = ?;";
                    const values = [isPaid, necessityFee.necessity_fee_id];
                    await connection.execute(query, values);
                }
            });

            // check if there are still any necessity fees that are unpaid
            const qUnpaidFees = "select * from necessity_fee where necessity_bill_id = ? and is_paid = false;";
            const vUnpaidFees = [billId];
            const [unpaidFees] = await connection.execute(qUnpaidFees, vUnpaidFees);

            // // remove necessities and their fees that are unpaid
            unpaidFees.forEach(async (necessity) => {
                console.log(necessity);
                const qUnpaidFees = "delete from necessity_fee where necessity_bill_id = ? and is_paid = false;"
                const vUnpaidFees = [necessity.necessity_bill_id];
                await connection.execute(qUnpaidFees, vUnpaidFees);

                const qUnpaidNecessity = "delete from necessity where necessity_id = ?";
                const vUnpaidNecessity = [necessity.necessity_id];
                await connection.execute(qUnpaidNecessity, vUnpaidNecessity);
            });

            // update necessity bill
            const qNecessityBill = "update necessity_bill set date_paid = ? , payment_status = ? where necessity_bill_id = ?;";
            const vNecessityBill = [currentDate, true, billId];
            await connection.execute(qNecessityBill, vNecessityBill);

            // gets updated necessities of tenant
            const qUpdatedNecessities = "select distinct necessity.necessity_id, necessity.necessity_type, necessity.necessity_fee from necessity inner join necessity_fee on necessity.necessity_id = necessity_fee.necessity_id inner join necessity_bill on necessity_fee.necessity_bill_id = necessity_bill.necessity_bill_id inner join contract on necessity_bill.contract_id = contract.contract_id where contract.contract_id = ? order by necessity.necessity_type;";
            const vUpdatedNecessities = [contractId];
            const [updatedNecessites] = await connection.execute(qUpdatedNecessities, vUpdatedNecessities);

            // new total of necessity
            const newNecessityTotal = updatedNecessites.reduce((accumulator, currentValue) => {
                return accumulator + Number(currentValue.necessity_fee);
            }, 0);


            // ----------------------------------- //
            // check if there is a bill for next month
            const qExistingBill = "select * from necessity_bill where contract_id = ? and bill_due = ? and payment_status = false";
            const vExistingBillValues = [contractId, newBillDue];
            const [existingBill] = await connection.execute(qExistingBill, vExistingBillValues);

            if (existingBill.length < 1) {

                // create new bill
                const newBillId = uid.rnd();;
                const createBill = "insert into necessity_bill (necessity_bill_id,contract_id,bill_due,payment_status,total_bill) values(?,?,?,?,?);";
                const createBillValues = [newBillId, contractId, newBillDue, false, Number(newNecessityTotal)];
                await connection.execute(createBill, createBillValues);

                // create new fees for paid necessitites
                updatedNecessites.forEach(async (necessity) => {
                    const necessityFeeId = uid.rnd();
                    const qNewNecessityFee = "insert into necessity_fee values(?,?,?,?);";
                    const vNewNecessityFeeValues = [necessityFeeId, newBillId, necessity.necessity_id, false];
                    await connection.execute(qNewNecessityFee, vNewNecessityFeeValues);
                });
            }
            // ----------------------------------- //

            // return new necessity bill
            const query = "select necessity_bill.necessity_bill_id, necessity_bill.total_bill, necessity_bill.bill_due, necessity_bill.date_paid, necessity_bill.payment_status from necessity_bill inner join contract on necessity_bill.contract_id = contract.contract_id where necessity_bill.payment_status = false and contract.contract_id = ? order by necessity_bill.bill_due;";
            const values = [contractId];
            const [necessityBills] = await connection.execute(query, values);

            await connection.commit();
            res.status(200).json({
                "message": "pay bill success",
                "data": necessityBills,
            });
        } catch (error) {
            await connection.rollback();
            console.log(error);
            res.status(400).json({
                "message": "failed to pay bill",
            });
        } finally {
            connection.release();
        }
    })
];

exports.newSignature = [
    upload.array('images', 2),
    param("contractId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("dateSigned").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res) => {

        const connection = await pool.getConnection();
        const { contractId } = req.params;
        const { dateSigned, signatories } = req.body;

        const files = req.files;
        try {
            await connection.beginTransaction();

            const signatoryList = JSON.parse(signatories);

            if (files.length < 2) {
                throw new Error("uploaded files less than two");
            }
            if (signatoryList.length < 2) {
                throw new Error("list of signatories incomplete");
            }
            files.forEach(async (file, index) => {
                const signatureId = uid.rnd();
                const qNewSignature = "insert into contract_signature values (?,?,?,?,?)";
                const vNewSignature = [signatureId, contractId, signatoryList[index], file.path, dateSigned];
                await connection.execute(qNewSignature, vNewSignature);
            });

            await connection.commit();

            res.status(200).json({
                'landlordSignature': files[0].path,
                'tenantSignature': files[1].path,
            });

        } catch (error) {
            console.log(error);
            res.status(400).send("An error storing the images went wrong");
        } finally {
            connection.release();
        }
    })
];


exports.deleteNecessity = [
    param("contractId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    param("necessityId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const { contractId, necessityId } = req.params;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // delete necessity_fee
            const qDeleteFees = "delete from necessity_fee where necessity_id = ?";
            const vDeleteFees = [necessityId];
            await connection.execute(qDeleteFees, vDeleteFees);

            // delete necessity
            const qDeleteNecessity = "delete from necessity where necessity_id = ?";
            const vDeleteNecessity = [necessityId];
            await connection.execute(qDeleteNecessity, vDeleteNecessity);

            // retrieve updated necessity list
            const query = "select distinct necessity.necessity_id, necessity.necessity_type, necessity.necessity_fee from necessity inner join necessity_fee on necessity.necessity_id = necessity_fee.necessity_id inner join necessity_bill on necessity_fee.necessity_bill_id = necessity_bill.necessity_bill_id inner join contract on necessity_bill.contract_id = contract.contract_id where contract.contract_id = ? order by necessity.necessity_type;";
            const values = [contractId];
            const [necessityList] = await connection.execute(query, values);

            await connection.commit();
            res.status(200).json(necessityList);
        } catch (error) {
            await connection.rollback();
            console.log(error);
            res.status(400).send("Failed to delete necessity");
        } finally {
            connection.release();
        }
    })
];