const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler')

router.get("/recent", asyncHandler(async (req, res, next) => {
    // get recent payments
    const connection = await pool.getConnection();
    const recentPayments = await connection.query("SELECT * FROM v_recent_payments;");
    connection.end();
    res.json(recentPayments);
}));
router.get("/history/:id", asyncHandler(async (req, res, next) => {
    // get recent payments
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
}));


router.get("/analytics/paid-unpaid", asyncHandler(async (req, res, next) => {
    // get unpaid and paid ratio
    let data = [];
    const connection = await pool.getConnection();
    const rows = await connection.query("SELECT COUNT(*) AS x  FROM v_paid_unpaid_analytics WHERE YEAR(due) = YEAR(CURDATE()) AND MONTH(due)=MONTH(CURDATE())+1 GROUP by (is_paid);");
    if (rows.length > 0) {
        data = [
            { name: "paid", value: parseInt(rows[0]?.x) },
            { name: "unpaid", value: parseInt(rows[1]?.x) }
        ]
    }
    else {
        data = [
            { name: "paid", value: 0 },
            { name: "unpaid", value: 0 }
        ]
    }
    connection.end();
    res.json(data);
}));
router.get("/analytics/payment-analytics", asyncHandler(async (req, res, next) => {
    // get payment analytics for room,utility and necessity category for current month
    const connection = await pool.getConnection();
    const recentPayments = await connection.query("CALL p_paid_categories();");
    const arrayOfObjects = [recentPayments[0][0], recentPayments[1][0], recentPayments[2][0]];
    const data = [
        { name: "Room", revenue: parseInt(arrayOfObjects[0]["Room Revenue"]) },
        { name: "Necessity", revenue: parseInt(arrayOfObjects[1]["Necessity Revenue"]) },
        { name: "Utility", revenue: parseInt(arrayOfObjects[2]["Utility Revenue"]) },
    ];
    connection.end();
    res.json(data);
}));




module.exports = router;


// router.get("/analytics/paid-unpaid", asyncHandler(async (req, res, next) => {
//     // get unpaid and paid ratio
//     // const rows = await connection.query("SELECT COUNT(*) AS x  FROM v_paid_unpaid_analytics WHERE YEAR(due) = YEAR(CURDATE()) AND MONTH(due)=MONTH(CURDATE())+1 GROUP by (is_paid);");
//     let data = [];
//     let month = req.query.month;
//     const connection = await pool.getConnection();
//     const rows = await connection.query(`SELECT COUNT(*) AS x  FROM v_paid_unpaid_analytics WHERE YEAR(due) = YEAR(CURDATE()) AND MONTH(due)=${month} GROUP by (is_paid);`);
//     console.log(rows)
//     if (rows.length > 0) {
//         data = [
//             { name: "paid", value: parseInt(rows[0]?.x) },
//             { name: "unpaid", value: parseInt(rows[1]?.x) }
//         ]
//     }
//     else {
//         data = [
//             { name: "paid", value: 0 },
//             { name: "unpaid", value: 0 }
//         ]
//     }
//     connection.end();
//     res.json(data);
// }));