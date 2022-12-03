export default class PackInfo {
    name: string;
    version: string;
    date: string;
    difficulty: string;
    logo: string | undefined;
    authors: string[] | string | undefined;

    constructor(name: string, version: string, date: string, difficulty: string, logo: string | undefined, authors: string[] | string | undefined) {
        this.name = name;
        this.version = version;
        this.date = date;
        this.difficulty = difficulty;
        this.logo = logo;
        this.authors = authors;
    }
}