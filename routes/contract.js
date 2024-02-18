const express = require('express');
const router = express.Router();
const contractController = require("../controllers/contractController");
const { checkNecessityBillStatus, checkRoomUtilityBillStatus } = require('../middleware/contractMiddleware');

router.post('/', contractController.newContract);

router.get('/:contractId/necessities', contractController.getNecessities);

router.post('/:contractId/necessities', contractController.newNecessity);

router.get('/:contractId/necessity-bills', checkNecessityBillStatus, contractController.getNecessityBills);

router.get('/:contractId/room-utility-bills', checkRoomUtilityBillStatus, contractController.getRoomUtilityBills);

router.post('/:contractId/room-utility-bills/:billId', contractController.payRoomUtilityBill);

router.post('/:contractId/necessity-bills/:billId', contractController.payNecessityBill);


module.exports = router;
