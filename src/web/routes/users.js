"use strict";

var multer  = require('multer');
var AWS     = require('aws-sdk');
var fs      = require('fs');
var Jimp    = require("jimp");
import template from '../template';
import Config from '../../config';
import db from '../../database';
import db_playlists from '../../database/playlist';
import db_accounts from '../../database/accounts';
import db_votes from '../../database/votes';
import xss from '../../xss';

const ONEMB = (1024 * 1024);

var upload_avatar = multer({
    dest: '/tmp',
    limits: {
        fileSize: ONEMB
    }
});

var upload_header = multer({
    dest: '/tmp',
    limits: {
        fileSize: (5 * ONEMB)
    }
});

function handleProfile(req, res) {
    var name = req.params.name;
    var page = req.params.page;
    if (page == undefined) {
        page = 1;
    }
    if (page < 1) {
        page = 1;
    }
    
    db_accounts.getUser(name, function(err, user) {
        if (err == "User does not exist") {
            return template.send(res, 'error/http', {
                path: req.path,
                status: 404,
                message: err
            });
        }
        
        if (user.profile == "") {
            user.profile = {image: "", text: "", bio: "", header: ""};
        } else {
            user.profile = JSON.parse(user.profile);
        }
    
        db_votes.countLikesByUser(user.name, function(err, likes) {
            if (err) {
                return template.send(res, 'error/http', {
                    status: 500
                });
            }
            
            db_playlists.countByUser(name, function(err, count) {
                if (err) {
                    return template.send(res, 'error/http', {
                        status: 500
                    });
                }
        
                if (count == 0) {
                    return template.send(res, 'users/profile', {
                        pageTitle: req.params.name,
                        pageTab: "home",
                        user: user,
                        media: [],
                        media_count: 0,
                        likes: likes,
                        page:  1,
                        pages: 1
                    });
                }
        
                var limit  = 50;
                var pages  = Math.ceil(count / limit);
                if (page > pages) {
                    page = pages;
                }
                var offset = (page - 1) * limit;
        
                db_playlists.fetchByUser(name, limit, offset, function(err, rows) {
                    if (err) {
                        return template.send(res, 'error/http', {
                            status: 500
                        });
                    }
            
                    template.send(res, 'users/profile', {
                        pageTitle: req.params.name,
                        pageTab: "home",
                        user: user,
                        media: rows,
                        media_count: count,
                        likes: likes,
                        page:  parseInt(page),
                        pages: parseInt(pages)
                    });
                });
            });
        });
    });
}

function handleProfileBioSave(req, res) {
    
    db.users.getProfile(req.user.name, function(err, profile) {
        if (err) {
            res.json({
                message: "Failed to fetch profile information."
            }, 500);
        }
    
        var header = req.body.header;
        var image  = req.body.image;
        var text   = req.body.text.substring(0, 50);
        var bio    = xss.sanitizeHTML(req.body.bio.substring(0, 1000));
        var meta   = {
            image:  image,
            header: header,
            text:   text,
            bio:    bio
        };
        
        db.users.setProfile(req.user.name, meta, function (err) {
            if (err) {
                res.json({
                    message: "Failed to save profile information."
                }, 500);
            }
            
            res.json({
                text: text,
                bio: bio,
                image: profile.image,
                header: "#9609B5"
            });
        });
    });
}

function handleProfileAvatarSave(req, res) {
    
    db.users.getProfile(req.user.name, function(err, profile) {
        if (err) {
            res.json({
                message: "Failed to fetch profile information."
            }, 500);
        }
        
        Jimp.read(req.file.path)
            .then(function(image) {
                image.resize(80, 80);
                image.getBuffer("image/png", function(err, buff) {
                    if (err) throw err;
                
                    var filename = "profiles/avatars/" + req.user.name + "-" + Date.now() + ".png";
                    var bucket   = new AWS.S3({params: {Bucket: Config.get("uploads.s3_bucket")}});
                    var params   = {
                        Key:         filename,
                        Body:        buff,
                        ContentType: req.file.mimetype,
                        ACL:         'public-read'
                    };
                    bucket.upload(params, function(err) {
                        if (err) throw err;
    
                        res.json({
                            image: Config.get("uploads.uploads_url") + filename
                        });
                    });
                });
            })
            .catch(function(err) {
            
            });
    });
}

function handleProfileHeaderSave(req, res) {
    db.users.getProfile(req.user.name, function(err, profile) {
        if (err) {
            res.json({
                message: "Failed to fetch profile information."
            }, 500);
        }
        
        Jimp.read(req.file.path)
            .then(function(image) {
                image.quality(75);
                image.getBuffer("image/jpeg", function(err, buff) {
                    if (err) throw err;
                    
                    var filename = "profiles/headers/" + req.user.name + "-" + Date.now() + ".jpg";
                    var bucket   = new AWS.S3({params: {Bucket: Config.get("uploads.s3_bucket")}});
                    var params   = {
                        Key:         filename,
                        Body:        buff,
                        ContentType: req.file.mimetype,
                        ACL:         'public-read'
                    };
                    bucket.upload(params, function(err) {
                        if (err) throw err;
                        
                        res.json({
                            src: Config.get("uploads.uploads_url") + filename
                        });
                    });
                });
            })
            .catch(function(err) {
                
            });
    });
}

