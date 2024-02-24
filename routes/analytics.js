const express = require('express');
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

router.get("/property-metrics", analyticsController.getPropertyMetrics);

// 
router.get("/yearly-revenue", analyticsController.getYearlyRevenue);

router.get("/monthly-revenue", analyticsController.getMonthlyRevenue);

router.get("/total-tenants", analyticsController.getTotalTenants);

router.get("/vacant-rooms", analyticsController.getVacantRooms);

router.get("/rent-collection", analyticsController.getRentCollections);

router.get("/room-overview", analyticsController.getRoomOverview)

router.get("/payment-categories", analyticsController.getPaymentCategories);

router.get("/payment-ratio", analyticsController.getPaymentRatio);



module.exports = router;