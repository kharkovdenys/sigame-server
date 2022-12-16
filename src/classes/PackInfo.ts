export default class PackInfo {
    name: string;
    version: string;
    date: string;
    difficulty: string;
    logo?: string;
    authors?: string[] | string;

    constructor(name: string, version: string, date: string, difficulty: string, logo: string | undefined, authors: string[] | string | undefined) {
        this.name = name;
        this.version = version;
        this.date = date;
        this.difficulty = difficulty;
        this.logo = logo;
        this.authors = authors;
    }

    getString(): string {
        return 'Name of the pack: ' + this.name + '\n'
            + 'Authors of the pack: ' + (Array.isArray(this.authors) ? this.authors : [this.authors]).join(' ') + '\n'
            + 'Date of creation of the pack: ' + this.date;
    }
}