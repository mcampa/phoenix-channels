import { CHANNEL_EVENTS } from "./constants";
import Push from "./push";
import Socket from "./sockets";
export default class Channel {
    socket: Socket;
    readonly topic: string;
    readonly params: {};
    joinedOnce: boolean;
    pushBuffer: Push[];
    readonly joinPush: Push;
    private readonly _timeout;
    private _state;
    private _rejoinTimer;
    private _bindings;
    constructor(topic: string, params: {
        [p: string]: any;
    }, socket: Socket);
    rejoinUntilConnected(): void;
    join(timeout?: number): Push;
    onClose(callback: ((...a: any[]) => void)): void;
    onError(callback: ((...a: any[]) => void)): void;
    on(event: CHANNEL_EVENTS, callback: ((...a: any[]) => void)): void;
    off(event: CHANNEL_EVENTS): void;
    canPush(): boolean;
    push(event: CHANNEL_EVENTS, payload: any, timeout?: number): Push;
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
    leave(timeout?: number): Push;
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
    onMessage(event: CHANNEL_EVENTS, payload: any, ref: string | null): any;
    isMember(topic: string): boolean;
    joinRef(): string | null;
    private sendJoin;
    private rejoin;
    trigger(event: CHANNEL_EVENTS | null, payload: any, ref: string | null): void;
    replyEventName(ref: string): string;
    isClosed(): boolean;
    isErrored(): boolean;
    isJoined(): boolean;
    isJoining(): boolean;
    isLeaving(): boolean;
}
