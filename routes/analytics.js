const express = require('express');
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

router.get("/property-metrics", analyticsController.getPropertyMetrics);

router.get("/room-overview", analyticsController.getRoomOverview)

router.get("/yearly-cash-in", analyticsController.getYearlyCashIn)

router.get("/payment-categories", analyticsController.getPaymentCategories);

router.get("/payment-ratio-status", analyticsController.getPaymentRatioStatus);

router.get("/recent-payments", analyticsController.getRecentPayments);

module.exports = router;