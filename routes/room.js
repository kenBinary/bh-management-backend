const express = require('express');
const router = express.Router();
const roomController = require("../controllers/roomController");

router.get("/", roomController.getRooms);

router.post("/:roomId/assign-room", roomController.assignRoom);

router.put("/:roomId/remove-room", roomController.freeRoom);


// router.get("/", asyncHandler(async (req, res, next) => {
//     // get all room
//     const connection = await pool.getConnection();
//     const rooms = await connection.query("select * from room");
//     connection.end();
//     res.json(rooms);
// }));
// router.post("/", asyncHandler(async (req, res, next) => {
//     // add new room
//     const roomNumber = req.body.roomNumber;
//     const roomType = req.body.roomType;
//     const headCount = req.body.headCount;
//     const roomStatus = req.body.roomStatus;
//     const roomFee = req.body.fee;
//     const connection = await pool.getConnection();
//     await connection.execute("insert into room values(?,?,?,?,?)", [roomNumber, roomType, headCount, roomStatus, roomFee]);
//     connection.end();
//     res.status(200).json({
//         message: "new record added"
//     });
// }));
// router.post("/assign-room", asyncHandler(async (req, res, next) => {
//     // assign tenant to a room
//     const dueYearMonth = format(addMonths(new Date(), 1), 'yyyy-MM');
//     const roomNumber = req.body.roomNumber;
//     const tenantId = req.body.tenantId;
//     const internetTrue = (req.body.internetTrue === true) ? "1" : "0";
//     const currentDue = `${dueYearMonth}-05`;
//     const connection = await pool.getConnection();
//     await connection.execute("CALL p_assign_room(?,?,?,?);", [roomNumber, tenantId, internetTrue, currentDue]);
//     connection.end();
//     res.status(200).json({
//         message: "tenant assigned to room"
//     });
// }));
// router.put("/remove-room", asyncHandler(async (req, res, next) => {
//     // remove tenant from a room
//     const roomNumber = req.body.roomNumber;
//     const tenantId = req.body.tenantId;
//     const connection = await pool.getConnection();
//     await connection.execute("CALL p_remove_tenant_room(?,?);", [roomNumber, tenantId]);
//     connection.end();
//     res.status(200).json({
//         message: "tenant removed from room"
//     });
// }));

// router.get("/status-analytics", asyncHandler(async (req, res, next) => {
//     const connection = await pool.getConnection();
//     const rooms = await connection.query("SELECT COUNT(room_status) AS x FROM room GROUP BY (room_status);");
//     const data = [
//         { name: "vacant", value: parseInt(rooms[0].x)},
//         { name:"occupied", value: parseInt(rooms[1].x)},
//     ]
//     connection.end();
//     res.json(data);
// }));

module.exports = router;