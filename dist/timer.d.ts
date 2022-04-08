export default class Timer {
    private readonly _timerCalc;
    private readonly _callback;
    private _timer;
    private _tries;
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
    constructor(callback: () => void, timerCalc: (a: number) => number);
    /**
     * @desc resets the timer to zero
     * @protected
     */
    reset(): void;
    /**
     * @desc Cancels any previous scheduleTimeout and schedules callback
     */
    scheduleTimeout(): void;
}
