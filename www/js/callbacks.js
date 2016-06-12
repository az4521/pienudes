Callbacks = {

    error: function (reason) {
        window.SOCKET_ERROR_REASON = reason;
    },

    /* fired when socket connection completes */
    connect: function() {
        socket.emit("initChannelCallbacks");
        socket.emit("joinChannel", {
            name: CHANNEL.name
        });

        if (CHANNEL.opts.password) {
            socket.emit("channelPassword", CHANNEL.opts.password);
        }

        if (CLIENT.name && CLIENT.guest) {
            socket.emit("login", {
                name: CLIENT.name
            });
        }
        
        //$("<div/>").addClass("server-msg-reconnect")
        //    .text("Connected")
        //    .appendTo($("#messagebuffer"));
        //scrollChat();
    },

    disconnect: function() {
        //if(KICKED) {
        //    return;
        //}
        
        //$("<div/>")
        //    .addClass("server-msg-disconnect")
        //    .text("Disconnected from server.  Attempting reconnection...")
        //    .appendTo($("#messagebuffer"));
        //scrollChat();
    },

    errorMsg: function(data) {
        if (data.alert) {
            alert(data.msg);
        } else {
            errDialog(data.msg);
        }
    },

    costanza: function (data) {
        hidePlayer();
        $("#costanza-modal").modal("hide");
        var modal = makeModal();
        modal.attr("id", "costanza-modal")
            .appendTo($("body"));

        var body = $("<div/>").addClass("modal-body")
            .appendTo(modal.find(".modal-content"));
        $("<img/>").attr("src", "http://i0.kym-cdn.com/entries/icons/original/000/005/498/1300044776986.jpg")
            .appendTo(body);

        $("<strong/>").text(data.msg).appendTo(body);
        hidePlayer();
        modal.modal();
    },

    announcement: function(data) {
        $("#announcements").html("");
        makeAlert(data.title, data.text)
            .appendTo($("#announcements"));
    },

    kick: function(data) {
        KICKED = true;
        $("<div/>").addClass("server-msg-disconnect")
            .text("Kicked: " + data.reason)
            .appendTo($("#messagebuffer"));
        scrollChat();
    },

    noflood: function(data) {
        $("<div/>")
            .addClass("server-msg-disconnect")
            .text(data.action + ": " + data.msg)
            .appendTo($("#messagebuffer"));
        scrollChat();
    },

    needPassword: function (wrongpw) {
        var div = $("<div/>");
        $("<strong/>").text("Channel Password")
            .appendTo(div);
        if (wrongpw) {
            $("<br/>").appendTo(div);
            $("<span/>").addClass("text-error")
                .text("Wrong Password")
                .appendTo(div);
        }

        var pwbox = $("<input/>").addClass("form-control")
            .attr("type", "password")
            .appendTo(div);
        var submit = $("<button/>").addClass("btn btn-xs btn-default btn-block")
            .css("margin-top", "5px")
            .text("Submit")
            .appendTo(div);
        var parent = chatDialog(div);
        parent.attr("id", "needpw");
        var sendpw = function () {
            socket.emit("channelPassword", pwbox.val());
            parent.remove();
        };
        submit.click(sendpw);
        pwbox.keydown(function (ev) {
            if (ev.keyCode == 13) {
                sendpw();
            }
        });
        pwbox.focus();
    },

    cancelNeedPassword: function () {
        $("#needpw").remove();
    },

    cooldown: function (time) {
        time = time + 200;
        $(".pm-input").css("color", "#ff0000");
        if (CHATTHROTTLE && $("#chatline").data("throttle_timer")) {
            clearTimeout($("#chatline").data("throttle_timer"));
        }
        CHATTHROTTLE = true;
        $("#chatline").data("throttle_timer", setTimeout(function () {
            CHATTHROTTLE = false;
            $(".pm-input").css("color", "");
        }, time));
    },

    channelNotRegistered: function() {
        var div = $("<div/>").addClass("alert alert-info")
            .appendTo($("<div/>").addClass("col-md-12").appendTo($("#announcements")));

        $("<button/>").addClass("close pull-right")
            .appendTo(div)
            .click(function () {
                div.parent().remove();
            })
            .html("&times;");
        $("<h4/>").appendTo(div).text("Unregistered channel");
        $("<p/>").appendTo(div)
            .html("This channel is not registered to a upnext.fm account.  You can still " +
                  "use it, but some features will not be available.  To register a " +
                  "channel to your account, visit your <a href='/account/channels'>" +
                  "channels</a> page.");
    },

    registerChannel: function(data) {
        if ($("#chanregisterbtn").length > 0) {
            $("#chanregisterbtn").text("Register it")
                .attr("disabled", false);
        }
        if(data.success) {
            $("#chregnotice").remove();
        }
        else {
            makeAlert("Error", data.error, "alert-danger")
                .insertAfter($("#chregnotice"));
        }
    },

    unregisterChannel: function(data) {
        if(data.success) {
            alert("Channel unregistered");
        }
        else {
            alert(data.error);
        }
    },

    setMotd: function(motd) {
        CHANNEL.motd = motd;
        $("#motd").html(motd);
        $("#cs-motdtext").val(motd);
        if (motd != "") {
            $("#motdwrap").show();
            $("#motd").show();
            $("#togglemotd").find(".glyphicon-plus")
                .removeClass("glyphicon-plus")
                .addClass("glyphicon-minus");
        } else {
            $("#motdwrap").hide();
        }
    },
    
    setBio: function(bio) {
        CHANNEL.bio = bio;
        $("#cs-biotext").html(bio);
        $("#bio").html(bio);
        if (bio.length == 0) {
            $("#biobtn").hide();
        } else {
            $("#biobtn").show();
        }
    },

    chatFilters: function(entries) {
        var tbl = $("#cs-chatfilters table");
        tbl.data("entries", entries);
        formatCSChatFilterList();
    },

    updateChatFilter: function (f) {
        var entries = $("#cs-chatfilters table").data("entries") || [];
        var found = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].name === f.name) {
                entries[i] = f;
                found = true;
                break;
            }
        }

        if (!found) {
            entries.push(f);
        }

        $("#cs-chatfilters table").data("entries", entries);
        formatCSChatFilterList();
    },

    deleteChatFilter: function (f) {
        var entries = $("#cs-chatfilters table").data("entries") || [];
        var found = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].name === f.name) {
                entries[i] = f;
                found = i;
                break;
            }
        }

        if (found !== false) {
            entries.splice(found, 1);
        }

        $("#cs-chatfilters table").data("entries", entries);
        formatCSChatFilterList();
    },

    channelOpts: function(opts) {
        document.title = opts.pagetitle;
        PAGETITLE = opts.pagetitle;

        if (!USEROPTS.ignore_channelcss &&
            opts.externalcss !== CHANNEL.opts.externalcss) {
            $("#chanexternalcss").remove();

            if (opts.externalcss.trim() !== "") {
                $("#chanexternalcss").remove();
                $("<link/>")
                    .attr("rel", "stylesheet")
                    .attr("href", opts.externalcss)
                    .attr("id", "chanexternalcss")
                    .appendTo($("head"));
            }
        }

        if(opts.externaljs.trim() != "" && !USEROPTS.ignore_channeljs &&
           opts.externaljs !== CHANNEL.opts.externaljs) {
            checkScriptAccess(opts.externaljs, "external", function (pref) {
                if (pref === "ALLOW") {
                    $.getScript(opts.externaljs);
                }
            });
        }

        CHANNEL.opts = opts;

        if(opts.allow_voteskip) {
            $("#voteskip").attr("disabled", false);
        } else {
            $("#voteskip").attr("disabled", true);
        }
        if (opts.background_url && !USEROPTS.hide_channelbg) {
            var background_url_wrap = $("#wrap");
            background_url_wrap
                .css("background-image", "url(" + opts.background_url + ")")
                .css("background-repeat", opts.background_repeat);
            if (opts.background_repeat == "no-repeat") {
                background_url_wrap.css("background-size", "100% 100%");
            }
        }
        handlePermissionChange();
    },

    setPermissions: function(perms) {
        CHANNEL.perms = perms;
        genPermissionsEditor();
        handlePermissionChange();
    },

    channelCSSJS: function(data) {
        $("#chancss").remove();
        CHANNEL.css = data.css;
        $("#cs-csstext").val(data.css);
        if(data.css && !USEROPTS.ignore_channelcss) {
            $("<style/>").attr("type", "text/css")
                .attr("id", "chancss")
                .text(data.css)
                .appendTo($("head"));
        }

        $("#chanjs").remove();
        CHANNEL.js = data.js;
        $("#cs-jstext").val(data.js);

        if(data.js && !USEROPTS.ignore_channeljs) {
            var src = data.js
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br>")
                .replace(/\t/g, "    ")
                .replace(/ /g, "&nbsp;");
            src = encodeURIComponent(src);

            var viewsource = "data:text/html, <body style='font: 9pt monospace;" +
                             "max-width:60rem;margin:0 auto;padding:4rem;'>" +
                             src + "</body>";
            checkScriptAccess(viewsource, "embedded", function (pref) {
                if (pref === "ALLOW") {
                    $("<script/>").attr("type", "text/javascript")
                        .attr("id", "chanjs")
                        .text(data.js)
                        .appendTo($("body"));
                }
            });
        }
    },
    
    setUserScripts: function(scripts) {
        if (USER_SCRIPTS_INIT) {
            ChatAPI.trigger("reloading");
        }
        
        $("script").each(function(i, el) {
            el = $(el);
            if (el.attr("id") != undefined && el.attr("id").indexOf("user-script-exec") == 0) {
                el.remove();
            }
        });
        ChatAPI._reset();
        
        for(var i = 0; i < scripts.length; i++) {
            Callbacks.addUserScript(scripts[i]);
        }
        USER_SCRIPTS_INIT = true;
        ChatAPI._pushLoaded();
    },
    
    addUserScript: function(data) {
        var script   = data.script;
        var name     = data.name;
        var name_low = data.name.replace(" ", "-").toLowerCase();
        var tab      = $("#user-scripting-tab-" + name_low);
        var pane     = $("#user-script-pane-" + name_low);
        var textarea = pane.find("textarea:first");
        
        if (tab.length == 0) {
            var obj = formatUserScriptTab(data);
            tab      = obj.tab;
            pane     = obj.pane;
            textarea = obj.textarea;
        }
        
        textarea.val(script);
        textarea.data("name", name);
        
        if (script.length != 0) {
            if (name_low == "css") {
                $("<style/>").attr("type", "text/css")
                    .attr("id", "user-script-exec-" + name_low)
                    .text(script)
                    .appendTo($("head"));
                return;
            }
            
            var imports  = [];
            var pattern  = /\*\s+Import:\s+(https?:\/\/(.*?)\.js)\b/gi;
            while (match = pattern.exec(script)) {
                var url = match[1].trim();
                if (url.length > 0) {
                    imports.push(url);
                }
            }
            
            script = "(function($api, $user, $channel, $socket) { \n" + script + "\n})(ChatAPI, CLIENT, CHANNEL, socket);";
            if (imports.length > 0) {
                ChatAPI._getScripts(imports, function() {
                    $("<script/>").attr("type", "text/javascript")
                        .attr("id", "user-script-exec-" + name_low)
                        .text(script)
                        .appendTo($("body"));
                });
            } else {
                $("<script/>").attr("type", "text/javascript")
                    .attr("id", "user-script-exec-" + name_low)
                    .text(script)
                    .appendTo($("body"));
            }
        }
    },
    
    deleteUserScript: function(data) {
        var name_low = data.name.toLowerCase();
        $("#user-scripting-tab-" + name_low).remove();
        $("#user-script-pane-" + name_low).remove();
        $("#user-script-exec-" + name_low).remove();
        $("#user-scripting-tab-default").find("a:first").click();
    },

    banlist: function(entries) {
        var tbl = $("#cs-banlist table");
        tbl.data("entries", entries);
        formatCSBanlist();
    },

    banlistRemove: function (data) {
        var entries = $("#cs-banlist table").data("entries") || [];
        var found = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].id === data.id) {
                found = i;
                break;
            }
        }

        if (found !== false) {
            entries.splice(i, 1);
            $("#cs-banlist table").data("entries", entries);
        }

        formatCSBanlist();
    },

    recentLogins: function(entries) {
        var tbl = $("#loginhistory table");
        // I originally added this check because of a race condition
        // Now it seems to work without but I don't trust it
        if(!tbl.hasClass("table")) {
            setTimeout(function() {
                Callbacks.recentLogins(entries);
            }, 100);
            return;
        }
        if(tbl.children().length > 1) {
            $(tbl.children()[1]).remove();
        }
        for(var i = 0; i < entries.length; i++) {
            var tr = document.createElement("tr");
            var name = $("<td/>").text(entries[i].name).appendTo(tr);
            var aliases = $("<td/>").text(entries[i].aliases.join(", ")).appendTo(tr);
            var time = new Date(entries[i].time).toTimeString();
            $("<td/>").text(time).appendTo(tr);

            $(tr).appendTo(tbl);
        }
    },

    channelRanks: function(entries) {
        var tbl = $("#cs-chanranks table");
        tbl.data("entries", entries);
        formatCSModList();
    },

    channelRankFail: function (data) {
        if ($("#cs-chanranks").is(":visible")) {
            makeAlert("Error", data.msg, "alert-danger")
                .removeClass().addClass("vertical-spacer")
                .insertAfter($("#cs-chanranks form"));
        } else {
            Callbacks.noflood({ action: "/rank", msg: data.msg });
        }
    },

    readChanLog: function (data) {
        var log = $("#cs-chanlog-text");
        if (log.length == 0)
            return;

        if (data.success) {
            setupChanlogFilter(data.data);
            filterChannelLog();
        } else {
            $("#cs-chanlog-text").text("Error reading channel log");
        }
    },

    voteskip: function(data) {
        var icon = $("#voteskip").find(".glyphicon").remove();
        if(data.count > 0) {
            $("#voteskip").text(" ("+data.count+"/"+data.need+")");
        } else {
            $("#voteskip").text("");
        }

        icon.prependTo($("#voteskip"));
    },

    /* REGION Rank Stuff */

    rank: function(r) {
        if(r >= 255)
            SUPERADMIN = true;
        CLIENT.rank = r;
        handlePermissionChange();
        if(SUPERADMIN && $("#setrank").length == 0) {
            var li = $("<li/>").addClass("dropdown")
                .attr("id", "setrank");
                //.appendTo($(".nav")[0]);
                
            $("<a/>").addClass("dropdown-toggle")
                .attr("data-toggle", "dropdown")
                .attr("href", "javascript:void(0)")
                .html("Set Rank <b class='caret'></b>")
                .appendTo(li);
            var menu = $("<ul/>").addClass("dropdown-menu")
                .appendTo(li);

            function addRank(r, disp) {
                var li = $("<li/>").appendTo(menu);
                $("<a/>").attr("href", "javascript:void(0)")
                    .html(disp)
                    .click(function() {
                        socket.emit("borrow-rank", r);
                    })
                    .appendTo(li);
            }

            addRank(0, "<span class='userlist_guest'>Guest</span>");
            addRank(1, "<span>Registered</span>");
            addRank(2, "<span class='userlist_op'>Moderator</span>");
            addRank(3, "<span class='userlist_owner'>Admin</span>");
            addRank(255, "<span class='userlist_siteadmin'>Superadmin</span>");
        }
    },

    login: function(data) {
        if (!data.success) {
            if (data.error != "Session expired") {
                errDialog(data.error);
            }
        } else {
            CLIENT.name = data.name;
            CLIENT.guest = data.guest;
            CLIENT.logged_in = true;

            if (!CLIENT.guest) {
                socket.emit("initUserPLCallbacks");
                if ($("#loginform").length === 0) {
                    return;
                }
                var logoutform = $("<p/>").attr("id", "logoutform")
                    .addClass("navbar-text pull-right")
                    .insertAfter($("#loginform"));

                $("<span/>").attr("id", "welcome").text("Welcome, " + CLIENT.name)
                    .appendTo(logoutform);
                $("<span/>").html("&nbsp;&middot;&nbsp;").appendTo(logoutform);
                var domain = $("#loginform").attr("action").replace("/login", "");
                $("<a/>").attr("id", "logout")
                    .attr("href", domain + "/logout?redirect=/r/" + CHANNEL.name)
                    .text("Logout")
                    .appendTo(logoutform);

                $("#loginform").remove();
            }
        }
    },

    /* REGION Chat */
    usercount: function(count) {
        CHANNEL.usercount = count;
        var text = count + " connected user";
        if(count != 1) {
            text += "s";
        }
        $("#usercount").text(text);
    },

    chatMsg: function(data) {
        if (!ChatAPI.trigger("receive", data).isCancelled()) {
            addChatMessage(data);
        }
    },
    
    chatBuffer: function(data) {
        for(var i = 0; i < data.length; i++) {
            Callbacks.chatMsg(data[i]);
        }
        ChatAPI._pushLoaded();
    },

    pm: function (data) {
        var name = data.username;
        if (IGNORED.indexOf(name) !== -1) {
            return;
        }

        if (data.username === CLIENT.name) {
            name = data.to;
        } else {
            pingMessage(true);
        }
        var pm = initPm(name);
        var body = pm.find(".panel-body:first");
        var heading = pm.find(".panel-heading:first");
        var msg = formatChatMessage(data, pm.data("last"));
        var buffer = pm.find(".pm-buffer");
        msg.appendTo(buffer);
        buffer.scrollTop(buffer.prop("scrollHeight"));
        if (pm.find(".panel-body").is(":hidden")) {
            pm.removeClass("panel-default").addClass("panel-primary");
        }
    
        var unread_msg_count = pm.data("unread_msg_count");
        if (body.is(":hidden")) {
            unread_msg_count++;
            pm.data("unread_msg_count", unread_msg_count);
            heading.find("span:first").text(heading.data("username") + " (" + unread_msg_count + ")");
            heading.addClass("flash unread_messages");
            setTimeout(function() {
                heading.removeClass("flash");
            }, 120000);
        } else {
            pm.data("unread_msg_count", 0);
            unread_msg_count = 0;
            heading.removeClass("unread_messages").find("span:first").text(heading.data("username"));
        }
    },
    
    userJoin: function(data) {
        addUserJoinMessage(data);
    },
    
    notice: function(data) {
        if (!ChatAPI.trigger("notice", data).isCancelled()) {
            addNotice(data);
        }
    },

    joinMessage: function(data) {
        if(USEROPTS.joinmessage)
            addChatMessage(data);
    },

    clearchat: function() {
        $("#messagebuffer").html("");
        LASTCHAT.name = "";
    },

    userlist: function(data) {
        $(".userlist_item").remove();
        for(var i = 0; i < data.length; i++) {
            Callbacks.addUser(data[i]);
        }
        ChatAPI._pushLoaded();
    },

    addUser: function(data) {
        if (ChatAPI.trigger("user_join", data).isCancelled()) {
            return;
        }
        
        var user = findUserlistItem(data.name);
        // Remove previous instance of user, if there was one
        if(user !== null)
            user.remove();
        var div = $("<div/>")
            .addClass("userlist_item userlist_item_" + data.name);
        var icon = $("<span/>").appendTo(div);
        var nametag = $("<span/>").text(data.name).appendTo(div);
        div.data("name", data.name);
        div.data("rank", data.rank);
        div.data("leader", Boolean(data.leader));
        div.data("profile", data.profile);
        div.data("meta", data.meta);
        div.data("afk", data.meta.afk);
        if (data.meta.muted || data.meta.smuted) {
            div.data("icon", "glyphicon-volume-off");
        } else {
            div.data("icon", false);
        }
        formatUserlistItem(div, data);
        addUserDropdown(div, data);
        div.appendTo($("#userlist"));
        sortUserlist();
    },

    setUserMeta: function (data) {
        var user = findUserlistItem(data.name);
        if (user == null) {
            return;
        }

        user.data("meta", data.meta);
        if (data.meta.muted || data.meta.smuted) {
            user.data("icon", "glyphicon-volume-off");
        } else {
            user.data("icon", false);
        }

        formatUserlistItem(user, data);
        addUserDropdown(user, data);
        sortUserlist();
    },

    setUserProfile: function (data) {
        var user = findUserlistItem(data.name);
        if (user === null)
            return;
        user.data("profile", data.profile);
        formatUserlistItem(user);
    },

    setLeader: function (name) {
        $(".userlist_item").each(function () {
            $(this).find(".glyphicon-star-empty").remove();
            if ($(this).data("leader")) {
                $(this).data("leader", false);
                addUserDropdown($(this));
            }
        });
        if (name === "") {
            CLIENT.leader = false;
            if(LEADTMR)
                clearInterval(LEADTMR);
            LEADTMR = false;
            return;
        }
        var user = findUserlistItem(name);
        if (user) {
            user.data("leader", true);
            formatUserlistItem(user);
            addUserDropdown(user);
        }
        if (name === CLIENT.name) {
            CLIENT.leader = true;
            // I'm a leader!  Set up sync function
            if(LEADTMR)
                clearInterval(LEADTMR);
            LEADTMR = setInterval(sendVideoUpdate, 5000);
            handlePermissionChange();
        } else if (CLIENT.leader) {
            CLIENT.leader = false;
            handlePermissionChange();
            if(LEADTMR)
                clearInterval(LEADTMR);
            LEADTMR = false;
        }
    },

    setUserRank: function (data) {
        data.name = data.name.toLowerCase();
        var entries = $("#cs-chanranks table").data("entries") || [];
        var found = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].name.toLowerCase() === data.name) {
                entries[i].rank = data.rank;
                found = i;
                break;
            }
        }
        if (found === false) {
            entries.push(data);
        } else if (entries[found].rank < 2) {
            entries.splice(found, 1);
        }
        formatCSModList();

        var user = findUserlistItem(data.name);
        if (user === null) {
            return;
        }

        user.data("rank", data.rank);
        if (data.name === CLIENT.name) {
            CLIENT.rank = data.rank;
            handlePermissionChange();
        }
        formatUserlistItem(user);
        addUserDropdown(user);
        if (USEROPTS.sort_rank) {
            sortUserlist();
        }
    },

    setUserIcon: function (data) {
        var user = findUserlistItem(data.name);
        if (user === null) {
            return;
        }

        user.data("icon", data.icon);
        formatUserlistItem(user);
    },

    setAFK: function (data) {
        if (ChatAPI.trigger("afk", data).isCancelled()) {
            return;
        }
        
        var user = findUserlistItem(data.name);
        if(user === null)
            return;
        user.data("afk", data.afk);
        formatUserlistItem(user);
        if(USEROPTS.sort_afk)
            sortUserlist();
    },

    userLeave: function(data) {
        if (ChatAPI.trigger("user_leave", data).isCancelled()) {
            return;
        }
        var user = findUserlistItem(data.name);
        if(user !== null)
            user.remove();
    },

    drinkCount: function(count) {
        if(count != 0) {
            var text = count + " drink";
            if(count != 1) {
                text += "s";
            }
            $("#drinkcount").text(text);
            $("#drinkbar").show();
        }
        else {
            $("#drinkbar").hide();
        }
    },

    /* REGION Playlist Stuff */
    playlist: function(data) {
        socket.emit("favoritesGet");
        socket.emit("userTagsGet");
        
        for(var i = 0; i < data.length; i++) {
            data[i].media.uid = data[i].media.id;
        }
        if (ChatAPI.trigger("playlist", data).isCancelled()) {
            return;
        }
        
        PL_QUEUED_ACTIONS = [];
        // Clear the playlist first
        var q = $("#queue");
        q.html("");

        for(var i = 0; i < data.length; i++) {
            var li = makeQueueEntry(data[i], false);
            li.attr("title", data[i].queueby
                                ? ("Added by: " + data[i].queueby)
                                : "Added by: Unknown");
            li.appendTo(q);
        }

        rebuildPlaylist();
    },

    setPlaylistMeta: function(data) {
        var c = data.count + " item";
        if(data.count != 1)
            c += "s";
        $("#plcount").text(c);
        $("#pllength").text(data.time);
    },

    queue: function(data) {
        data.item.media.uid = data.item.media.id;
        if (ChatAPI.trigger("queue", data).isCancelled()) {
            return;
        }
        
        PL_ACTION_QUEUE.queue(function (plq) {
            var li = makeQueueEntry(data.item, true);
            if (data.item.uid === PL_CURRENT)
                li.addClass("queue_active");
            li.hide();
            var q = $("#queue");
            li.attr("title", data.item.queueby
                                ? ("Added by: " + data.item.queueby)
                                : "Added by: Unknown");
            if (data.after === "prepend") {
                li.prependTo(q);
                li.show("fade", function () {
                    plq.release();
                });
            } else if (data.after === "append") {
                li.appendTo(q);
                li.show("fade", function () {
                    plq.release();
                });
            } else {
                var liafter = playlistFind(data.after);
                if (!liafter) {
                    plq.release();
                    return;
                }
                li.insertAfter(liafter);
                li.show("fade", function () {
                    plq.release();
                });
            }
        });
    },

    queueWarn: function (data) {
        queueMessage(data, "alert-warning");
    },

    queueFail: function (data) {
        queueMessage(data, "alert-danger");
    },

    setTemp: function(data) {
        var li = $(".pluid-" + data.uid);
        if(li.length == 0)
            return false;

        if(data.temp)
            li.addClass("queue_temp");
        else
            li.removeClass("queue_temp");

        li.data("temp", data.temp);
        var btn = li.find(".qbtn-tmp");
        if(btn.length > 0) {
            if(data.temp) {
                btn.html(btn.html().replace("Make Temporary",
                                            "Make Permanent"));
            }
            else {
                btn.html(btn.html().replace("Make Permanent",
                                            "Make Temporary"));
            }
        }
    },

    "delete": function(data) {
        PL_ACTION_QUEUE.queue(function (plq) {
            PL_WAIT_SCROLL = true;
            var li = $(".pluid-" + data.uid);
            li.hide("fade", function() {
                li.remove();
                plq.release();
                PL_WAIT_SCROLL = false;
            });
        });
    },

    moveVideo: function(data) {
        PL_ACTION_QUEUE.queue(function (plq) {
            playlistMove(data.from, data.after, function () {
                plq.release();
            });
        });
    },

    setCurrent: function(uid) {
        PL_CURRENT = uid;
        $("#queue li").removeClass("queue_active");
        var li = $(".pluid-" + uid);
        if (li.length !== 0) {
            li.addClass("queue_active");
            var tmr = setInterval(function () {
                if (!PL_WAIT_SCROLL) {
                    scrollQueue();
                    clearInterval(tmr);
                }
            }, 100);
        }
    },

    changeMedia: function(data) {
        socket.emit("userTags");
        if (!data) {
            ChatAPI._pushLoaded();
            return;
        }
        
        data.uid = data.id;
        CHAT_WRAP_MEDIA = data;
        if ($("body").hasClass("chatOnly") || $("#videowrap").length === 0) {
            ChatAPI._pushLoaded();
            return;
        }
        if (ChatAPI.trigger("media_change", data).isCancelled()) {
            ChatAPI._pushLoaded();
            return;
        }
        
        // Failsafe
        if (isNaN(VOLUME) || VOLUME > 1 || VOLUME < 0) {
            VOLUME = 1;
        }

        function loadNext() {
            if (!PLAYER || data.type !== PLAYER.mediaType) {
                loadMediaPlayer(data);
            }

            handleMediaUpdate(data);
        }

        // Persist the user's volume preference from the the player, if possible
        if (PLAYER && typeof PLAYER.getVolume === "function") {
            PLAYER.getVolume(function (v) {
                if (typeof v === "number") {
                    if (v < 0 || v > 1) {
                        // Dailymotion's API was wrong once and caused a huge
                        // headache.  This alert is here to make debugging easier.
                        alert("Something went wrong with retrieving the volume.  " +
                            "Please tell calzoneman the following: " +
                            JSON.stringify({
                                v: v,
                                t: PLAYER.mediaType,
                                i: PLAYER.mediaId
                            }));
                    } else {
                        VOLUME = v;
                        setOpt("volume", VOLUME);
                    }
                }

                loadNext();
            });
        } else {
            loadNext();
        }

        // Reset voteskip since the video changed
        if (CHANNEL.opts.allow_voteskip) {
            $("#voteskip").attr("disabled", false);
        }

        $("#currenttitle").text(data.title);
        ChatAPI._pushLoaded();
    },

    mediaUpdate: function(data) {
        if ($("body").hasClass("chatOnly") || $("#videowrap").length === 0) {
            return;
        }

        if (PLAYER) {
            if (!ChatAPI.trigger("media_update", data).isCancelled()) {
                handleMediaUpdate(data);
            }
        }
    },

    setPlaylistLocked: function (locked) {
        CHANNEL.openqueue = !locked;
        handlePermissionChange();
        if(CHANNEL.openqueue) {
            $("#qlockbtn").removeClass("btn-danger")
                .addClass("btn-success")
                .attr("title", "Playlist Unlocked");
            $("#qlockbtn").find("span")
                .removeClass("glyphicon-lock")
                .addClass("glyphicon-ok");
        }
        else {
            $("#qlockbtn").removeClass("btn-success")
                .addClass("btn-danger")
                .attr("title", "Playlist Locked");
            $("#qlockbtn").find("span")
                .removeClass("glyphicon-ok")
                .addClass("glyphicon-lock");
        }
    },

    searchResults: function(data) {
        for(var i = 0; i < data.results.length; i++) {
            data.results[i].uid = data.results[i].id;
        }
        if (ChatAPI.trigger("search_results", data).isCancelled()) {
            return;
        }
        
        $("#search_clear").remove();
        clearSearchResults();
        $("#library").data("entries", data.results);
        $("<button/>").addClass("btn btn-default btn-sm btn-block")
            .css("margin-left", "0")
            .attr("id", "search_clear")
            .text("Clear Results")
            .click(function() {
                clearSearchResults();
            })
            .insertBefore($("#library"));


        $("#search_pagination").remove();
        var opts = {
            preLoadPage: function () {
                $("#library").html("");
            },

            generator: function (item, page, index) {
                var li = makeSearchEntry(item, false);
                if(hasPermission("playlistadd")) {
                    addLibraryButtons(li, item.id, data.source);
                }
                $(li).appendTo($("#library"));
            },

            itemsPerPage: 100
        };

        var p = Paginate(data.results, opts);
        p.paginator.insertAfter($("#library"))
            .addClass("pull-right")
            .attr("id", "search_pagination");
        $("#library").data("paginator", p);
    },
    
    changeVotes: function(data) {
        if (!ChatAPI.trigger("votes", data).isCancelled()) {
            $("#voteupvalue").text(data.up);
            $("#votedownvalue").text(data.down);
        }
    },
    
    changeUserVideoVote: function(data) {
        if (ChatAPI.trigger("vote_value", data).isCancelled()) {
            return;
        }
        
        if (data == 1) {
            $("#voteup").addClass("active");
        } else if (data == -1) {
            $("#votedown").addClass("active");
        } else {
            $("#voteup").removeClass("active");
            $("#votedown").removeClass("active");
        }
    },
    
    favoriteAdded: function(data) {
        if (ChatAPI.trigger("favorite_add", data).isCancelled()) {
            return;
        }
        formatFavorites([data.media], true);
        formatTags(data.tags);
        
        toastr.options.preventDuplicates = true;
        toastr.options.closeButton = true;
        toastr.options.timeOut = 1500;
        toastr.success('Favorite completed!');
        $("#favorites-add").text("Update");
    },
    
    favoritesGet: function(favorites) {
        if (ChatAPI.trigger("favorites", favorites).isCancelled()) {
            return;
        }
        var list = $("#favorites-thumbs");
        list.empty();
        formatFavorites(favorites);
    },
    
    userTags: function(data) {
        var input = $("#favorites-tags");
        input.tagsinput('removeAll');
        if (data.tags.length == 0) {
            input.tagsinput('add', input.data('default-value'));
        } else {
            for (var i = 0; i < data.tags.length; i++) {
                input.tagsinput('add', data.tags[i]);
            }
        }
        
        if (data.favorited) {
            $("#favorites-add").text("Update");
        } else {
            $("#favorites-add").text("Favorite");
        }
    },
    
    userTagsGet: function(tags) {
        if (ChatAPI.trigger("tags", tags).isCancelled()) {
            return;
        }
        var list = $("#favorites-tag-list");
        list.empty();
        formatTags(tags);
    },

    /* REGION Polls */
    newPoll: function(data) {
        Callbacks.closePoll();
        var pollMsg = $("<div/>").addClass("poll-notify")
            .html(data.initiator + " opened a poll: \"" + data.title + "\"")
            .appendTo($("#messagebuffer"));
        scrollChat();

        var poll = $("<div/>").addClass("well active").prependTo($("#pollwrap"));
        $("<button/>").addClass("close pull-right").html("&times;")
            .appendTo(poll)
            .click(function() { poll.remove(); });
        if(hasPermission("pollctl")) {
            $("<button/>").addClass("btn btn-danger btn-sm pull-right").text("End Poll")
                .appendTo(poll)
                .click(function() {
                    socket.emit("closePoll")
                });
        }

        $("<h3/>").html(data.title).appendTo(poll);
        for(var i = 0; i < data.options.length; i++) {
            (function(i) {
            var callback = function () {
                socket.emit("vote", {
                    option: i
                });
                poll.find(".option button").each(function() {
                    $(this).attr("disabled", "disabled");
                });
                $(this).parent().addClass("option-selected");
            }
            $("<button/>").addClass("btn btn-default btn-sm").text(data.counts[i])
                .prependTo($("<div/>").addClass("option").html(data.options[i])
                        .appendTo(poll))
                .click(callback);
            })(i);

        }

        poll.find(".btn").attr("disabled", !hasPermission("pollvote"));
    },

    updatePoll: function(data) {
        var poll = $("#pollwrap .active");
        var i = 0;
        poll.find(".option button").each(function() {
            $(this).html(data.counts[i]);
            i++;
        });
    },

    closePoll: function() {
        if($("#pollwrap .active").length != 0) {
            var poll = $("#pollwrap .active");
            poll.removeClass("active").addClass("muted");
            poll.find(".option button").each(function() {
                $(this).attr("disabled", true);
            });
            poll.find(".btn-danger").each(function() {
                $(this).remove()
            });
        }
    },

    listPlaylists: function(data) {
        $("#userpl_list").data("entries", data);
        formatUserPlaylistList();
    },

    emoteList: function (data) {
        if (ChatAPI.trigger("emotes_channel", data).isCancelled()) {
            return;
        }
        
        loadEmotes(data);
        var tbl = $("#cs-emotes table");
        tbl.data("entries", data);
        formatCSEmoteList();
        EMOTELIST.handleChange();
    },

    updateEmote: function (data) {
        data.regex = new RegExp(data.source, "gi");
        var found = false;
        for (var i = 0; i < CHANNEL.emotes.length; i++) {
            if (CHANNEL.emotes[i].name === data.name) {
                found = true;
                CHANNEL.emotes[i] = data;
                formatCSEmoteList();
                break;
            }
        }

        if (!found) {
            CHANNEL.emotes.push(data);
            formatCSEmoteList();
        }
    },

    removeEmote: function (data) {
        var found = -1;
        for (var i = 0; i < CHANNEL.emotes.length; i++) {
            if (CHANNEL.emotes[i].name === data.name) {
                found = i;
                break;
            }
        }

        if (found !== -1) {
            var row = $("code:contains('" + data.name + "')").parent().parent();
            row.hide("fade", row.remove.bind(row));
            CHANNEL.emotes.splice(i, 1);
        }
    },
    
    uploadList: function(data) {
        var tbl = $("#cs-uploadoptions table");
        tbl.data("entries", data);
        formatUploadsList(true);
    },
    
    uploadComplete: function(data) {
        var el = $("#cs-uploadoptions input[type=file]");
        el.replaceWith(el.clone(true));
        var tbl = $("#cs-uploadoptions table");
        var entries = tbl.data("entries") || [];
        var found   = false;
        entries.forEach(function(entry) {
            if (entry.url == data.url) {
                found = true;
                return;
            }
        });
        if (!found) {
            entries.unshift(data);
        }
        
        tbl.data("entries", entries);
        formatUploadsList(false);
        $("#cs-uploadoptions label:first").text("Select file");
        
        
    },
    
    removeUpload: function(data) {
        var tbl     = $("#cs-uploadoptions table");
        var entries = tbl.data("entries") || [];
        var cleaned = [];
        entries.forEach(function(entry) {
            if (entry.url != data.url) {
                cleaned.push(entry);
            }
        });
        tbl.data("entries", cleaned);
        formatUploadsList(false);
    },
    
    userEmoteList: function(data) {
        if (ChatAPI.trigger("emotes_personal", data).isCancelled()) {
            return;
        }

        var tbl = $("#us-user-emotes table");
        tbl.data("entries", data);
        formatUserEmotesList(tbl);
    
        loadUserEmotes(data);
        tbl = $("#cs-emotes table");
        tbl.data("entries", data);
        formatCSEmoteList();
        EMOTELIST.handleChange();
    },
    
    userEmoteComplete: function(data) {
        var ue = $("#us-user-emotes");
        ue.find("input[type=text]:first").val("");
        ue.find("#cs-uploads-url").val("");
        var el = ue.find("input[type=file]:first");
        el.replaceWith(el.clone(true));
    
        var tbl = ue.find("table:first");
        var entries = tbl.data("entries") || [];
        var found   = false;
        entries.forEach(function(entry) {
            if (entry.url == data.url) {
                found = true;
                return;
            }
        });
        if (!found) {
            entries.unshift(data);
        }
        
        tbl.data("entries", entries);
        formatUserEmotesList(tbl);
        ue.find("button:first").prop("disabled", false).html("Upload");
    
        data.source = '(^|\s)' + data.text + '(?!\S)';
        data.name   = data.text;
        data.image  = data.url;
        data.regex = new RegExp(data.source, "gi");
        
        found = false;
        for (var i = 0; i < CLIENT.emotes.length; i++) {
            if (CLIENT.emotes[i].name === data.name) {
                found = true;
                CLIENT.emotes[i] = data;
                formatCSEmoteList();
                break;
            }
        }
    
        if (!found) {
            CLIENT.emotes.push(data);
            formatCSEmoteList();
        }
    },
    
    userEmoteRemove: function(data) {
        var ue      = $("#us-user-emotes");
        var tbl     = ue.find("table:first");
        var entries = tbl.data("entries") || [];
        var cleaned = [];
        entries.forEach(function(entry) {
            if (entry.text != data.text) {
                cleaned.push(entry);
            }
        });
        
        tbl.data("entries", cleaned);
        formatUserEmotesList(tbl);
    },
    
    errorEmote: function(data) {
        var ue = $("#us-user-emotes");
        ue.find("button:first").prop("disabled", false).html("Upload");
        errDialog(data.msg);
    },

    warnLargeChandump: function (data) {
        function toHumanReadable(size) {
            if (size > 1048576) {
                return Math.floor((size / 1048576) * 100) / 100 + "MiB";
            } else if (size > 1024) {
                return Math.floor((size / 1024) * 100) / 100 + "KiB";
            } else {
                return size + "B";
            }
        }

        if ($("#chandumptoobig").length > 0) {
            $("#chandumptoobig").remove();
        }

        errDialog("This channel currently exceeds the maximum size of " +
            toHumanReadable(data.limit) + " (channel size is " +
            toHumanReadable(data.actual) + ").  Please reduce the size by removing " +
            "unneeded playlist items, filters, and/or emotes.  Changes to the channel " +
            "will not be saved until the size is reduced to under the limit.")
            .attr("id", "chandumptoobig");
    }
}

