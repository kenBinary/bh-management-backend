const express = require('express');
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

router.get("/property-metrics", analyticsController.getPropertyMetrics);

router.get("/room-overview", analyticsController.getRoomOverview)

router.get("/yearly-cash-in", analyticsController.getYearlyCashIn)

router.get("/payment-categories", analyticsController.getPaymentCategories);

router.get("/payment-ratio-status", analyticsController.getPaymentRatioStatus);

// 
router.get("/yearly-revenue", analyticsController.getYearlyRevenue);

router.get("/monthly-revenue", analyticsController.getMonthlyRevenue);

router.get("/total-tenants", analyticsController.getTotalTenants);

router.get("/vacant-rooms", analyticsController.getVacantRooms);

router.get("/rent-collection", analyticsController.getRentCollections);






module.exports = router;