// const pool = require('../models/dbPool');
const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')
const { body, param } = require("express-validator");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 10 });
const { format } = require("date-fns");
const path = require('path');
const multer = require('multer')
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "assets/images");
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        cb(null, uid.rnd() + fileExtension)
    },
});
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.svg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
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

exports.sendFile = [
    upload.single('image'),
    asyncHandler(async (req, res, next) => {
        const { path } = req.file;
        res.status(200).json({
            "message": "success",
        });
    })
];

exports.getTenants = asyncHandler(async (req, res, next) => {
    let connection = await pool.getConnection();
    const [results] = await connection.query("SELECT * FROM tenant WHERE archive_status = false ORDER BY last_name ASC;");
    connection.release();
    res.json(results);
});

exports.newTenant = [
    body("firstName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("lastName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("contactNum").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("email").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    upload.single('tenantImage'),
    asyncHandler(async (req, res, next) => {
        const { firstName, lastName, contactNum } = req.body;
        let { email } = req.body;
        const { path: imagePath } = req.file;
        if (!email) {
            email = null;
        }

        const tenantId = uid.rnd();
        const data = {
            tenant_id: tenantId,
            first_name: firstName,
            last_name: lastName,
            occupancy_status: 0,
            contact_number: contactNum,
            archive_status: 0,
            email: email,
            tenant_image: imagePath,
        };

        const connection = await pool.getConnection();
        const query = "INSERT INTO `tenant` (`tenant_id`,`first_name`, `last_name`, `contact_number`,`email`,`tenant_image`) VALUES (?,?,?,?,?,?)";
        const values = [tenantId, firstName, lastName, contactNum, email, imagePath];
        await connection.execute(query, values);
        connection.release();

        res.status(200).json({
            "message": "Tenant Created",
            "data": data,
        });
    })
];

exports.getTenant = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
    let connection = await pool.getConnection();
    const [results] = await connection.execute("SELECT * from tenant where tenant_id = ?", [tenantId]);
    connection.release();
    res.json(results)
});

exports.editTenant = [
    param("tenantid").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newFirstName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newLastName").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newContactNum").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newEmail").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    upload.single('newImage'),
    asyncHandler(async (req, res, next) => {
        const { tenantid } = req.params;
        const { newFirstName, newLastName, newContactNum } = req.body;
        let { newEmail } = req.body;
        if (!newEmail) {
            newEmail = null;
        }

        const data = {
            tenant_id: tenantid,
            first_name: newFirstName,
            last_name: newLastName,
            contact_number: newContactNum,
            email: newEmail,
            tenant_image: req.file.path
        };


        const connection = await pool.getConnection();
        const [previousImage] = await connection.execute("select tenant_image from tenant where tenant_id = ?", [tenantid]);

        let message = "record updated";
        if (previousImage[0].tenant_image) {
            try {
                fs.unlinkSync(previousImage[0].tenant_image);
            } catch (err) {
                message = "record updated but failed to delete image";
            }
        }
        const query = "UPDATE tenant SET first_name = ?, last_name = ?, contact_number = ?, email= ?, tenant_image = ? WHERE tenant_id = ?;";
        const values = [newFirstName, newLastName, newContactNum, newEmail, req.file.path, tenantid];
        await connection.execute(query, values);
        connection.release();

        res.status(200).json({
            "message": message,
            "data": data,
        });
    })
];

exports.getUnassignedTenants = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const query = "select tenant.tenant_id, tenant.first_name, tenant.last_name, contract.contract_id from tenant inner join contract on tenant.tenant_id = contract.tenant_id where tenant.occupancy_status = false;"
    const [data] = await connection.query(query);
    connection.release();
    res.status(200).json(data);
});

exports.getAssignedTenants = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const query = "select tenant.tenant_id, contract.contract_id, tenant.first_name, tenant.last_name from tenant inner join contract on tenant.tenant_id = contract.tenant_id where contract.room_number is not null and contract.room_number != 0;"
        const [data] = await connection.query(query);
        res.status(200).json({
            message: "tenant retrieve success",
            assignedTenants: data,
        });
    } catch (error) {
        res.status(400).json({
            message: "failed to get tenants",
        });
    } finally {
        connection.release();
    }
});

