export default class Timer {
    timerId?: number;
    callback: TimerHandler;
    start: number = Date.now();
    remaining: number;

    constructor(callback: TimerHandler, dalay: number) {
        this.callback = callback;
        this.remaining = dalay;
        this.resume();
    }

    pause(): void {
        clearTimeout(this.timerId);
        this.timerId = undefined;
        this.remaining -= Date.now() - this.start;
    }
    resume(): void {
        if (this.timerId) {
            return;
        }
        this.start = Date.now();
        this.timerId = setTimeout(this.callback, this.remaining);
    }
}