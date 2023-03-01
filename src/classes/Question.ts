import iAtom from "../interfaces/iAtom";
import Atom from "./Atom";

export default class Question {
    price: number;
    answer: string;
    atom: Atom[] = [];
    used = false;

    constructor(price: number, answer: string, atom: [string | iAtom]) {
        this.price = price;
        if (Array.isArray(answer))
            this.answer = answer.join('\n');
        else
            this.answer = answer.toString();
        if (!Array.isArray(atom))
            atom = [atom];
        for (const resource of atom) {
            if (typeof resource === 'string')
                this.atom.push(new Atom(resource, undefined, undefined));
            else
                this.atom.push(new Atom(resource["#text"], resource["@_type"], resource["@_time"]));
        }
    }
}