exports.addNecessity = [
    body("newId").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newFee").isInt().trim().escape().isLength({ min: 1 }),
    body("newType").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const id = req.body.newId;
        const fee = req.body.newFee;
        const type = req.body.newType;
        const connection = await pool.getConnection();
        await connection.execute("call p_add_necessity(?,?,?)", [fee, type, id]);
        connection.end();
        res.status(200).json({
            message: "necessity added"
        });
    })
];

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

exports.getTenantNecessity = asyncHandler(async (req, res, next) => {
    const id = req.params.tenantid;
    const connection = await pool.getConnection();
    const rows = await connection.execute("SELECT DISTINCT necessity.necessity_type as 'necessity type', necessity.necessity_fee as 'necessity fee' FROM necessity INNER JOIN necessity_fee ON necessity_fee.necessity_id = necessity.necessity_id INNER JOIN tenant ON necessity_fee.tenant_id = tenant.tenant_id WHERE tenant.tenant_id = ?;", [id]);
    connection.end();
    res.json(rows);
});

exports.newTenantNecessity = [
    param("tenantid").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    body("newFee").isInt().trim().escape().isLength({ min: 1 }),
    body("newType").isAlphanumeric().trim().escape().isLength({ min: 1 }),
    asyncHandler(async (req, res, next) => {
        const id = req.params.tenantid;
        const fee = req.body.newFee;
        const type = req.body.newType;
        const connection = await pool.getConnection();
        await connection.execute("call p_add_necessity(?,?,?)", [fee, type, id]);
        connection.end();
        res.status(200).json({
            message: "necessity added"
        });
    })
];

exports.getPaymentHistory = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
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
exports.getContracts = asyncHandler(async (req, res, next) => {
    const tenantId = req.params.tenantid;
    const connection = await pool.getConnection();
    const [contracts] = await connection.execute("select * from contract where tenant_id = ?", [tenantId]);
    if (contracts.length > 0) {
        const newDate = format(new Date(contracts[0].start_date), "MMM d, yyyy");
        contracts[0].start_date = newDate;
    }
    connection.release();
    res.status(200).json(contracts);
});

exports.editContract = asyncHandler(async (req, res, next) => {
    const { tenantid, contract_id } = req.params;
    const { room_number, end_date, contract_status } = req.body;
    const connection = await pool.getConnection();
    const statementAguments = [room_number, end_date, contract_status, tenantid, contract_id];
    await connection.execute("update contract set room_number = ?, end_date = ?, contract_status = ? where tenant_id = ? and contract_id = ?", statementAguments);
    connection.release();
    res.status(200).json({
        "message": "contract edited"
    });
});

exports.getTenantImage = asyncHandler(async (req, res, next) => {
    const { tenantid } = req.params;
    const connection = await pool.getConnection();
    const query = "SELECT tenant_image from tenant where tenant_id = ?";
    const values = [tenantid];
    const [results] = await connection.execute(query, values);
    if (results.length > 0 && results[0].tenant_image) {
        res.status(200).sendFile(path.join(__dirname, '../', results[0].tenant_image));
    } else {
        res.status(400).json({
            message: "no image for tenant",
        });
    }
    connection.release();
});

exports.getLeaseDetails = asyncHandler(async (req, res, next) => {
    const { tenantid } = req.params;
    const query = "select room.room_number, room_utility_bill.total_bill, contract.start_date, contract.end_date from contract inner join tenant on tenant.tenant_id = contract.tenant_id inner join room_utility_bill on contract.contract_id = room_utility_bill.contract_id inner join room on contract.room_number = room.room_number where tenant.tenant_id = ?;";
    const values = [tenantid];
    const connection = await pool.getConnection();
    try {
        const [data] = await connection.execute(query, values);
        res.status(200).json({
            message: "success",
            data: data,
        });
    } catch (error) {
        res.status(400).json({
            message: "failed to retrieve data",
        });
    } finally {
        connection.release();
    }
});

