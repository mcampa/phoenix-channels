import {CHANNEL_EVENTS, DEFAULT_TIMEOUT, SOCKET_STATES, TRANSPORTS, VSN, WS_CLOSE_NORMAL} from "./constants";
import Timer from "./timer";
import * as querystring from "querystring";
import Channel from "./channel";
const WebSocket = require("websocket").w3cwebsocket;

export default class Socket {
    public channels: Channel[];
    public stateChangeCallbacks: {error: ((...a:any[]) => void)[], message: ((...a:any[]) => void)[], close: ((...a:any[]) => void)[], open: ((...a:any[]) => void)[]};
    public sendBuffer: ((...args: any[]) => void)[];
    public readonly params: any;
    public readonly encode: (payload: any, callback: (...args: any[]) => void) => void;
    public readonly decode: (payload: any, callback: (...args: any[]) => void) => void;
    public readonly heartbeatIntervalMs: number;
    public readonly transport: WebSocket;
    public readonly reconnectAfterMs: (tries: number) => number;
    public readonly logger: (kind: string, msg: string, data: any) => void;
    public timeout: number;
    public readonly endPoint: string;
    private readonly longPollerTimeout: number;
    private readonly defaultEncoder: (payload: any, callback: (...args: any[]) => void) => void;
    private readonly defaultDecoder: (payload: any, callback: (...args: any[]) => void) => void;
    private reconnectTimer: Timer;
    private pendingHeartbeatRef: string | null;
    private heartbeatTimer: NodeJS.Timeout | null;
    private conn: WebSocket & {skipHeartbeat: boolean, timeout: number} | null;
    private ref: number;

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
    constructor(endPoint: any, opts?: {transport?: WebSocket, timeout?: number, decode?: (payload: any, callback: any) => any, encode?: (payload: any, callback: any) => any, heartbeatIntervalMs?: number, reconnectAfterMs?: (tries: any) => number, logger?: (kind: any, msg: any, data: any) => void, longpollerTimeout?: number, params?: any}) {
        this.stateChangeCallbacks = {open: [], close: [], error: [], message: []};
        this.channels = [];
        this.sendBuffer = [];
        this.ref = 0;
        this.timeout = opts?.timeout || DEFAULT_TIMEOUT;
        this.transport = opts?.transport || WebSocket;
        this.defaultEncoder = (payload, callback) => callback(JSON.stringify(payload));
        this.defaultDecoder = (payload, callback) => callback(JSON.parse(payload));

        this.encode = opts?.encode || this.defaultEncoder;
        this.decode = opts?.decode || this.defaultDecoder;

        this.conn = null;
        this.heartbeatIntervalMs = opts?.heartbeatIntervalMs || 30000;
        this.reconnectAfterMs = opts?.reconnectAfterMs || function (tries) {
            return [1000, 2000, 5000, 10000][tries - 1] || 10000
        };
        this.logger = opts?.logger || function () {};
        this.longPollerTimeout = opts?.longpollerTimeout || 20000;
        this.params = opts?.params || {};
        this.endPoint = `${endPoint}/${TRANSPORTS.websocket}`;
        this.heartbeatTimer = null;
        this.pendingHeartbeatRef = null;
        this.reconnectTimer = new Timer(() => {
            this.disconnect(() => this.connect())
        }, this.reconnectAfterMs);
    }

    public endPointURL() {
        return this.appendParams(this.endPoint, Object.assign({}, this.params, {vsn: VSN}));
    }

    public appendParams(url: string, params: querystring.ParsedUrlQueryInput): string {
        if (Object.keys(params).length === 0)
            return url;

        let prefix = url.match(/\?/) ? "&" : "?";
        return `${url}${prefix}${querystring.stringify(params)}`;
    }

    public disconnect(callback?: (() => void), code?: undefined, reason?: undefined) {
        if (this.conn) {
            this.conn.onclose = function () {}; // noop

            if (code)
                this.conn.close(code, reason || "");

            else
                this.conn.close();

            this.conn = null;
        }

        callback && callback();
    }

    public connect() {
        if (this.conn)
            return;

        // @ts-ignore
        this.conn = new this.transport(this.endPointURL());
        this.conn!.timeout = this.longPollerTimeout;
        this.conn!.onopen = () => this.onConnOpen();
        this.conn!.onerror = (error: any) => this.onConnError(error);
        this.conn!.onmessage = (event: any) => this.onConnMessage(event);
        this.conn!.onclose = (event: any) => this.onConnClose(event);
    }

    /**
     * @desc Logs the message. Override `this.logger` for specialized logging. noops by default
     * @param kind {string} - "error", "info", or "log"
     * @param msg {string} - The log message.
     * @param data {object} - Addition information.
     */
    public log(kind: string, msg: string, data?: any) {
        this.logger(kind, msg, data);
    }

