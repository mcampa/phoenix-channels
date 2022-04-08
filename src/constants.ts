enum CHANNEL_STATES {
    closed = "closed",
    errored = "errored",
    joined = "joined",
    joining = "joining",
    leaving = "leaving",
}

enum CHANNEL_EVENTS {
    close = "phx_close",
    error = "phx_error",
    join = "phx_join",
    reply = "phx_reply",
    leave = "phx_leave",
}

enum TRANSPORTS {
    websocket = "websocket",
}

enum SOCKET_STATES {
    connecting = 0,
    open = 1,
    closing = 2,
    closed = 3,
}

const VSN = "1.0.0";
const DEFAULT_TIMEOUT = 10000;
const WS_CLOSE_NORMAL = 1000;

export {
    CHANNEL_STATES,
    CHANNEL_EVENTS,
    TRANSPORTS,
    VSN,
    DEFAULT_TIMEOUT,
    WS_CLOSE_NORMAL,
    SOCKET_STATES,
};
