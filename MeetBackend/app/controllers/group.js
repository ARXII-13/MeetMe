var db = require("../models/sequelize.js");
const Op = db.Sequelize.Op;
var moment = require("moment");
var notificationController = require("../controllers/notification.js");

const MAX_GROUP_USERS = 10; // Max allowed users per group

//Colour array for dot events
const COLOURS = ["red", "orange", "yellow", "green", "blue", "purple"];

const DAYS_IN_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];


/* Middlewares for handling group related requests */

/*
Edits a group specified by req.group
Group edit parameters are in req.body: (groupName, description)
 */
exports.editGroup = function(req, res, next) {
    var group = req.group;
    group.update({
        groupName: req.body.groupName,
        description: req.body.groupDescription
    }).then(function(updatedInfo) {

        return res.status(200).json({
            updatedInfo,
            message: "Successful group edit"
        });
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: Group could not be edited"
        });
    });
};


/*
Edits a group specified by req.group
Group edit parameters are in req.body: (description)
 */
exports.editGroupDescription = function(req, res, next) {
    var group = req.group;
    group.update({
        description: req.body.groupDescription
    }).then(function(updatedInfo) {
        return res.status(200).json({
            updatedInfo,
            message: "Successful group description edit"
        });
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: Group description could not be edited"
        });
    });
};


/*
Gets group info specified by req.group
Includes user info as well
 */
exports.getGroupInfo = function(req, res, next) {
    var groupInfo = req.groupInfo;
    return res.status(200).json({
        groupInfo,
        message: "Successful group retrieval"
    });
};


/*
Gets events from group specified by req.group
 */
exports.getEvents = function(req, res, next) {
    var group = req.group;
    group.getEvents({
        raw: true
    }).then(function(events) {

        var events = exports.sortEvents(events);
        return res.status(200).json({
            events,
            message: "Successful event retrieval"
        });
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: Events could not be retrieved"
        });
    });
}


/*
Helper function for get events, sorts events in chronological order and
categorized by date, with index and colour fields
 */
exports.sortEvents = function(events) {

    if (events.constructor !== Array) {
        throw Error("Not an array");
    }

    events.sort(function(a, b) { //sort raw events list by chronological order
        return new Date(a.startTime) - new Date(b.startTime);
    });

    var sortedEvents = {}; //Contains return JSON object, containing both categorized and dot events
    var categorizedEvents = {}; //Contains sorted event info grouped by sorted date
    var dotEvents = {}; //Contains colours to represent events, grouped by sorted date
    for (var i = 0; i < events.length; i++) {
        var eventDate = moment.utc(events[i].startTime).format("YYYY-MM-DD"); // no time
        if (!(eventDate in categorizedEvents)) { //add key if doesnt exist
            categorizedEvents[eventDate] = [];
            dotEvents[eventDate] = {
                "dots": []
            };
        }
        categorizedEvents[eventDate].push(events[i]); //add event to correct key
        dotEvents[eventDate]["dots"].push({
            color: COLOURS[Math.floor(Math.random() * COLOURS.length)]
        }); //assign random colour to dot event
    }

    sortedEvents["categorizedEvents"] = categorizedEvents;
    sortedEvents["dotEvents"] = dotEvents;
    return sortedEvents;
}


/*
Adds user specified by user token to target group instance specified by req.group
 */
exports.addUser = function(req, res, next) {
    var group = req.group;
    var groupInfo = group.get();
    var users = req.group.users; //users will be undefined if we are coming from a create group call

    group.addUser(req.user.id).then(function(newUser) {
        if (users !== null && users !== "undefined" && users !== undefined) { // Coming from member join
            return res.status(200).json({
                groupInfo,
                newUser,
                message: "Successful group member join"
            });
        } else {
            return res.status(200).json({
                groupInfo,
                newUser,
                message: "Successful group creation"
            });
        }
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: User could not be added to group"
        });
    });
}


/*
Removes target user specified by req.body.userId from target group instance specified by req.group
 */
exports.removeUser = function(req, res, next) {
    var group = req.group;
    if (req.body.userId == req.user.id) { //cannot remove self
        return res.status(400).json({
            message: "Error: User cannot remove self"
        });
    }

    group.removeUser(req.body.userId).then(function(success) {
        if (success) {
            //Notify target user that he/she was removed
            var notificationDescription = "You have been removed from \"" + req.groupInfo.groupName + "\"";
            var promise = notificationController.addNotification(req.body.userId, notificationDescription, req.user.id);
            promise.then(function() {
                return res.status(200).json({
                    message: "Successful member remove"
                });
            })

        } else {
            return res.status(400).json({
                message: "Error: User does not exist in group"
            });
        }
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: User could not be removed from group"
        });
    });
}


/*
Removes self user (specified by req.user.id) from target group instance specified by req.group
 */
