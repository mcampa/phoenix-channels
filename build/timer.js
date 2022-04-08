"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Timer {
    /**
     * @desc Creates a timer that accepts a `timerCalc` function to perform
     *       calculated timeout retries, such as exponential backoff.
     *
     *      ## Examples
     *      let reconnectTimer = new Timer(() => this.connect(), function(tries){
     *        return [1000, 5000, 10000][tries - 1] || 10000
     *      })
     *      reconnectTimer.scheduleTimeout() // fires after 1000
     *      reconnectTimer.scheduleTimeout() // fires after 5000
     *      reconnectTimer.reset()
     *      reconnectTimer.scheduleTimeout() // fires after 1000
     *
     * @param callback The callback to be called when the timer is done.
     * @param timerCalc The function to calculate the timer.
     */
    constructor(callback, timerCalc) {
        this._callback = callback;
        this._timerCalc = timerCalc;
        this._timer = null;
        this._tries = 0;
    }
    /**
     * @desc resets the timer to zero
     * @protected
     */
    reset() {
        this._tries = 0;
        this._timer && clearTimeout(this._timer);
    }
    /**
     * @desc Cancels any previous scheduleTimeout and schedules callback
     */
    scheduleTimeout() {
        this._timer && clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this._tries = this._tries + 1;
            this._callback();
        }, this._timerCalc(this._tries + 1));
    }
}
exports.default = Timer;
