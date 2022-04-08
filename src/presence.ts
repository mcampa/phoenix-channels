interface Presence {
    metas: Array<{
        phx_ref: string;
    }>
}

type PresenceObject = {[p: string]: Presence};
type PresenceCallback = (k: string, c: Presence, n: Presence) => void;

const presence = {
    syncState(currentState: PresenceObject, newState: PresenceObject, onJoin: PresenceCallback, onLeave: PresenceCallback){
        let state = this.clone(currentState)
        let joins: PresenceObject = {};
        let leaves: PresenceObject = {};

        this.map(state, (key: string, presence: any) => {
            if(!newState[key]){
                leaves[key] = presence;
            }
        })

        this.map(newState, (key: string, newPresence: Presence) => {
            let currentPresence = state[key]
            if(currentPresence){
                let newRefs = newPresence.metas.map(m => m.phx_ref)
                let curRefs = currentPresence.metas.map(m => m.phx_ref)
                let joinedMetas = newPresence.metas.filter(m => curRefs.indexOf(m.phx_ref) < 0)
                let leftMetas = currentPresence.metas.filter(m => newRefs.indexOf(m.phx_ref) < 0)
                if(joinedMetas.length > 0){
                    joins[key] = newPresence
                    joins[key].metas = joinedMetas
                }
                if(leftMetas.length > 0){
                    leaves[key] = this.clone(currentPresence)
                    leaves[key].metas = leftMetas
                }
            } else {
                joins[key] = newPresence
            }
        })
        return this.syncDiff(state, {joins, leaves}, onJoin, onLeave)
    },

    syncDiff(currentState: PresenceObject, {joins, leaves}: {joins: PresenceObject, leaves: PresenceObject}, onJoin: PresenceCallback, onLeave: PresenceCallback){
        let state = this.clone(currentState)
        if(!onJoin){ onJoin = function(){} }
        if(!onLeave){ onLeave = function(){} }

        this.map(joins, (key: string, newPresence: Presence) => {
            let currentPresence = state[key]
            state[key] = newPresence
            if(currentPresence){
                state[key].metas.unshift(...currentPresence.metas)
            }
            onJoin(key, currentPresence, newPresence)
        })
        this.map(leaves, (key: string, leftPresence: Presence) => {
            let currentPresence = state[key]
            if(!currentPresence){ return }
            let refsToRemove = leftPresence.metas.map(m => m.phx_ref)
            currentPresence.metas = currentPresence.metas.filter(p => {
                return refsToRemove.indexOf(p.phx_ref) < 0
            })
            onLeave(key, currentPresence, leftPresence)
            if(currentPresence.metas.length === 0){
                delete state[key]
            }
        })
        return state
    },

    list(presences: Presence[], chooser: (key: string, presence: Presence) => any){
        if(!chooser)
            chooser = function(key: string, pres: any){return pres}

        return this.map(presences, (key, presence) => {
            return chooser(key, presence)
        })
    },

    map<S extends {[p: string]: any}>(obj: S, func: ((key: string, value: any) => void)){
        return Object.getOwnPropertyNames(obj).map(key => func(key, obj[key]))
    },

    clone<S>(obj: S): S {
        return JSON.parse(JSON.stringify(obj))
    },
}

export default presence;