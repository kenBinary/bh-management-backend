const express = require('express');
const router = express.Router();
const roomController = require("../controllers/roomController");

router.get("/", roomController.getRooms);

router.get("/:roomId/tenant", roomController.getTenantsFromRoom);

router.post("/:roomId/assign-room", roomController.assignRoom);

router.put("/:roomId/remove-room", roomController.freeRoom);

module.exports = router;