exports.leaveGroup = function(req, res, next) {
    var group = req.group;
    if (group.leaderId == req.user.id) {
        return res.status(400).json({
            message: "Error: Leader of group cannot leave"
        });
    }

    group.removeUser(req.user.id).then(function(success) {
        if (success) {
            return res.status(200).json({
                message: "Successful group leave"
            });
        } else {
            return res.status(400).json({
                message: "Error: User does not exist in group"
            });
        }
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: Something went wrong with leave group"
        });
    });
}


exports.destroyGroup = function(req, res, next) {
    var group = req.group;
    var groupInfo = req.groupInfo
    group.destroy().then(function(success) {
        if (success) {

            var notificationDescription = "\"" + groupInfo.groupName + "\" was disbanded";
            var userIds = groupInfo.users;
            var promises = [];
            for (var i = 0; i < userIds.length; i++) {
                promises.push(notificationController.addNotification(userIds[i].id, notificationDescription, req.user.id))
            }

            //Waits for all notifications to be added
            Promise.all(promises).then(function() {
                return res.status(200).json({
                    message: "Successful group destroy"
                });
            }).catch(function(err) {
                return res.status(200).json({
                    newEventInfo,
                    message: "Successful group destroy, notification error"
                });
            })

        } else {
            return res.status(400).json({
                message: "Error: Group could not be destroyed"
            });
        }
    }).catch(function(err) {
        console.log(err)
        return res.status(400).json({
            message: "Error: Group could not be destroyed"
        });
    });
}


/*
Takes into consideration all user schedules in a group and outputs optimal
user schedules, assumes that day (of week) and date are correctly correlated
 */
exports.getAvailabilities = function(req, res, next) {
    var userThreshold = req.body.userThreshold;
    var timeThreshold = req.body.timeThreshold;
    var day = req.body.day;
    var users = req.group.users;
    var date = req.body.date;

    if (DAYS_IN_WEEK.indexOf(day) <= -1) {
        return res.status(400).json({
            message: "Error: Invalid day field"
        });
    }

    //Begin queries for modified schedules (which considers weekly user availability and
    //events in groups that user belongs to
    var promises = [];
    for (var i = 0; i < users.length; i++) {
        promises.push(exports.filterSchedule(users[i].schedule, date, day, users[i].id));
    }
    //Wait for all runs of filter schedule to finish
    Promise.all(promises).then(function(userSchedules) {
        //If userthreshold is not supplied, set it to 1
        if (!userThreshold) {
            const PERCENT_REQUIRED = 0.6; //default user threshold is 0.6 of total members in group
            userThreshold = Math.ceil(users.length * PERCENT_REQUIRED);
        }

        if (!timeThreshold) {
            timeThreshold = 0.5;
        } else {
            timeThreshold = Math.ceil(timeThreshold * 2) / 2.0; //Round up to nearest 0.5
        }

        var freeTimes = exports.calculateAvailabilities(userSchedules, day, userThreshold, timeThreshold);

        return res.status(200).json({
            freeTimes: freeTimes,
            numUsersInGroup: users.length,
            message: "Successful availabilities calculation"
        });
    });
}


//Helper function to merge user's weekly availability schedule with any events for groups they
//belong to, for a specific day of the week, returns an asynchronous promise that must be
//explicitly waited on
exports.filterSchedule = function(schedule, date, day, userId) {

    return db.user.findOne({
        include: [{
            model: db.group,
            attributes: ["id"], //elements of the group that we want
            through: {
                attributes: []
            }
        }],
        where: {
            id: userId //user must belong to group
        }
    }).then(function(userWithGroups) {
        //construct groupid array
        var groupIds = [];
        for (var i = 0; i < userWithGroups.groups.length; i++) {
            groupIds.push(userWithGroups.groups[i].id);
        }
        return db.event.findAll({
            where: {
                [Op.and]: [{
                    groupId: {
                        [Op.or]: groupIds //All events that belong to groupIds in groups
                    }
                }, db.sequelize.where(db.sequelize.fn("date", db.sequelize.col("startTime")), "=", date)]
            }
        }).then(function(events) {

            for (var i = 0; i < events.length; i++) {

                //Parse start and endtime for each event into hour multiples of .5
                var startTime = parseTime(JSON.stringify(events[i].startTime), 1); //translate the start time to
                var endTime = parseTime(JSON.stringify(events[i].endTime), 0);

                //Anything between startTime and endTime (inclusive) should be purged from the schedule array
                schedule[day] = schedule[day].filter(function(time) {
                    return time < startTime || time >= endTime;
                });

            }

            return schedule;

        }).catch(function(err) { //return unparsed array
            return schedule;
        });
    }).catch(function(err) { //return unparsed array
        return schedule;
    });
}

//Helper function to transform start or endtime into multiple of .5
//isStart == 1 if startTime, 0 if endTime
parseTime = function(timeString, isStart) {
    var retVal;

    //08:00:00.000Z
    timeString = timeString.slice(-14);
    //08:00
    timeString = timeString.slice(0, -8);

    retVal = parseFloat(timeString.slice(0, -3)); //takes hour part of datetime

    minutes = parseFloat(timeString.slice(-2));

    if (isStart) { //round down for a startTime
        if (minutes < 30)
            return retVal;
        else {
            if (retVal + 0.5 >= 24)
                return 23.5;
            else
                return retVal + 0.5;
        }
    } else { //round up for an endTime
        if (minutes >= 30) {
            if (retVal + 1 > 24) //Max possible ret time
                return 24;
            else
                return retVal + 1;
        } else {
            return retVal + 0.5;
        }

    }
}


