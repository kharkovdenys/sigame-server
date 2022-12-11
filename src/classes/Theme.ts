import iQuestion from "../interfaces/iQuestion";
import Question from "./Question";

export default class Theme {
    name: string;
    questions: Question[] = [];

    constructor(name: string, questions: iQuestion[]) {
        this.name = name;
        if (!Array.isArray(questions))
            questions = [questions];
        for (const question of questions) {
            this.questions.push(new Question(question["@_price"], question.right.answer, question.scenario.atom));
        }
    }
}