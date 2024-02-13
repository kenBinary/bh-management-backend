const express = require('express');
const router = express.Router();
const contractController = require("../controllers/contractController");

router.post('/', contractController.newContract);

router.get('/:contractId/necessities', contractController.getNecessities);

router.post('/:contractId/necessities', contractController.newNecessity);

router.get('/:contractId/necessity-bills', contractController.getNecessityBills);

router.get('/:contractId/room-utility-bills', contractController.getRoomUtilityBills);

router.post('/:contractId/room-utility-bills/:billId', contractController.payRoomUtilityBill);

router.post('/:contractId/necessity-bills/:billId', contractController.payNecessityBill);


module.exports = router;
