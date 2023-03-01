export default class PackInfo {
    name: string;
    date: string;
    authors?: string;

    constructor(name: string, date: string, authors?: string[] | string) {
        this.name = name;
        this.date = date;
        this.authors = (Array.isArray(authors) ? authors : [authors]).join(' ');
    }

    getString(): string {
        return `Name: ${this.name}, Authors: ${this.authors}, Date: ${this.date}`;
    }
}