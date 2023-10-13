const express = require('express');
const router = express.Router();
const tenantController = require("../controllers/tenantController");

router.get('/', tenantController.getTenants);

router.post('/', tenantController.newTenant);

router.get("/new-tenants", tenantController.getNewTenants);

router.get("/:tenantid", tenantController.getTenant);

router.put("/:tenantid", tenantController.editTenant);

router.get("/:tenantid/necessity", tenantController.getTenantNecessity);

router.post("/:tenantid/necessity", tenantController.newTenantNecessity);

router.get("/:tenantid/payment-history", tenantController.getPaymentHistory);

router.post("/:tenantid/add-necessity", tenantController.addNecessity);

router.get("/:tenantid/payment-history", tenantController.getPaymentHistory);

module.exports = router;
