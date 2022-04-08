"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_STATES = exports.WS_CLOSE_NORMAL = exports.DEFAULT_TIMEOUT = exports.VSN = exports.TRANSPORTS = exports.CHANNEL_EVENTS = exports.CHANNEL_STATES = void 0;
var CHANNEL_STATES;
(function (CHANNEL_STATES) {
    CHANNEL_STATES["closed"] = "closed";
    CHANNEL_STATES["errored"] = "errored";
    CHANNEL_STATES["joined"] = "joined";
    CHANNEL_STATES["joining"] = "joining";
    CHANNEL_STATES["leaving"] = "leaving";
})(CHANNEL_STATES || (CHANNEL_STATES = {}));
exports.CHANNEL_STATES = CHANNEL_STATES;
var CHANNEL_EVENTS;
(function (CHANNEL_EVENTS) {
    CHANNEL_EVENTS["close"] = "phx_close";
    CHANNEL_EVENTS["error"] = "phx_error";
    CHANNEL_EVENTS["join"] = "phx_join";
    CHANNEL_EVENTS["reply"] = "phx_reply";
    CHANNEL_EVENTS["leave"] = "phx_leave";
})(CHANNEL_EVENTS || (CHANNEL_EVENTS = {}));
exports.CHANNEL_EVENTS = CHANNEL_EVENTS;
var TRANSPORTS;
(function (TRANSPORTS) {
    TRANSPORTS["websocket"] = "websocket";
})(TRANSPORTS || (TRANSPORTS = {}));
exports.TRANSPORTS = TRANSPORTS;
var SOCKET_STATES;
(function (SOCKET_STATES) {
    SOCKET_STATES[SOCKET_STATES["connecting"] = 0] = "connecting";
    SOCKET_STATES[SOCKET_STATES["open"] = 1] = "open";
    SOCKET_STATES[SOCKET_STATES["closing"] = 2] = "closing";
    SOCKET_STATES[SOCKET_STATES["closed"] = 3] = "closed";
})(SOCKET_STATES || (SOCKET_STATES = {}));
exports.SOCKET_STATES = SOCKET_STATES;
const VSN = "1.0.0";
exports.VSN = VSN;
const DEFAULT_TIMEOUT = 10000;
exports.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;
const WS_CLOSE_NORMAL = 1000;
exports.WS_CLOSE_NORMAL = WS_CLOSE_NORMAL;
