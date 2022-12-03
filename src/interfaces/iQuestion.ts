import iAtom from "./iAtom";

export default interface iQuestion {
    "@_price": number,
    right: { answer: string }
    scenario: {
        atom: [string | iAtom]
    }
}