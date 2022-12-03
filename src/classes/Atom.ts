export default class Atom {
    text: string | undefined;
    type: string;
    time: string | undefined;
    constructor(text: string | undefined, type: string | undefined, time: string | undefined) {
        this.text = text;
        this.type = type ?? 'default';
        this.time = time;
    }
}