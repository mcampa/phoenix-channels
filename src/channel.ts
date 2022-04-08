import {CHANNEL_EVENTS, CHANNEL_STATES} from "./constants";
import Timer from "./timer";
import Push from "./push";
import Socket from "./sockets";

export default class Channel {
    public socket: Socket;
    public readonly topic: string;
    public readonly params: {};
    public joinedOnce: boolean;
    public pushBuffer: Push[];
    public readonly joinPush: Push;
    private readonly _timeout: number;
    private _state: CHANNEL_STATES;
    private _rejoinTimer: Timer;
    private _bindings: Array<{event: CHANNEL_EVENTS, callback: ((...a: any[])=>void)}>;

    constructor(topic: string, params: {[p: string]: any}, socket: Socket) {
        this._state = CHANNEL_STATES.closed;
        this.topic = topic;
        this.params = params || {}
        this.socket = socket;
        this._bindings = [];
        this._timeout = this.socket.timeout;
        this.joinedOnce = false;
        this.joinPush = new Push(this, CHANNEL_EVENTS.join, this.params, this._timeout);
        this.pushBuffer = [];
        this._rejoinTimer = new Timer(
            () => this.rejoinUntilConnected(),
            this.socket.reconnectAfterMs
        )

        this.joinPush.receive("ok", () => {
            this._state = CHANNEL_STATES.joined;
            this._rejoinTimer.reset();
            this.pushBuffer.forEach(pushEvent => pushEvent.send());
            this.pushBuffer = [];
        })

        this.onClose(() => {
            this._rejoinTimer.reset();
            this.socket.log("channel", `close ${this.topic} ${this.joinRef()}`);
            this._state = CHANNEL_STATES.closed;
            this.socket.remove(this);
        })

        this.onError((reason: any) => {
            if (this.isLeaving() || this.isClosed())
                return;

            this.socket.log("channel", `error ${this.topic}`, reason);
            this._state = CHANNEL_STATES.errored;
            this._rejoinTimer.scheduleTimeout();
        })

        this.joinPush.receive("timeout", () => {
            if (!this.isJoining())
                return;

            this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout);
            this._state = CHANNEL_STATES.errored;
            this._rejoinTimer.scheduleTimeout();
        })

        this.on(CHANNEL_EVENTS.reply, (payload, ref) => {
            this.trigger(this.replyEventName(ref) as CHANNEL_EVENTS, payload, null);
        })
    }

    public rejoinUntilConnected() {
        this._rejoinTimer.scheduleTimeout();
        if (this.socket.isConnected())
            this.rejoin();

    }

    public join(timeout = this._timeout) {
        if (this.joinedOnce)
            throw(`tried to join multiple times. 'join' can only be called a single time per channel instance`);

        else {
            this.joinedOnce = true;
            this.rejoin(timeout);
            return this.joinPush;
        }
    }

    public onClose(callback: ((...a: any[]) => void)) {
        this.on(CHANNEL_EVENTS.close, callback);
    }

    public onError(callback: ((...a: any[]) => void)) {
        this.on(CHANNEL_EVENTS.error, (reason: any) => callback(reason));
    }

    public on(event: CHANNEL_EVENTS, callback: ((...a: any[]) => void)) {
        this._bindings.push({event, callback});
    }

    public off(event: CHANNEL_EVENTS) {
        this._bindings = this._bindings.filter(bind => bind.event !== event);
    }

    public canPush() {
        return this.socket.isConnected() && this.isJoined();
    }

    public push(event: CHANNEL_EVENTS, payload: any, timeout = this._timeout) {
        if (!this.joinedOnce)
            throw(`tried to push '${event}' to '${this.topic}' before joining. Use channel.join() before pushing events`);

        let pushEvent = new Push(this, event, payload, timeout);
        if (this.canPush()) {
            pushEvent.send();
        } else {
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
    public leave(timeout = this._timeout) {
        this._state = CHANNEL_STATES.leaving;
        let onClose = () => {
            this.socket.log("channel", `leave ${this.topic}`);
            this.trigger(CHANNEL_EVENTS.close, "leave", this.joinRef());
        }

        let leavePush = new Push(this, CHANNEL_EVENTS.leave, {}, timeout);
        leavePush.receive("ok", () => onClose())
            .receive("timeout", () => onClose())

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
    public onMessage(event: CHANNEL_EVENTS, payload: any, ref: string | null) {
        return payload;
    }

    public isMember(topic: string) {
        return this.topic === topic;
    }

    public joinRef() {
        return this.joinPush.ref;
    }

    private sendJoin(timeout: number) {
        this._state = CHANNEL_STATES.joining;
        this.joinPush.resend(timeout);
    }

    private rejoin(timeout = this._timeout) {
        if (this.isLeaving())
            return;

        this.sendJoin(timeout);
    }

    trigger(event: CHANNEL_EVENTS | null, payload: any, ref: string | null) {
        let {close, error, leave, join} = CHANNEL_EVENTS;
        if (ref && event && [close, error, leave, join].indexOf(event) >= 0 && ref !== this.joinRef())
            return;

        if (event){
            let handledPayload = this.onMessage(event, payload, ref);
            if (payload && !handledPayload)
                throw("channel onMessage callbacks must return the payload, modified or unmodified");

            this._bindings.filter(bind => bind.event === event)
                .map(bind => bind.callback(handledPayload, ref));
        }
    }

    replyEventName(ref: string): string {
        return `chan_reply_${ref}`;
    }

    isClosed() {
        return this._state === CHANNEL_STATES.closed;
    }

    isErrored() {
        return this._state === CHANNEL_STATES.errored;
    }

    isJoined() {
        return this._state === CHANNEL_STATES.joined;
    }

    isJoining() {
        return this._state === CHANNEL_STATES.joining;
    }

    isLeaving() {
        return this._state === CHANNEL_STATES.leaving;
    }
}