    /**
     * @desc Registers callbacks for connection state change events
     * @param callback {function} - The callback to be invoked.
     *
     * Examples
     *      socket.onError(function(error){ alert("An error occurred") })
     */
    public onOpen(callback: ((...a: any[]) => void)) {
        this.stateChangeCallbacks.open.push(callback);
    }

    /**
     * @desc Registers callbacks for connection state change events
     * @param callback {function} - The callback to be invoked.
     */
    public onClose(callback: ((...a: any[]) => void)) {
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
    public onMessage(callback: ((...a: any[]) => void)) {
        this.stateChangeCallbacks.message.push(callback);
    }

    /**
     * @desc Sends data to the server over the WebSocket connection
     */
    public onConnOpen() {
        this.log("transport", `connected to ${this.endPointURL()}`);
        this.flushSendBuffer();
        this.reconnectTimer.reset();

        if (!this.conn?.skipHeartbeat) {
            this.heartbeatTimer && clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
        }

        this.stateChangeCallbacks.open.forEach(callback => callback());
    }

    public onConnClose(event?: CHANNEL_EVENTS) {
        this.log("transport", "close", event);
        this.triggerChanError(); // triggers any channels who have a close callback
        this.heartbeatTimer && clearInterval(this.heartbeatTimer);
        this.reconnectTimer.scheduleTimeout();
        this.stateChangeCallbacks.close.forEach(callback => callback(event));
    }

    public onConnError(error: string) {
        this.log("transport", error);
        this.triggerChanError(); // triggers any channels who have a close callback
        this.stateChangeCallbacks.error.forEach(callback => callback(error));
    }

    public triggerChanError() {
        this.channels.forEach(channel => channel.trigger(CHANNEL_EVENTS.error, {}, null));
    }

    public connectionState() {
        switch (this.conn && this.conn.readyState) {
            case SOCKET_STATES.connecting:
                return "connecting";
            case SOCKET_STATES.open:
                return "open";
            case SOCKET_STATES.closing:
                return "closing";
            default:
                return "closed";
        }
    }

    public isConnected() {
        return this.connectionState() === "open";
    }

    public remove(channel: Channel) {
        this.channels = this.channels.filter(c => c.joinRef() !== channel.joinRef());
    }

    public channel(topic: string, chanParams: {[p: string]: any} = {}) {
        let chan = new Channel(topic, chanParams, this);
        this.channels.push(chan);
        return chan;
    }

    public push(data: { topic: string; event: CHANNEL_EVENTS | 'heartbeat'; payload: any; ref: string| null; }) {
        let {topic, event, payload, ref} = data;
        let callback = () => {
            this.encode(data, result => {
                this.conn?.send(result);
            })
        }

        this.log("push", `${topic} ${event} (${ref})`, payload);
        this.isConnected() ? callback() : this.sendBuffer.push(callback);
    }

    /**
     * @desc Return the next message ref, accounting for overflows
     */
    public makeRef() {
        let newRef = this.ref + 1;
        this.ref = newRef === this.ref ? 0 : newRef;
        return this.ref.toString();
    }

    /**
     * @desc Send the heartbeat event to the server
     */
    public sendHeartbeat() {
        if (!this.isConnected())
            return;

        if (this.pendingHeartbeatRef) {
            this.pendingHeartbeatRef = null;
            this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
            this.conn?.close(WS_CLOSE_NORMAL, "heartbeat timeout");
            return;
        }

        this.pendingHeartbeatRef = this.makeRef();
        this.push({topic: "phoenix", event: "heartbeat", payload: {}, ref: this.pendingHeartbeatRef});
    }

    /**
     * @desc Clears the sendBuffer and invokes the callbacks
     */
    public flushSendBuffer() {
        if (this.isConnected() && this.sendBuffer.length > 0) {
            this.sendBuffer.forEach(callback => callback());
            this.sendBuffer = [];
        }
    }

    /**
     * @desc Encode the message and call the callback with the result
     * @param {Object} rawMessage - The message to encode
     */
    public onConnMessage(rawMessage: { data: any; }) {
        this.decode(rawMessage.data, msg => {
            let {topic, event, payload, ref} = msg;
            if (ref && ref === this.pendingHeartbeatRef)
                this.pendingHeartbeatRef = null;

            this.log("receive", `${payload.status || ""} ${topic} ${event} ${ref && "(" + ref + ")" || ""}`, payload);
            this.channels.filter(channel => channel.isMember(topic))
                .forEach(channel => channel.trigger(event, payload, ref));

            this.stateChangeCallbacks.message.forEach(callback => callback(msg));
        });
    }
}
