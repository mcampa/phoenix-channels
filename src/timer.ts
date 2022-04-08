export default class Timer {
    private readonly _timerCalc: (a: number) => number;
    private readonly _callback: () => void;
    private _timer: NodeJS.Timeout | null;
    private _tries: number;

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
    constructor(callback: () => void, timerCalc: (a: number) => number) {
        this._callback  = callback
        this._timerCalc = timerCalc
        this._timer     = null
        this._tries     = 0
    }

    /**
     * @desc resets the timer to zero
     * @protected
     */
    public reset(){
        this._tries = 0;
        this._timer && clearTimeout(this._timer);
    }

    /**
     * @desc Cancels any previous scheduleTimeout and schedules callback
     */
    public scheduleTimeout() {
        this._timer && clearTimeout(this._timer);

        this._timer = setTimeout(() => {
            this._tries = this._tries + 1
            this._callback()
        }, this._timerCalc(this._tries + 1))
    }
}