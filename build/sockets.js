"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const timer_1 = __importDefault(require("./timer"));
const querystring = __importStar(require("querystring"));
const channel_1 = __importDefault(require("./channel"));
const WebSocket = require("websocket").w3cwebsocket;
class Socket {
    /**
     * Initializes the Socket
     *
     * @param endPoint - The string WebSocket endpoint ie, "ws://example.com/socket"
     * @param opts - Optional configuration
     * transport - The Websocket Transport, for example WebSocket.
     *
     *   encode - The function to encode outgoing messages. Defaults to JSON:
     *
     *     (payload, callback) => callback(JSON.stringify(payload))
     *
     *   decode - The function to decode incoming messages. Defaults to JSON:
     *
     *     (payload, callback) => callback(JSON.parse(payload))
     *
     *   timeout - The default timeout in milliseconds to trigger push timeouts.
     *             Defaults `DEFAULT_TIMEOUT`
     *
     *   heartbeatIntervalMs - The millisec interval to send a heartbeat message
     *   reconnectAfterMs - The optional function that returns the millsec
     *                      reconnect interval. Defaults to stepped backoff of:
     *
     *     function(tries){
     *       return [1000, 5000, 10000][tries - 1] || 10000
     *     }
     *
     *   logger - The optional function for specialized logging, ie:
     *     `logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
     *
     *   longpollerTimeout - The maximum timeout of a long poll AJAX request.
     *                        Defaults to 20s (double the server long poll timer).
     *
     *   params - The optional params to pass when connecting
     *
     * For IE8 support use an ES5-shim (https://github.com/es-shims/es5-shim)
     */
    constructor(endPoint, opts) {
        this.stateChangeCallbacks = { open: [], close: [], error: [], message: [] };
        this.channels = [];
        this.sendBuffer = [];
        this.ref = 0;
        this.timeout = (opts === null || opts === void 0 ? void 0 : opts.timeout) || constants_1.DEFAULT_TIMEOUT;
        this.transport = (opts === null || opts === void 0 ? void 0 : opts.transport) || WebSocket;
        this.defaultEncoder = (payload, callback) => callback(JSON.stringify(payload));
        this.defaultDecoder = (payload, callback) => callback(JSON.parse(payload));
        this.encode = (opts === null || opts === void 0 ? void 0 : opts.encode) || this.defaultEncoder;
        this.decode = (opts === null || opts === void 0 ? void 0 : opts.decode) || this.defaultDecoder;
        this.conn = null;
        this.heartbeatIntervalMs = (opts === null || opts === void 0 ? void 0 : opts.heartbeatIntervalMs) || 30000;
        this.reconnectAfterMs = (opts === null || opts === void 0 ? void 0 : opts.reconnectAfterMs) || function (tries) {
            return [1000, 2000, 5000, 10000][tries - 1] || 10000;
        };
        this.logger = (opts === null || opts === void 0 ? void 0 : opts.logger) || function () { };
        this.longPollerTimeout = (opts === null || opts === void 0 ? void 0 : opts.longpollerTimeout) || 20000;
        this.params = (opts === null || opts === void 0 ? void 0 : opts.params) || {};
        this.endPoint = `${endPoint}/${constants_1.TRANSPORTS.websocket}`;
        this.heartbeatTimer = null;
        this.pendingHeartbeatRef = null;
        this.reconnectTimer = new timer_1.default(() => {
            this.disconnect(() => this.connect());
        }, this.reconnectAfterMs);
    }
    endPointURL() {
        return this.appendParams(this.endPoint, Object.assign({}, this.params, { vsn: constants_1.VSN }));
    }
    appendParams(url, params) {
        if (Object.keys(params).length === 0)
            return url;
        let prefix = url.match(/\?/) ? "&" : "?";
        return `${url}${prefix}${querystring.stringify(params)}`;
    }
    disconnect(callback, code, reason) {
        if (this.conn) {
            this.conn.onclose = function () { }; // noop
            if (code)
                this.conn.close(code, reason || "");
            else
                this.conn.close();
            this.conn = null;
        }
        callback && callback();
    }
    connect() {
        if (this.conn)
            return;
        // @ts-ignore
        this.conn = new this.transport(this.endPointURL());
        this.conn.timeout = this.longPollerTimeout;
        this.conn.onopen = () => this.onConnOpen();
        this.conn.onerror = (error) => this.onConnError(error);
        this.conn.onmessage = (event) => this.onConnMessage(event);
        this.conn.onclose = (event) => this.onConnClose(event);
    }
    /**
     * @desc Logs the message. Override `this.logger` for specialized logging. noops by default
     * @param kind {string} - "error", "info", or "log"
     * @param msg {string} - The log message.
     * @param data {object} - Addition information.
     */
    log(kind, msg, data) {
        this.logger(kind, msg, data);
    }
    /**
     * @desc Registers callbacks for connection state change events
     * @param callback {function} - The callback to be invoked.
     *
     * Examples
     *      socket.onError(function(error){ alert("An error occurred") })
     */
    onOpen(callback) {
        this.stateChangeCallbacks.open.push(callback);
    }
    /**
     * @desc Registers callbacks for connection state change events
     * @param callback {function} - The callback to be invoked.
     */
    onClose(callback) {
        this.stateChangeCallbacks.close.push(callback);
    }
    /**
     * @desc Registers callbacks for connection error events
     * @param callback {function} - The callback to be invoked.
     * /
    onError(callback: ((...a: any[]) => void)) {
        this.stateChangeCallbacks.error.push(callback);
    }

    /**
     * @desc Registers callbacks for message received events
     * @param callback {function} - The callback to be invoked
     */
    onMessage(callback) {
        this.stateChangeCallbacks.message.push(callback);
    }
    /**
     * @desc Sends data to the server over the WebSocket connection
     */
    onConnOpen() {
        var _a;
        this.log("transport", `connected to ${this.endPointURL()}`);
        this.flushSendBuffer();
        this.reconnectTimer.reset();
        if (!((_a = this.conn) === null || _a === void 0 ? void 0 : _a.skipHeartbeat)) {
            this.heartbeatTimer && clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
        }
        this.stateChangeCallbacks.open.forEach(callback => callback());
    }
    onConnClose(event) {
        this.log("transport", "close", event);
        this.triggerChanError(); // triggers any channels who have a close callback
        this.heartbeatTimer && clearInterval(this.heartbeatTimer);
        this.reconnectTimer.scheduleTimeout();
        this.stateChangeCallbacks.close.forEach(callback => callback(event));
    }
    onConnError(error) {
        this.log("transport", error);
        this.triggerChanError(); // triggers any channels who have a close callback
        this.stateChangeCallbacks.error.forEach(callback => callback(error));
    }
    triggerChanError() {
        this.channels.forEach(channel => channel.trigger(constants_1.CHANNEL_EVENTS.error, {}, null));
    }
    connectionState() {
        switch (this.conn && this.conn.readyState) {
            case constants_1.SOCKET_STATES.connecting:
                return "connecting";
            case constants_1.SOCKET_STATES.open:
                return "open";
            case constants_1.SOCKET_STATES.closing:
                return "closing";
            default:
                return "closed";
        }
    }
    isConnected() {
        return this.connectionState() === "open";
    }
    remove(channel) {
        this.channels = this.channels.filter(c => c.joinRef() !== channel.joinRef());
    }
    channel(topic, chanParams = {}) {
        let chan = new channel_1.default(topic, chanParams, this);
        this.channels.push(chan);
        return chan;
    }
    push(data) {
        let { topic, event, payload, ref } = data;
        let callback = () => {
            this.encode(data, result => {
                var _a;
                (_a = this.conn) === null || _a === void 0 ? void 0 : _a.send(result);
            });
        };
        this.log("push", `${topic} ${event} (${ref})`, payload);
        this.isConnected() ? callback() : this.sendBuffer.push(callback);
    }
    /**
     * @desc Return the next message ref, accounting for overflows
     */
    makeRef() {
        let newRef = this.ref + 1;
        this.ref = newRef === this.ref ? 0 : newRef;
        return this.ref.toString();
    }
    /**
     * @desc Send the heartbeat event to the server
     */
    sendHeartbeat() {
        var _a;
        if (!this.isConnected())
            return;
        if (this.pendingHeartbeatRef) {
            this.pendingHeartbeatRef = null;
            this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
            (_a = this.conn) === null || _a === void 0 ? void 0 : _a.close(constants_1.WS_CLOSE_NORMAL, "heartbeat timeout");
            return;
        }
        this.pendingHeartbeatRef = this.makeRef();
        this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: this.pendingHeartbeatRef });
    }
    /**
     * @desc Clears the sendBuffer and invokes the callbacks
     */
    flushSendBuffer() {
        if (this.isConnected() && this.sendBuffer.length > 0) {
            this.sendBuffer.forEach(callback => callback());
            this.sendBuffer = [];
        }
    }
    /**
     * @desc Encode the message and call the callback with the result
     * @param {Object} rawMessage - The message to encode
     */
    onConnMessage(rawMessage) {
        this.decode(rawMessage.data, msg => {
            let { topic, event, payload, ref } = msg;
            if (ref && ref === this.pendingHeartbeatRef)
                this.pendingHeartbeatRef = null;
            this.log("receive", `${payload.status || ""} ${topic} ${event} ${ref && "(" + ref + ")" || ""}`, payload);
            this.channels.filter(channel => channel.isMember(topic))
                .forEach(channel => channel.trigger(event, payload, ref));
            this.stateChangeCallbacks.message.forEach(callback => callback(msg));
        });
    }
}
exports.default = Socket;
