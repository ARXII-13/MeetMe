var express = require("express");
var router = express.Router();
var db = require("../models/sequelize.js"); //includes all models

var groupController = require("../controllers/group.js");
var userController = require("../controllers/user.js");
var eventController = require("../controllers/event.js");

/* POST new group */
//Request body: {groupName: <string>}
router.post("/createGroup", groupController.createGroup, groupController.addUser);

/* PUT (edit) existing group info (currently can only change group name) */
//Request header: {groupId: <int>}, body: {groupName: <string>}
router.put("/editGroup", groupController.findGroup, groupController.authenticatePermissions, groupController.editGroup);

/* GET information for one group, including users */
//TODO: Add validation for checking if user is a member
//Request header: {groupId: <int>}
router.get("/getGroupInfo", groupController.findGroup, groupController.getGroupInfo);

/* POST join logged in user to group by groupId */
//Request header: {groupId: <int>}
router.post("/joinGroup", groupController.findGroup, groupController.addUser);

/* PUT request to remove group member */
//Request header: {groupId: <int>}, body: {userId: <int>}
router.put("/removeMember", groupController.findGroup, groupController.removeUser);

/* GET events for some group*/
//Request header: {groupId: <int>}
router.get('/getEvents',groupController.findGroup, groupController.getEvents);




module.exports = router;