var SOCKET_DEBUG = localStorage.getItem('cytube_socket_debug') === 'true';
setupCallbacks = function() {
    for(var key in Callbacks) {
        (function(key) {
            socket.on(key, function(data) {
                if (SOCKET_DEBUG) {
                    console.log(key, data);
                }
                try {
                    Callbacks[key](data);
                } catch (e) {
                    if (SOCKET_DEBUG) {
                        console.log("EXCEPTION: " + e + "\n" + e.stack);
                    }
                }
            });
        })(key);
    }
};

(function () {
    if (typeof io === "undefined") {
        makeAlert("Uh oh!", "It appears the socket.io connection " +
                            "has failed.  If this error persists, a firewall or " +
                            "antivirus is likely blocking the connection, or the " +
                            "server is down.", "alert-danger")
            .appendTo($("#announcements"));
        Callbacks.disconnect();
        return;
    }

    $.getJSON("/socketconfig/" + CHANNEL.name + ".json")
        .done(function (socketConfig) {
            if (socketConfig.error) {
                makeAlert("Error", "Socket.io configuration returned error: " +
                        socketConfig.error, "alert-danger")
                    .appendTo($("#announcements"));
                return;
            }

            var chosenServer = null;
            socketConfig.servers.forEach(function (server) {
                if (chosenServer === null) {
                    chosenServer = server;
                } else if (server.secure && !chosenServer.secure) {
                    chosenServer = server;
                } else if (!server.ipv6Only && chosenServer.ipv6Only) {
                    chosenServer = server;
                }
            });

            if (chosenServer === null) {
                makeAlert("Error",
                        "Socket.io configuration was unable to find a suitable server",
                        "alert-danger")
                    .appendTo($("#announcements"));
            }

            var opts = {
                secure: chosenServer.secure
            };

            socket = io(chosenServer.url, opts);
            setupCallbacks();
        }).fail(function () {
            makeAlert("Error", "Failed to retrieve socket.io configuration",
                    "alert-danger")
                .appendTo($("#announcements"));
            Callbacks.disconnect();
        });
})();