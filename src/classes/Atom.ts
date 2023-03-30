export default class Atom {
    text: string;
    type: string;
    time?: string;

    constructor(text: string | undefined, type: string | undefined, time: string | undefined) {
        this.text = text || "";
        switch (type) {
            case 'image':
            case 'video': {
                this.type = type;
                break;
            }
            case 'voice': {
                this.type = 'audio';
                break;
            }
            default:
                this.type = 'text';
        }
        this.time = time;
    }
}