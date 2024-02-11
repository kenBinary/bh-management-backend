const express = require('express');
const router = express.Router();
const tenantController = require("../controllers/tenantController");


router.get('/', tenantController.getTenants);

router.post('/', tenantController.newTenant);

router.get("/unassigned", tenantController.getUnassignedTenants);

router.get("/:tenantid", tenantController.getTenant);

router.put("/:tenantid", tenantController.editTenant);

router.get("/:tenantid/images", tenantController.getTenantImage);

router.get("/:tenantid/lease-details", tenantController.getLeaseDetails);

router.get("/:tenantid/collection-details", tenantController.getCollectionDetails);

router.get("/:tenantid/necessity", tenantController.getTenantNecessity);

router.post("/:tenantid/necessity", tenantController.newTenantNecessity);

router.get("/:tenantid/payment-history", tenantController.getPaymentHistory);

router.post("/:tenantid/add-necessity", tenantController.addNecessity);

router.get("/:tenantid/payment-history", tenantController.getPaymentHistory);

router.get("/:tenantid/contracts/", tenantController.getContracts);

router.put("/:tenantid/contracts/:contract_id", tenantController.editContract);


module.exports = router;
