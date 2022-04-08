import Channel from "./channel";
import {CHANNEL_EVENTS} from "./constants";

export default class Push {
    public channel: Channel;
    public readonly event: CHANNEL_EVENTS;
    public readonly payload: { [P: string]: any };
    public timeoutTimer: NodeJS.Timeout | null;
    public timeout: number;
    public ref: string | null;
    public receivedResp: any;
    private _recHooks: Array<{ status: string, callback: (a: any) => void }>;
    private _sent: boolean;
    private _refEvent: CHANNEL_EVENTS | null;

    /**
     * @desc Initializes the Push
     * @param channel - The Channel
     * @param event - The event, for example `"phx_join"`
     * @param payload - The payload, for example `{user_id: 123}`
     * @param timeout - The push timeout in milliseconds
     */
    constructor(channel: Channel, event: CHANNEL_EVENTS, payload: { [P: string]: any }, timeout: number) {
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

    public resend(timeout: number) {
        this.timeout = timeout
        this.cancelRefEvent()
        this.ref = null
        this._refEvent = null
        this.receivedResp = null
        this._sent = false
        this.send()
    }

    public send() {
        if (this.hasReceived("timeout"))
            return;

        this.startTimeout();
        this._sent = true;
        this.channel.socket.push({
            topic: this.channel.topic,
            event: this.event,
            payload: this.payload,
            ref: this.ref,
        })
    }

    public receive(status: string, callback: (a: any) => void): Push {
        this.hasReceived(status) && callback(this.receivedResp.response);
        this._recHooks.push({status, callback});
        return this;
    }

    public startTimeout() {
        if (this.timeoutTimer)
            return;

        this.ref = this.channel.socket.makeRef();
        this._refEvent = this.channel.replyEventName(this.ref) as CHANNEL_EVENTS;

        this.channel.on(this._refEvent, (payload: any) => {
            this.cancelRefEvent();
            this.cancelTimeout();
            this.receivedResp = payload;
            this.matchReceive(payload);
        })

        this.timeoutTimer = setTimeout(() => {
            this.trigger("timeout", {});
        }, this.timeout)
    }

    public trigger(status: string, response: any) {
        this.channel.trigger(this._refEvent, {status, response}, null);
    }

    private matchReceive({status, response, ref}: { status: string, response: any, ref: string }) {
        this._recHooks.filter(h => h.status === status)
            .forEach(h => h.callback(response));
    }

    private cancelRefEvent() {
        if (!this._refEvent)
            return;

        this.channel.off(this._refEvent);
    }

    private cancelTimeout() {
        this.timeoutTimer && clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
    }

    private hasReceived(status: string) {
        return this.receivedResp && this.receivedResp.status === status
    }
}