exports.getCollectionDetails = asyncHandler(async (req, res, next) => {
    const { tenantid } = req.params;
    const connection = await pool.getConnection();

    let collectionDetails = {
        currentInvoices: 0,
        pastDueInvoices: 0,
        totalRent: 0,
        totalNecessity: 0,
        total: 0,
    }

    try {
        // current invoices
        const roomInvoice = "select count(room_utility_bill.bill_due) as count from contract  inner join room_utility_bill on contract.contract_id = room_utility_bill.contract_id where contract.tenant_id = ? and month(room_utility_bill.bill_due) = month(current_date()) + 1;";
        const roomInvoiceValues = [tenantid];
        const [rInvoice] = await connection.execute(roomInvoice, roomInvoiceValues);

        const necessityInvoice = "select count(necessity_bill.bill_due) as count from contract  inner join necessity_bill on contract.contract_id = necessity_bill.contract_id where contract.tenant_id = ? and month(necessity_bill.bill_due) = month(current_date()) + 1;";
        const necessityInvoiceValues = [tenantid];
        const [nInvoice] = await connection.execute(necessityInvoice, necessityInvoiceValues);
        collectionDetails.currentInvoices = rInvoice[0].count + nInvoice[0].count;

        // past due invoices
        const dueRoomInvoice = "select count(room_utility_bill.bill_due) as count from room_utility_bill inner join contract on contract.contract_id = room_utility_bill.contract_id where contract.tenant_id = ? and room_utility_bill.date_paid is null and current_date() > room_utility_bill.bill_due;";
        const dueRoomInvoiceValues = [tenantid];
        const [dRInvoice] = await connection.execute(dueRoomInvoice, dueRoomInvoiceValues);

        const dNecessityInvoice = "select count(necessity_bill.bill_due) as count from necessity_bill inner join contract on contract.contract_id = necessity_bill.contract_id  where contract.tenant_id = ? and necessity_bill.date_paid is null and current_date() > necessity_bill.bill_due;";
        const dNecessityInvoiceValues = [tenantid];
        const [dNInvoice] = await connection.execute(dNecessityInvoice, dNecessityInvoiceValues);
        collectionDetails.pastDueInvoices = dRInvoice[0].count + dNInvoice[0].count;

        // total room fee collected
        const totalRentQuery = "select sum(room_utility_bill.total_bill) as total_rent from tenant inner join contract on tenant.tenant_id = contract.tenant_id inner join room_utility_bill on contract.contract_id = room_utility_bill.contract_id where tenant.tenant_id = ? and room_utility_bill.payment_status = true;";
        const totalRentvalues = [tenantid];
        const [totalRentResult] = await connection.execute(totalRentQuery, totalRentvalues);
        collectionDetails.totalRent = (totalRentResult[0].total_rent) ? totalRentResult[0].total_rent : 0;

        // // total necessity fee collected
        const totalNecessityQuery = "select sum(necessity_bill.total_bill) as total_necessity from tenant inner join contract on tenant.tenant_id = contract.tenant_id inner join necessity_bill on contract.contract_id = necessity_bill.contract_id where tenant.tenant_id = ? and necessity_bill.payment_status = true; ";
        const totalNecessityValues = [tenantid];
        const [totalNecessityResult] = await connection.execute(totalNecessityQuery, totalNecessityValues);
        collectionDetails.totalNecessity = (totalNecessityResult[0].total_necessity) ? totalNecessityResult[0].total_necessity : 0;

        // total
        collectionDetails.total = collectionDetails.totalRent + collectionDetails.totalNecessity;

        res.status(200).json({
            message: "success",
            collectionDetails: collectionDetails,
        });
    } catch (error) {
        res.status(400).json({
            message: "failed to retrieve data",
        });
    } finally {
        connection.release();
    }
});