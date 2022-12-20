export default class Atom {
    text?: string;
    type: string;
    time?: string;
    constructor(text: string | undefined, type: string | undefined, time: string | undefined) {
        this.text = text;
        this.type = type ? type : 'default';
        this.time = time;
    }
}