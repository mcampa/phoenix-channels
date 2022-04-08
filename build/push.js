"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Push {
    /**
     * @desc Initializes the Push
     * @param channel - The Channel
     * @param event - The event, for example `"phx_join"`
     * @param payload - The payload, for example `{user_id: 123}`
     * @param timeout - The push timeout in milliseconds
     */
    constructor(channel, event, payload, timeout) {
        this.channel = channel;
        this.event = event;
        this.payload = payload || {};
        this.receivedResp = null;
        this.timeout = timeout;
        this.timeoutTimer = null;
        this._recHooks = [];
        this._sent = false;
        this._refEvent = null;
        this.ref = null;
    }
    resend(timeout) {
        this.timeout = timeout;
        this.cancelRefEvent();
        this.ref = null;
        this._refEvent = null;
        this.receivedResp = null;
        this._sent = false;
        this.send();
    }
    send() {
        if (this.hasReceived("timeout"))
            return;
        this.startTimeout();
        this._sent = true;
        this.channel.socket.push({
            topic: this.channel.topic,
            event: this.event,
            payload: this.payload,
            ref: this.ref,
        });
    }
    receive(status, callback) {
        this.hasReceived(status) && callback(this.receivedResp.response);
        this._recHooks.push({ status, callback });
        return this;
    }
    startTimeout() {
        if (this.timeoutTimer)
            return;
        this.ref = this.channel.socket.makeRef();
        this._refEvent = this.channel.replyEventName(this.ref);
        this.channel.on(this._refEvent, (payload) => {
            this.cancelRefEvent();
            this.cancelTimeout();
            this.receivedResp = payload;
            this.matchReceive(payload);
        });
        this.timeoutTimer = setTimeout(() => {
            this.trigger("timeout", {});
        }, this.timeout);
    }
    trigger(status, response) {
        this.channel.trigger(this._refEvent, { status, response }, null);
    }
    matchReceive({ status, response, ref }) {
        this._recHooks.filter(h => h.status === status)
            .forEach(h => h.callback(response));
    }
    cancelRefEvent() {
        if (!this._refEvent)
            return;
        this.channel.off(this._refEvent);
    }
    cancelTimeout() {
        this.timeoutTimer && clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
    }
    hasReceived(status) {
        return this.receivedResp && this.receivedResp.status === status;
    }
}
exports.default = Push;
