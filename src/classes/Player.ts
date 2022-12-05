export default class Player {
    id: string | undefined;
    name: string;
    score: number;
    state = "not-ready";

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.score = 0;
    }
}