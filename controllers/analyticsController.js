const pool = require('../models/DbConnection');
const asyncHandler = require('express-async-handler')

exports.getPropertyMetrics = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let metrics = {
            monthlyCashIn: 0,
            totalTenants: 0,
            rentCollections: 0,
            vacantRooms: 0,
        };

        // Monthly Cash in 
        const necessityBillQuery = "select sum(total_bill) as necessityTotal from necessity_bill where month(date_paid) = month(current_date());";
        const roomUtilityBillQuery = "select sum(total_bill) as roomUtilityTotal from room_utility_bill where month(date_paid) = month(current_date());";

        const [necessityTotal] = await connection.query(necessityBillQuery);
        const [roomUtilityTotal] = await connection.query(roomUtilityBillQuery);
        // [{ necessityTotal: '150' }] || [{ necessityTotal: null }]
        // [{ roomUtilityTotal: '2900' }] || [{ roomUtilityTotal: null }]
        if (necessityTotal[0].necessityTotal && roomUtilityTotal[0].roomUtilityTotal) {
            metrics["monthlyCashIn"] = Number(necessityTotal[0].necessityTotal) + Number(roomUtilityTotal[0].roomUtilityTotal);
        }

        // Total Tenants
        const totalTenantsQuery = "select count(*) as totalTenants from tenant inner join contract on tenant.tenant_id = contract.tenant_id;";
        const [totalTenants] = await connection.query(totalTenantsQuery);
        // [{ totalTenants: 1 }] || [ { totalTenants: 0 } ]
        metrics["totalTenants"] = totalTenants[0].totalTenants;

        // Rent Collections
        const necessityBillCollectionQuery = "select count(bill_due) as rentCollection from necessity_bill where month(bill_due) = month(current_date())  and payment_status = false;";
        const roomUtilityBillCollectionQuery = "select count(bill_due) as rentCollection from room_utility_bill where month(bill_due) = month(current_date())  and payment_status = false;";

        const [necessityBillCollection] = await connection.query(necessityBillCollectionQuery);
        const [roomUtilityBillCollection] = await connection.query(roomUtilityBillCollectionQuery);
        // [ { rentCollection: 0 } ]
        // [ { rentCollection: 0 } ]

        metrics["rentCollections"] = roomUtilityBillCollection[0].rentCollection;

        // Total Vacant Rooms
        const vacantRoomsQuery = "select count(room_number) as vacantRooms from room where is_full = false;";

        const [vacantRooms] = await connection.query(vacantRoomsQuery);
        // [ { vacantRooms: 15 } ]

        metrics["vacantRooms"] = vacantRooms[0].vacantRooms;

        res.status(200).json(metrics);

        await connection.commit();
    } catch (error) {
        console.error(error);
        res.status(400).send("failed to get metrics");
    } finally {
        connection.release();
    }
});

exports.getRoomOverview = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    try {

        const [roomOverview] = await connection.query("select count(room_status) as count from room group by(room_status) order by room_status;");
        // [{ count: 2 }, { count: 15 }]
        const data = [
            { name: "occupied", value: roomOverview[0].count },
            { name: "vacant", value: roomOverview[1].count },
        ]
        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(400).send("Failed to get room overview");
    } finally {
        connection.release();
    }
});

exports.getYearlyCashIn = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
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
        for (let i = 1; i <= 12; i++) {

            const qNecessityBill = "select sum(total_bill) as total from necessity_bill where month(date_paid) = ? and year(date_paid) = year(current_date()) and payment_status = true;";
            const vNecessityBill = [i];
            const [necessityBill] = await connection.execute(qNecessityBill, vNecessityBill);
            const necessityTotal = (necessityBill[0]['total']) ? necessityBill[0]['total'] : 0;
            // [{ 'total': null }]
            // [{ 'total': '250' }]


            const qRoomUtilityBill = "select sum(total_bill) as total from room_utility_bill where month(date_paid) = ? and year(date_paid) = year(current_date()) and payment_status = true;";
            const vRoomUtilityBill = [i];
            const [roomUtilityBill] = await connection.execute(qRoomUtilityBill, vRoomUtilityBill);
            // [{ 'total': null }]
            // [{ 'total': '5800' }]
            const roomUtilityTotal = (roomUtilityBill[0]['total']) ? roomUtilityBill[0]['total'] : 0;

            data[i - 1]['value'] = Number(necessityTotal) + Number(roomUtilityTotal);

        }

        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(400).send("Failed to get room overview");
    } finally {
        connection.release();
    }
});

// ------------------- //

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