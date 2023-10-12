
const express = require('express');
const router = express.Router();
const pool = require('../models/dbPool');
const asyncHandler = require('express-async-handler')
router.get("/yearly-revenue", asyncHandler(async (req, res, next) => {
    // get yearly revenue
    const data = [
        { name: 'Jan', value: 0 },
        { name: 'Feb', value: 0 },
        { name: 'Mar', value: 0 },
        { name: 'Apr', value: 0 },
        { name: 'May', value: 0 },
        { name: 'June', value: 0 },
        { name: 'July', value: 0 },
        { name: 'Aug', value: 0 },
        { name: 'Sep', value: 0 },
        { name: 'Oct', value: 0 },
        { name: 'Nov', value: 0 },
        { name: 'Dec', value: 0 }
    ];
    const connection = await pool.getConnection();
    for (let i = 1; i <= 12; i++) {
        const revenue = await connection.query(`call p_test(${i})`);
        const x = revenue.flat().filter((element, index, array) => {
            if (!(index === array.length - 1)) {
                return true;
            }
        })
        if (x.length > 0) {
            const totalRevenue = x.reduce((accumulator, currentValue) => accumulator + currentValue.fee, 0);
            data[i - 1].value = totalRevenue;
        }
    }
    connection.end();
    // res.json(x);
    res.json(data);
}));
router.get("/monthly-revenue", asyncHandler(async (req, res, next) => {
    // get recent payments
    const connection = await pool.getConnection();
    const revenue = await connection.query("SELECT * FROM v_monthly_revenue;");
    // let totalRevenue = 0;
    // revenue.forEach((element) => {
    //     totalRevenue += element.fee;
    // });
    const totalRevenue = revenue.reduce((accumulator, currentValue) => accumulator + currentValue.fee, 0);
    connection.end();
    res.json({
        revenue: totalRevenue
    });
}));
router.get("/total-tenants", asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const totalTenants = await connection.query("SELECT COUNT(*) AS total_tenants FROM tenant WHERE occupancy_status = TRUE;");
    connection.end();
    res.json({
        total_tenants: parseInt(totalTenants[0].total_tenants)
    });
}));
router.get("/vacant-rooms", asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const vacant = await connection.query("SELECT COUNT(*) as total FROM room WHERE room_status = FALSE;");
    connection.end();
    res.json({
        total_vacant: parseInt(vacant[0].total)
    });
}));
router.get("/rent-collection", asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rentCollection = await connection.query("SELECT * FROM v_rent_collection;");
    connection.end();
    let total = 0
    if (rentCollection.length > 0) {
    }
    console.log(rentCollection)
    res.json({
        total: parseInt(total)
    });
}));
module.exports = router;