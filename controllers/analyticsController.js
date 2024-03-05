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
        console.log(roomOverview);
        // [{ count: 2 }, { count: 15 }]

        let data = null;
        if (roomOverview.length < 2) {
            data = [
                { name: "vacant", value: roomOverview[0].count },
            ]
        } else {
            data = [
                { name: "occupied", value: roomOverview[0].count },
                { name: "vacant", value: roomOverview[1].count },
            ]
        }
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

exports.getPaymentCategories = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    try {

        let paymentCategories = [
            { "name": "Necessity", "value": 0 },
            { "name": "Room", "value": 0 }
        ]

        // Monthly Cash in 
        const necessityBillQuery = "select sum(total_bill) as necessityTotal from necessity_bill where month(date_paid) = month(current_date());";
        const roomUtilityBillQuery = "select sum(total_bill) as roomUtilityTotal from room_utility_bill where month(date_paid) = month(current_date());";

        const [necessityTotal] = await connection.query(necessityBillQuery);
        const [roomUtilityTotal] = await connection.query(roomUtilityBillQuery);
        // [{ necessityTotal: '150' }] || [{ necessityTotal: null }]
        // [{ roomUtilityTotal: '2900' }] || [{ roomUtilityTotal: null }]

        paymentCategories[0]["value"] = (necessityTotal[0].necessityTotal) ? Number(necessityTotal[0].necessityTotal) : 0;
        paymentCategories[1]["value"] = (roomUtilityTotal[0].roomUtilityTotal) ? Number(roomUtilityTotal[0].roomUtilityTotal) : 0;

        res.status(200).json(paymentCategories);

    } catch (error) {
        console.error(error);
        res.status(400).send("failed to get payment categories");

    } finally {
        connection.release();
    }
});

exports.getPaymentRatioStatus = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    try {

        let paymentRatioStatus = [
            {
                "name": "Unpaid",
                "value": 0
            },
            {
                "name": "Paid",
                "value": 0
            },
        ]

        // bill unpaid/paid ratio 
        const vRoomUtilityBill = "select count(payment_status) as ratio from necessity_bill where month(bill_due) = month(current_date()) group by payment_status order by payment_status;";

        const [roomUtilityRatio] = await connection.query(vRoomUtilityBill);
        // [{ ratio: 1 }, { ratio: 2 }] || []

        if (roomUtilityRatio.length > 0) {
            paymentRatioStatus[0]["value"] = roomUtilityRatio[0]["ratio"];
            paymentRatioStatus[1]["value"] = roomUtilityRatio[1]["ratio"];
        }

        res.status(200).json(paymentRatioStatus);

    } catch (error) {
        console.error(error);
        res.status(400).send("failed to get payment categories");

    } finally {
        connection.release();
    }
});


exports.getRecentPayments = asyncHandler(async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        // {
        //     "firstHeader": 1,
        //     "secondHeader": 2,
        //     "thirdHeader": 3,
        // }
        const [necessityBills] = await connection.query(`select "Necessity" as 'Bill Type', concat(tenant.first_name," ", tenant.last_name) as 'Full Name', date_format(date_paid, "%M %d, %Y") as 'Date Paid', total_bill as 'Total Bill'  from necessity_bill inner join contract on contract.contract_id = necessity_bill.contract_id inner join tenant on tenant.tenant_id = contract.tenant_id where payment_status = true and month(date_paid) = month(current_date());`);
        const [roomUtilityBills] = await connection.query(`select "Room" as 'Bill Type', concat(tenant.first_name," ", tenant.last_name) as 'Full Name', date_format(date_paid, "%M %d, %Y") as 'Date Paid', total_bill as 'Total Bill'  from room_utility_bill inner join contract on contract.contract_id = room_utility_bill.contract_id inner join tenant on tenant.tenant_id = contract.tenant_id where payment_status = true and month(date_paid) = month(current_date());`);
        // [
        //     {
        //         'Bill Type': 'Necessity',
        //         'Full Name': 'beerus sama',
        //         'Date Paid': '2024-02-24',
        //         'Total Bill': 150
        //     },
        //     {
        //         'Bill Type': 'Necessity',
        //         'Full Name': 'test test',
        //         'Date Paid': '2024-02-25',
        //         'Total Bill': 100
        //     }
        // ]
        // [
        //     {
        //         'Bill Type': 'Room',
        //         'Full Name': 'beerus sama',
        //         'Date Paid': '2024-02-24',
        //         'Total Bill': 2900
        //     },
        //     {
        //         'Bill Type': 'Room',
        //         'Full Name': 'test test',
        //         'Date Paid': '2024-02-25',
        //         'Total Bill': 2900
        //     }
        // ]
        const data = [...necessityBills, ...roomUtilityBills].sort((a, b) => {
            return a['Full Name'].localeCompare(b['Full Name'])
        });

        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(400).send("failed to get recent payments");

    } finally {
        connection.release();
    }

});

// ------------------- //


