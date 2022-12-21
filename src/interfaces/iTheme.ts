import iQuestion from "./iQuestion";

export default interface iTheme {
    "@_name": string,
    questions: { question: iQuestion[] }
}