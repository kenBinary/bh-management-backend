const express = require('express');
const router = express.Router();
const roomController = require("../controllers/roomController");

router.get("/", roomController.getRooms);

router.get("/:room_number/tenants", roomController.getTenantsFromRoom);

router.post("/:room_number/tenants", roomController.assignRoom);

// fix route to include tenantID as param and not body
router.put("/:room_number/tenants", roomController.freeRoom);

module.exports = router;