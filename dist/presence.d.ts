interface Presence {
    metas: Array<{
        phx_ref: string;
    }>;
}
declare type PresenceObject = {
    [p: string]: Presence;
};
declare type PresenceCallback = (k: string, c: Presence, n: Presence) => void;
declare const presence: {
    syncState(currentState: PresenceObject, newState: PresenceObject, onJoin: PresenceCallback, onLeave: PresenceCallback): PresenceObject;
    syncDiff(currentState: PresenceObject, { joins, leaves }: {
        joins: PresenceObject;
        leaves: PresenceObject;
    }, onJoin: PresenceCallback, onLeave: PresenceCallback): PresenceObject;
    list(presences: Presence[], chooser: (key: string, presence: Presence) => any): void[];
    map<S extends {
        [p: string]: any;
    }>(obj: S, func: (key: string, value: any) => void): void[];
    clone<S_1>(obj: S_1): S_1;
};
export default presence;
