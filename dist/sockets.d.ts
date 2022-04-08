/// <reference types="node" />
import { CHANNEL_EVENTS } from "./constants";
import * as querystring from "querystring";
import Channel from "./channel";
export default class Socket {
    channels: Channel[];
    stateChangeCallbacks: {
        error: ((...a: any[]) => void)[];
        message: ((...a: any[]) => void)[];
        close: ((...a: any[]) => void)[];
        open: ((...a: any[]) => void)[];
    };
    sendBuffer: ((...args: any[]) => void)[];
    readonly params: any;
    readonly encode: (payload: any, callback: (...args: any[]) => void) => void;
    readonly decode: (payload: any, callback: (...args: any[]) => void) => void;
    readonly heartbeatIntervalMs: number;
    readonly transport: WebSocket;
    readonly reconnectAfterMs: (tries: number) => number;
    readonly logger: (kind: string, msg: string, data: any) => void;
    timeout: number;
    readonly endPoint: string;
    private readonly longPollerTimeout;
    private readonly defaultEncoder;
    private readonly defaultDecoder;
    private reconnectTimer;
    private pendingHeartbeatRef;
    private heartbeatTimer;
    private conn;
    private ref;
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
    constructor(endPoint: any, opts?: {
        transport?: WebSocket;
        timeout?: number;
        decode?: (payload: any, callback: any) => any;
        encode?: (payload: any, callback: any) => any;
        heartbeatIntervalMs?: number;
        reconnectAfterMs?: (tries: any) => number;
        logger?: (kind: any, msg: any, data: any) => void;
        longpollerTimeout?: number;
        params?: any;
    });
    endPointURL(): string;
    appendParams(url: string, params: querystring.ParsedUrlQueryInput): string;
    disconnect(callback?: (() => void), code?: undefined, reason?: undefined): void;
    connect(): void;
    /**
     * @desc Logs the message. Override `this.logger` for specialized logging. noops by default
     * @param kind {string} - "error", "info", or "log"
     * @param msg {string} - The log message.
     * @param data {object} - Addition information.
     */
    log(kind: string, msg: string, data?: any): void;
    /**
     * @desc Registers callbacks for connection state change events
     * @param callback {function} - The callback to be invoked.
     *
     * Examples
     *      socket.onError(function(error){ alert("An error occurred") })
     */
    onOpen(callback: ((...a: any[]) => void)): void;
    /**
     * @desc Registers callbacks for connection state change events
     * @param callback {function} - The callback to be invoked.
     */
    onClose(callback: ((...a: any[]) => void)): void;
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
    onMessage(callback: ((...a: any[]) => void)): void;
    /**
     * @desc Sends data to the server over the WebSocket connection
     */
    onConnOpen(): void;
    onConnClose(event?: CHANNEL_EVENTS): void;
    onConnError(error: string): void;
    triggerChanError(): void;
    connectionState(): "closed" | "connecting" | "open" | "closing";
    isConnected(): boolean;
    remove(channel: Channel): void;
    channel(topic: string, chanParams?: {
        [p: string]: any;
    }): Channel;
    push(data: {
        topic: string;
        event: CHANNEL_EVENTS | 'heartbeat';
        payload: any;
        ref: string | null;
    }): void;
    /**
     * @desc Return the next message ref, accounting for overflows
     */
    makeRef(): string;
    /**
     * @desc Send the heartbeat event to the server
     */
    sendHeartbeat(): void;
    /**
     * @desc Clears the sendBuffer and invokes the callbacks
     */
    flushSendBuffer(): void;
    /**
     * @desc Encode the message and call the callback with the result
     * @param {Object} rawMessage - The message to encode
     */
    onConnMessage(rawMessage: {
        data: any;
    }): void;
}
