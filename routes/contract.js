const express = require('express');
const router = express.Router();
const contractController = require("../controllers/contractController");

// router.get('/', tenantController.getTenants);
// router.get('/:contractId', contractController.getContract);

router.post('/', contractController.newContract);

router.get('/:contractId/necessities', contractController.getNecessities);

router.post('/:contractId/necessities', contractController.newNecessity);

module.exports = router;
