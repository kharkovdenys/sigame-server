export default class PackInfo {
    name: string;
    version: string;
    date: string;
    difficulty: string;
    logo?: string;
    authors?: string;

    constructor(name: string, version: string, date: string, difficulty: string, logo: string | undefined, authors: string[] | string | undefined) {
        this.name = name;
        this.version = version;
        this.date = date;
        this.difficulty = difficulty;
        this.logo = logo;
        this.authors = (Array.isArray(authors) ? authors : [authors]).join(' ');
    }

    getString(): string {
        return `Name: ${this.name}, Authors: ${this.authors}, Date: ${this.date}`;
    }
}