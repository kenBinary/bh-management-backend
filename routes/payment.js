const express = require('express');
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.get("/recent", paymentController.getRecentPayments);

router.get("/room-fee", paymentController.getRoomFees);

router.get("/room-fee/unpaid", paymentController.getUnpaidRoomFees);

router.get("/room-fee/:id", paymentController.getRoomFee);

router.put("/room-fee/:id/pay", paymentController.payRoomFee);

router.get("/necessity-fee", paymentController.getNecessityFees);

router.get("/necessity-fee/unpaid", paymentController.getUnpaidNecessityFees);

router.get("/necessity-fee/:id", paymentController.getNecessityFee);

router.put("/necessity-fee/:id/pay", paymentController.payNecessityFee);

router.get("/utility-fee", paymentController.getUtilityFees);

router.get("/utility-fee/unpaid", paymentController.getUnpaidUtilityFees);

router.get("/utility-fee/:id", paymentController.getUtilityFee);

router.put("/utility-fee/:id/pay", paymentController.payUtilityfee);

module.exports = router;