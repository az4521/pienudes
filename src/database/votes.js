"use strict";
var db = require("../database");

var noop = function () { };

module.exports = {
    init: function () {
    },
    
    fetch: function(user_id, media_id, callback) {
        callback = callback || noop;
        
        db.query(
            "SELECT * FROM `votes` WHERE `user_id` = ? AND `media_id` = ? LIMIT 1",
            [user_id, media_id],
            function(err, rows) {
                if (err) return callback(err, false);
                if (rows.length == 0) return callback(null, null);
                callback(null, rows[0]);
            }
        );
    },
    
    fetchVotes: function(media_id, callback) {
        callback = callback || noop;
        
        db.query(
            "SELECT value FROM `votes` WHERE `media_id` = ?",
            [media_id],
            function(err, rows) {
                if (err) return callback(err);
                
                var votes = {
                    up: 0,
                    down: 0
                };
                rows.forEach(function(row) {
                    if (row.value == -1) {
                        votes.down++;
                    } else {
                        votes.up++;
                    }
                });
                callback(null, votes);
            }
        );
    },
    
    fetchByMediaId: function(media_id, callback) {
        callback = callback || noop;
    
        db.query(
            "SELECT * FROM `votes` WHERE `media_id` = ?",
            [media_id],
            callback
        );
    },
    
    fetchUpvotedByUser: function(user_id, limit, offset, callback) {
        callback = callback || noop;
    
        limit  = limit || 50;
        offset = offset || 0;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit)) {
            limit = 50;
        }
        if (isNaN(offset)) {
            offset = 0;
        }
    
        db.query(
            "SELECT *, `votes`.`time` AS `time` FROM `votes` INNER JOIN `media` ON `media`.`id` = `votes`.`media_id` WHERE `user_id` = ? AND `value` = 1 ORDER BY `votes`.`id` DESC LIMIT " + offset + "," + limit,
            [user_id],
            callback
        );
    },
    
    fetchDownvotedByUser: function(user_id, limit, offset, callback) {
        callback = callback || noop;
        
        limit  = limit || 50;
        offset = offset || 0;
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (isNaN(limit)) {
            limit = 50;
        }
        if (isNaN(offset)) {
            offset = 0;
        }
        
        db.query(
            "SELECT *, `votes`.`time` AS `time` FROM `votes` INNER JOIN `media` ON `media`.`id` = `votes`.`media_id` WHERE `user_id` = ? AND `value` = -1 ORDER BY `votes`.`id` DESC LIMIT " + offset + "," + limit,
            [user_id],
            callback
        );
    },
    
    fetchMostUpvoted: function(limit, callback) {
        callback = callback || noop;
        
        limit = limit || 25;
        limit = parseInt(limit);
        if (isNaN(limit)) {
            limit = 25;
        }

        db.query(
            "SELECT `media`.*, `votes`.*, SUM(`value`) AS `vote_count` " +
            "FROM `votes` " +
            "INNER JOIN `media` ON `media`.`id` = `votes`.`media_id` " +
            "GROUP BY `votes`.`media_id` " + 
            "ORDER BY `vote_count` DESC " +
            "LIMIT " + limit,
            [],
            callback
        );
    },
    
    fetchMostUpvotedByDate: function(date, limit, callback) {
        callback = callback || noop;
        
        limit = limit || 25;
        limit = parseInt(limit);
        if (isNaN(limit)) {
            limit = 25;
        }
    
        var start = date + " 00:00:00";
        var end   = date + " 23:59:59";
        
        db.query(
            "SELECT `media`.*, `votes`.*, SUM(`value`) AS `vote_count` " +
            "FROM `votes` " +
            "INNER JOIN `media` ON `media`.`id` = `votes`.`media_id` " +
            "WHERE FROM_UNIXTIME(`votes`.`time` / 1000) BETWEEN ? AND ? " +
            "GROUP BY `votes`.`media_id` " +
            "ORDER BY `vote_count` DESC " +
            "LIMIT " + limit,
            [start, end],
            callback
        );
    },
    
    fetchDistinctDays: function(callback) {
        callback = callback || noop;
        
        db.query("SELECT DISTINCT(DATE_FORMAT(FROM_UNIXTIME(`time` / 1000), '%M %D %Y')) AS `d`, DATE_FORMAT(FROM_UNIXTIME(`time` / 1000), '%Y-%m-%d') AS `s` FROM `votes` ORDER BY `time` DESC", function(err, rows) {
            if (err) return callback(err);
            var dates = [];
            rows.forEach(function(row) {
                dates.push({
                    full: row.d,
                    short: row.s
                });
            });
            callback(null, dates);
        });
    },
    
    insert: function(user_id, media_id, value, callback) {
        callback = callback || noop;
        
        db.query(
            "INSERT INTO `votes` (`user_id`, `media_id`, `value`, `time`) VALUES(?, ?, ?, ?)",
            [user_id, media_id, value, Date.now()],
            callback
        );
    },
    
    update: function(user_id, media_id, value, callback) {
        callback = callback || noop;
        
        db.query(
            "UPDATE `votes` SET `value` = ? WHERE `user_id` = ? AND `media_id` = ? LIMIT 1",
            [value, user_id, media_id],
            callback
        );
    },
    
    remove: function(user_id, media_id, callback) {
        callback = callback || noop;
    
        db.query(
            "DELETE FROM `votes` WHERE `user_id` = ? AND `media_id` = ? LIMIT 1",
            [user_id, media_id],
            callback
        );
    },
    
    countUpvotedByUser: function(user_id, callback) {
        callback = callback || noop;
    
        db.query("SELECT COUNT(*) AS `cnt` FROM `votes` WHERE `user_id` = ? AND `value` = 1", [user_id], function(err, rows) {
            if (err) {
                callback(err, []);
                return;
            }
            callback(null, rows[0]["cnt"]);
        });
    },
    
    countDownvotedByUser: function(user_id, callback) {
        callback = callback || noop;
        
        db.query("SELECT COUNT(*) AS `cnt` FROM `votes` WHERE `user_id` = ? AND `value` = -1", [user_id], function(err, rows) {
            if (err) {
                callback(err, []);
                return;
            }
            callback(null, rows[0]["cnt"]);
        });
    },
    
    countLikesByUser: function(name, callback) {
        callback = callback || noop;
        
        db.query(
            "SELECT SUM(`votes`.`value`) AS `likes` FROM `votes` INNER JOIN `playlist_history` AS `ph` ON `ph`.`media_id` = `votes`.`media_id` WHERE `ph`.`user` = ?",
            [name],
            function(err, rows) {
                if (err) return callback(err);
                callback(null, rows[0].likes || 0)
            }
        );
    }
};