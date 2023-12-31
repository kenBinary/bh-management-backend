const asyncHandler = require('express-async-handler')
const pool = require('../models/dbPool');

exports.getMonthlyRevenue = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const revenue = await connection.query("SELECT * FROM v_monthly_revenue;");
    const totalRevenue = revenue.reduce((accumulator, currentValue) => accumulator + currentValue.fee, 0);
    connection.end();
    res.json({
        revenue: totalRevenue
    });
});
exports.getYearlyRevenue = asyncHandler(async (req, res, next) => {
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
    res.json(data);
});

exports.getTotalTenants = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const totalTenants = await connection.query("SELECT COUNT(*) AS total_tenants FROM tenant WHERE occupancy_status = TRUE;");
    connection.end();
    res.json({
        total_tenants: parseInt(totalTenants[0].total_tenants)
    });
});

exports.getVacantRooms = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const vacant = await connection.query("SELECT COUNT(*) as total FROM room WHERE room_status = FALSE;");
    connection.end();
    res.json({
        total_vacant: parseInt(vacant[0].total)
    });
});

exports.getRentCollections = asyncHandler(async (req, res, next) => {
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
});

exports.getRoomOverview = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    const rooms = await connection.query("SELECT COUNT(room_status) AS x FROM room GROUP BY (room_status);");
    const data = [
        { name: "vacant", value: parseInt(rooms[0].x) },
        { name: "occupied", value: parseInt(rooms[1].x) },
    ]
    connection.end();
    res.json(data);
});

exports.getPaymentCategories = asyncHandler(async (req, res, next) => {
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
});

exports.getPaymentRatio = asyncHandler(async (req, res, next) => {
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
});