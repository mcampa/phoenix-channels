"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const timer_1 = __importDefault(require("./timer"));
const push_1 = __importDefault(require("./push"));
class Channel {
    constructor(topic, params, socket) {
        this._state = constants_1.CHANNEL_STATES.closed;
        this.topic = topic;
        this.params = params || {};
        this.socket = socket;
        this._bindings = [];
        this._timeout = this.socket.timeout;
        this.joinedOnce = false;
        this.joinPush = new push_1.default(this, constants_1.CHANNEL_EVENTS.join, this.params, this._timeout);
        this.pushBuffer = [];
        this._rejoinTimer = new timer_1.default(() => this.rejoinUntilConnected(), this.socket.reconnectAfterMs);
        this.joinPush.receive("ok", () => {
            this._state = constants_1.CHANNEL_STATES.joined;
            this._rejoinTimer.reset();
            this.pushBuffer.forEach(pushEvent => pushEvent.send());
            this.pushBuffer = [];
        });
        this.onClose(() => {
            this._rejoinTimer.reset();
            this.socket.log("channel", `close ${this.topic} ${this.joinRef()}`);
            this._state = constants_1.CHANNEL_STATES.closed;
            this.socket.remove(this);
        });
        this.onError((reason) => {
            if (this.isLeaving() || this.isClosed())
                return;
            this.socket.log("channel", `error ${this.topic}`, reason);
            this._state = constants_1.CHANNEL_STATES.errored;
            this._rejoinTimer.scheduleTimeout();
        });
        this.joinPush.receive("timeout", () => {
            if (!this.isJoining())
                return;
            this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout);
            this._state = constants_1.CHANNEL_STATES.errored;
            this._rejoinTimer.scheduleTimeout();
        });
        this.on(constants_1.CHANNEL_EVENTS.reply, (payload, ref) => {
            this.trigger(this.replyEventName(ref), payload, null);
        });
    }
    rejoinUntilConnected() {
        this._rejoinTimer.scheduleTimeout();
        if (this.socket.isConnected())
            this.rejoin();
    }
    join(timeout = this._timeout) {
        if (this.joinedOnce)
            throw (`tried to join multiple times. 'join' can only be called a single time per channel instance`);
        else {
            this.joinedOnce = true;
            this.rejoin(timeout);
            return this.joinPush;
        }
    }
    onClose(callback) {
        this.on(constants_1.CHANNEL_EVENTS.close, callback);
    }
    onError(callback) {
        this.on(constants_1.CHANNEL_EVENTS.error, (reason) => callback(reason));
    }
    on(event, callback) {
        this._bindings.push({ event, callback });
    }
    off(event) {
        this._bindings = this._bindings.filter(bind => bind.event !== event);
    }
    canPush() {
        return this.socket.isConnected() && this.isJoined();
    }
    push(event, payload, timeout = this._timeout) {
        if (!this.joinedOnce)
            throw (`tried to push '${event}' to '${this.topic}' before joining. Use channel.join() before pushing events`);
        let pushEvent = new push_1.default(this, event, payload, timeout);
        if (this.canPush()) {
            pushEvent.send();
        }
        else {
            pushEvent.startTimeout();
            this.pushBuffer.push(pushEvent);
        }
        return pushEvent;
    }
    /**
     * @desc Leaves the channel
     *
     * Unsubscribes from server events, and
     * instructs channel to terminate on server
     *
     * Triggers onClose() hooks
     *
     * To receive leave acknowledgements, use the a `receive`
     * hook to bind to the server ack, ie:
     *
     *    channel.leave().receive("ok", () => alert("left!") )
     * @param timeout
     */
    leave(timeout = this._timeout) {
        this._state = constants_1.CHANNEL_STATES.leaving;
        let onClose = () => {
            this.socket.log("channel", `leave ${this.topic}`);
            this.trigger(constants_1.CHANNEL_EVENTS.close, "leave", this.joinRef());
        };
        let leavePush = new push_1.default(this, constants_1.CHANNEL_EVENTS.leave, {}, timeout);
        leavePush.receive("ok", () => onClose())
            .receive("timeout", () => onClose());
        leavePush.send();
        if (!this.canPush()) {
            leavePush.trigger("ok", {});
        }
        return leavePush;
    }
    /**
     * @desc Overridable message hook
     *
     * Receives all events for specialized message handling
     * before dispatching to the channel callbacks.
     *
     * Must return the payload, modified or unmodified
     * @param event
     * @param payload
     * @param ref
     */
    onMessage(event, payload, ref) {
        return payload;
    }
    isMember(topic) {
        return this.topic === topic;
    }
    joinRef() {
        return this.joinPush.ref;
    }
    sendJoin(timeout) {
        this._state = constants_1.CHANNEL_STATES.joining;
        this.joinPush.resend(timeout);
    }
    rejoin(timeout = this._timeout) {
        if (this.isLeaving())
            return;
        this.sendJoin(timeout);
    }
    trigger(event, payload, ref) {
        let { close, error, leave, join } = constants_1.CHANNEL_EVENTS;
        if (ref && event && [close, error, leave, join].indexOf(event) >= 0 && ref !== this.joinRef())
            return;
        if (event) {
            let handledPayload = this.onMessage(event, payload, ref);
            if (payload && !handledPayload)
                throw ("channel onMessage callbacks must return the payload, modified or unmodified");
            this._bindings.filter(bind => bind.event === event)
                .map(bind => bind.callback(handledPayload, ref));
        }
    }
    replyEventName(ref) {
        return `chan_reply_${ref}`;
    }
    isClosed() {
        return this._state === constants_1.CHANNEL_STATES.closed;
    }
    isErrored() {
        return this._state === constants_1.CHANNEL_STATES.errored;
    }
    isJoined() {
        return this._state === constants_1.CHANNEL_STATES.joined;
    }
    isJoining() {
        return this._state === constants_1.CHANNEL_STATES.joining;
    }
    isLeaving() {
        return this._state === constants_1.CHANNEL_STATES.leaving;
    }
}
exports.default = Channel;