function handleUpvotes(req, res) {
    var name = req.params.name;
    var page = req.params.page;
    if (page == undefined) {
        page = 1;
    }
    if (page < 1) {
        page = 1;
    }
    
    db_accounts.getUser(name, function(err, user) {
        if (err == "User does not exist") {
            return template.send(res, 'error/http', {
                path: req.path,
                status: 404,
                message: err
            });
        }
    
        if (user.profile == "") {
            user.profile = {image: "", text: ""};
        } else {
            user.profile = JSON.parse(user.profile);
        }
    
        db_votes.countLikesByUser(user.name, function(err, likes) {
            if (err) {
                return template.send(res, 'error/http', {
                    status: 500
                });
            }
    
            db_votes.countUpvotedByUser(user.id, function(err, count) {
                if (err) {
                    return template.send(res, 'error/http', {
                        status: 500
                    });
                }
        
                if (count == 0) {
                    return template.send(res, 'users/upvotes', {
                        pageTitle: name + "'s Up Votes",
                        pageTab: "upvotes",
                        user: user,
                        media: [],
                        media_count: 0,
                        likes: likes,
                        page:  1,
                        pages: 1
                    });
                }
        
                var limit  = 100;
                var pages  = Math.ceil(count / limit);
                if (page > pages) {
                    page = pages;
                }
                var offset = (page - 1) * limit;
        
                db_votes.fetchUpvotedByUser(user.id, limit, offset, function(err, rows) {
                    if (err) {
                        return template.send(res, 'error/http', {
                            status: 500
                        });
                    }
            
                    template.send(res, 'users/upvotes', {
                        pageTitle: name + "'s Up Votes",
                        pageTab: "upvotes",
                        user: user,
                        media: rows,
                        media_count: count,
                        likes: likes,
                        page:  parseInt(page),
                        pages: parseInt(pages)
                    });
                });
            });
        });
    });
}

function handleDownvotes(req, res) {
    var name = req.params.name;
    var page = req.params.page;
    if (page == undefined) {
        page = 1;
    }
    if (page < 1) {
        page = 1;
    }
    
    db_accounts.getUser(name, function(err, user) {
        if (err == "User does not exist") {
            return template.send(res, 'error/http', {
                path: req.path,
                status: 404,
                message: err
            });
        }
        
        if (user.profile == "") {
            user.profile = {image: "", text: ""};
        } else {
            user.profile = JSON.parse(user.profile);
        }
    
        db_votes.countLikesByUser(user.name, function(err, likes) {
            if (err) {
                return template.send(res, 'error/http', {
                    status: 500
                });
            }
    
            db_votes.countDownvotedByUser(user.id, function(err, count) {
                if (err) {
                    return template.send(res, 'error/http', {
                        status: 500
                    });
                }
        
                if (count == 0) {
                    return template.send(res, 'users/downvotes', {
                        pageTitle: name + "'s Down Votes",
                        pageTab: "downvotes",
                        user: user,
                        media: [],
                        media_count: 0,
                        likes: likes,
                        page:  1,
                        pages: 1
                    });
                }
        
                var limit  = 100;
                var pages  = Math.ceil(count / limit);
                if (page > pages) {
                    page = pages;
                }
                var offset = (page - 1) * limit;
        
                db_votes.fetchDownvotedByUser(user.id, limit, offset, function(err, rows) {
                    if (err) {
                        return template.send(res, 'error/http', {
                            status: 500
                        });
                    }
            
                    template.send(res, 'users/downvotes', {
                        pageTitle: name + "'s Down Votes",
                        pageTab: "downvotes",
                        user: user,
                        media: rows,
                        media_count: count,
                        likes: likes,
                        page:  parseInt(page),
                        pages: parseInt(pages)
                    });
                });
            });
        });
    });
}


module.exports = {
    /**
     * Initializes auth callbacks
     */
    init: function (app) {
        app.get('/user/:name([a-zA-Z0-9_\-]{1,20})/liked/:page?', handleUpvotes);
        app.get('/user/:name([a-zA-Z0-9_\-]{1,20})/disliked/:page?', handleDownvotes);
        app.get('/user/:name([a-zA-Z0-9_\-]{1,20})/:page?', handleProfile);
        app.post('/user/profile/bio/save', handleProfileBioSave);
        app.post('/user/profile/avatar/save', upload_avatar.single("avatar"), handleProfileAvatarSave);
        app.post('/user/profile/header/save', upload_header.single("header"), handleProfileHeaderSave);
    }
};