import iQuestion from "./iQuestion";

export default interface iThemes {
    "@_name": string,
    questions: { question: iQuestion[] }
}