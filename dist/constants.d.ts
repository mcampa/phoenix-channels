declare enum CHANNEL_STATES {
    closed = "closed",
    errored = "errored",
    joined = "joined",
    joining = "joining",
    leaving = "leaving"
}
declare enum CHANNEL_EVENTS {
    close = "phx_close",
    error = "phx_error",
    join = "phx_join",
    reply = "phx_reply",
    leave = "phx_leave"
}
declare enum TRANSPORTS {
    websocket = "websocket"
}
declare enum SOCKET_STATES {
    connecting = 0,
    open = 1,
    closing = 2,
    closed = 3
}
declare const VSN = "1.0.0";
declare const DEFAULT_TIMEOUT = 10000;
declare const WS_CLOSE_NORMAL = 1000;
export { CHANNEL_STATES, CHANNEL_EVENTS, TRANSPORTS, VSN, DEFAULT_TIMEOUT, WS_CLOSE_NORMAL, SOCKET_STATES, };
