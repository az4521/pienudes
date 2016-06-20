var CL_VERSION       = 3.0;
var SCRIPTS_BASE_URL = "https://scripts.upnext.fm";
var SCRIPTS_REGEX    = new RegExp(SCRIPTS_BASE_URL + '/([^\\s]+).js');

var CLIENT = {
    rank: -1,
    leader: false,
    name: "",
    logged_in: false,
    emotes: [],
    profile: {
        image: "",
        text: ""
    }
};
var SUPERADMIN = false;

var CHANNEL = {
    opts: {},
    openqueue: false,
    perms: {},
    css: "",
    js: "",
    motd: "",
    bio: "",
    name: false,
    usercount: 0,
    emotes: []
};

var PLAYER = false;
var LIVESTREAM_CHROMELESS = false;
var FLUIDLAYOUT = false;
var VWIDTH;
var VHEIGHT;
if($("#videowidth").length > 0) {
    VWIDTH = $("#videowidth").css("width").replace("px", "");
    VHEIGHT = ""+parseInt(parseInt(VWIDTH) * 9 / 16);
}
var REBUILDING = false;
var socket = {
    emit: function() {
        console.log("socket not initialized");
        console.log(arguments);
    }
};
var IGNORED = [];
var CHATHIST = [];
var CHATHISTIDX = 0;
var CHATTHROTTLE = false;
var CHATMAXSIZE = 100;
var SCROLLCHAT = true;
var IGNORE_SCROLL_EVENT = false;
var LASTCHAT = {
    name: ""
};
var FOCUSED = true;
var UNREAD_MSG_COUNT = 0;
var PAGETITLE = "upnext.fm";
var TITLE_BLINK;
var CHATSOUND = new Audio("/boop.wav");
var KICKED = false;
var NAME = readCookie("cytube_uname");
var SESSION = readCookie("cytube_session");
var LEADTMR = false;
var PL_FROM = "";
var PL_AFTER = "";
var PL_CURRENT = -1;
var PL_WAIT_SCROLL = false;
var FILTER_FROM = 0;
var FILTER_TO = 0;
var NO_STORAGE = typeof localStorage == "undefined" || localStorage === null;
var CHAT_LINE_COLOR = window.localStorage.getItem("chat_line_color") || "#ffffff";

function getOpt(k) {
    var v = NO_STORAGE ? readCookie(k) : localStorage.getItem(k);
    try {
        v = JSON.parse(v);
    } catch (e) { }
    return v;
}

function setOpt(k, v) {
    v = JSON.stringify(v);
    NO_STORAGE ? createCookie(k, v, 1000) : localStorage.setItem(k, v);
}

function getOrDefault(k, def) {
    var v = getOpt(k);
    if(v === null || v === "null")
        return def;
    if(v === "true")
        return true;
    if(v === "false")
        return false;
    if(v.match && v.match(/^[0-9]+$/))
        return parseInt(v);
    if(v.match && v.match(/^[0-9\.]+$/))
        return parseFloat(v);
    return v;
}

var USEROPTS = {
    synch                : getOrDefault("synch", true),
    hidevid              : getOrDefault("hidevid", false),
    show_colors          : getOrDefault("show_colors", true),
    show_timestamps      : getOrDefault("show_timestamps", true),
    show_joins           : getOrDefault("show_joins", true),
    show_notices         : getOrDefault("show_notices", true),
    modhat               : getOrDefault("modhat", false),
    blink_title          : getOrDefault("blink_title", "onlyping"),
    sync_accuracy        : getOrDefault("sync_accuracy", 2),
    wmode_transparent    : getOrDefault("wmode_transparent", true),
    chatbtn              : getOrDefault("chatbtn", false),
    altsocket            : getOrDefault("altsocket", false),
    joinmessage          : getOrDefault("joinmessage", true),
    qbtn_hide            : getOrDefault("qbtn_hide", false),
    qbtn_idontlikechange : getOrDefault("qbtn_idontlikechange", false),
    first_visit          : getOrDefault("first_visit", true),
    ignore_channelcss    : getOrDefault("ignore_channelcss", false),
    ignore_channeljs     : getOrDefault("ignore_channeljs", false),
    hide_channelbg       : getOrDefault("hide_channelbg", false),
    sort_rank            : getOrDefault("sort_rank", true),
    sort_afk             : getOrDefault("sort_afk", false),
    default_quality      : getOrDefault("default_quality", "auto"),
    boop                 : getOrDefault("boop", "never"),
    secure_connection    : getOrDefault("secure_connection", false),
    show_shadowchat      : getOrDefault("show_shadowchat", false),
    emotelist_sort       : getOrDefault("emotelist_sort", true),
    no_emotes            : getOrDefault("no_emotes", false)
};

/* Backwards compatibility check */
if (USEROPTS.blink_title === true) {
    USEROPTS.blink_title = "always";
} else if (USEROPTS.blink_title === false) {
    USEROPTS.blink_title = "onlyping";
}
/* Last ditch */
if (["never", "onlyping", "always"].indexOf(USEROPTS.blink_title) === -1) {
    USEROPTS.blink_title = "onlyping";
}

if (USEROPTS.boop === true) {
    USEROPTS.boop = "onlyping";
} else if (USEROPTS.boop === false) {
    USEROPTS.boop = "never";
}
if (["never", "onlyping", "always"].indexOf(USEROPTS.boop) === -1) {
    USEROPTS.boop = "onlyping";
}

// As of 3.8, preferred quality names are different
(function () {
    var fix = {
        small: "240",
        medium: "360",
        large: "480",
        hd720: "720",
        hd1080: "1080",
        highres: "best"
    };
    
    if (fix.hasOwnProperty(USEROPTS.default_quality)) {
        USEROPTS.default_quality = fix[USEROPTS.default_quality];
    }
})();

var VOLUME = parseFloat(getOrDefault("volume", 1));

var NO_WEBSOCKETS = USEROPTS.altsocket;
var NO_VIMEO = Boolean(location.host.match("cytu.be"));

var JSPREF = getOpt("channel_js_pref") || {};

var Rank = {
    Guest: 0,
    Member: 1,
    Leader: 1.5,
    Moderator: 2,
    Admin: 3,
    Owner: 10,
    Siteadmin: 255
};

var FAVORITE_TAGS = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace("name"),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
        url: "/tags",
        cache: false,
        filter: function(list) {
            return $.map(list, function(tag) {
                return { name: tag }; });
        }
    }
});
FAVORITE_TAGS.initialize();

var CHAT_WRAP = null;
var CHAT_WRAP_MEDIA = null;

function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==" ") c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}

(function () {
    var localVersion = parseFloat(getOpt("version"));
    if (isNaN(localVersion)) {
        setOpt("version", CL_VERSION);
    }
})();

/* to be implemented in callbacks.js */
function setupCallbacks() { }