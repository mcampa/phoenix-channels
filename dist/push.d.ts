/// <reference types="node" />
import Channel from "./channel";
import { CHANNEL_EVENTS } from "./constants";
export default class Push {
    channel: Channel;
    readonly event: CHANNEL_EVENTS;
    readonly payload: {
        [P: string]: any;
    };
    timeoutTimer: NodeJS.Timeout | null;
    timeout: number;
    ref: string | null;
    receivedResp: any;
    private _recHooks;
    private _sent;
    private _refEvent;
    /**
     * @desc Initializes the Push
     * @param channel - The Channel
     * @param event - The event, for example `"phx_join"`
     * @param payload - The payload, for example `{user_id: 123}`
     * @param timeout - The push timeout in milliseconds
     */
    constructor(channel: Channel, event: CHANNEL_EVENTS, payload: {
        [P: string]: any;
    }, timeout: number);
    resend(timeout: number): void;
    send(): void;
    receive(status: string, callback: (a: any) => void): Push;
    startTimeout(): void;
    trigger(status: string, response: any): void;
    private matchReceive;
    private cancelRefEvent;
    private cancelTimeout;
    private hasReceived;
}