//Helper function to calculate free availabilties, given a userThreshold AND specified day AND array of user schedules
exports.calculateAvailabilities = function(schedules, day, userThreshold, timeThreshold) {

    var freqTable = {};
    var freeTimes = [];
    //Construct a frequency table for availabilties
    for (var schedule in schedules) {
        //add entry for freq table
        for (var ind in schedules[schedule][day]) {
            var timeSlot = schedules[schedule][day][ind];

            //Check that enough contigent time blocks exist such that user can be free
            var timeValid = true;
            for (var offset = 0.5; offset < timeThreshold; offset += 0.5) {
                if (!schedules[schedule][day].includes(timeSlot + offset)) {
                    timeValid = false;
                    break;
                }
            }

            //Add a timeslot to the freq table if it has enough contigent blocks
            if (timeValid) {
                if (freqTable[timeSlot]) {
                    freqTable[timeSlot]++;
                } else {
                    freqTable[timeSlot] = 1;
                }
            }
        }
    }

    //Filter frequency table those above min userThreshold
    for (var timeSlot in freqTable) {
        if (freqTable[timeSlot] < userThreshold) { //Found a timeslot with acceptable number of people free
            delete freqTable[timeSlot];
            //freeTimes.push(timeSlot);
        }
    }

    //Convert frequency table to array form
    for (time in freqTable) {
        var timeFreq = {
            timeSlot: time,
            numUsersAvailable: freqTable[time]
        };
        freeTimes.push(timeFreq);
    }

    //Order time slot + frequencies based on highest freqs first, then if equal freqs sort by first timeSlots first
    freeTimes.sort(function(a, b) {
        return b.numUsersAvailable - a.numUsersAvailable || a.timeSlot - b.timeSlot;
    });

    return freeTimes;
}


/* HELPER MIDDLEWARES THAT DO NOT RESOLVE A REQUEST, MUST BE USED WITH FUNCTIONS*/

/*
Creates a group specified by req.body.groupName
Attaches the created group instance to req.group
 */
exports.createGroup = function(req, res, next) {
    db.group.create({
        groupName: req.body.groupName,
        leaderId: req.user.id,
        description: req.body.groupDescription
    }).then(function(newGroup) {
        req.group = newGroup;
        req.groupInfo = newGroup.get();
        next();
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: Invalid group creation parameters"
        });
    });
}


/*
Finds a target group specified by req.query.groupId
If the group exists, attaches the found group instance to req.group
 */
exports.findGroup = function(req, res, next) {
    db.group.findOne({
        include: [{
            model: db.user,
            attributes: ["id", "firstname", "lastname", "email", "schedule"], //elements of the group that we want
            through: {
                attributes: []
            }
        }],
        where: {
            id: req.query.groupId
        }
    }).then(function(groupFound) {
        if (!groupFound) {
            return res.status(400).json({
                message: "Error: Invalid group id"
            });
        } else {
            req.group = groupFound; //Can directly perform db operations
            req.groupInfo = groupFound.get(); //Only contains info
            next();
        }
    }).catch(function(err) {
        return res.status(400).json({
            message: "Error: Group could not be found"
        });
    });
}


/*
Authenticates the permissions of the current user (given by the user token)
in a target group specified by req.groupInfo
 */
exports.checkPermissions = function(req, res, next) {
    var groupInfo = req.groupInfo;

    if (req.user.id != groupInfo.leaderId) {
        return res.status(400).json({
            message: "Error: Invalid group permissions"
        });
    } else {
        next();
    }
}


/*
Checks that the current user is a member of the group
 */
exports.checkMembership = function(req, res, next) {
    var group = req.group;
    var groupInfo = group.get();
    var users = group.users;

    var isUserInGroup = false;

    for (var i = 0; i < users.length; i++) {
        if (users[i].id === req.user.id) { //user exists in group
            isUserInGroup = true;
            break;
        }
    }
    if (isUserInGroup) {
        next();
    } else {
        return res.status(400).json({
            message: "Error: User is not a member of this group"
        });
    }
}


/*
Checks if the group is joinable (user is not already in the group AND group is not full)
 */
exports.checkGroupJoinable = function(req, res, next) {
    var users = req.group.users;

    for (var i = 0; i < users.length; i++) {
        if (users[i].id === req.user.id) { //user already exists in group
            return res.status(400).json({
                message: "Error: User already in group"
            });
        }
    }
    var numUsers = users.length;
    if (numUsers >= MAX_GROUP_USERS) {
        return res.status(400).json({
            message: "Error: Group is full and no more members can join"
        });
    }
    next();
}
