import iThemes from "../interfaces/iTheme";
import Theme from "./Theme";

export default class Round {
    name: string;
    type: 'final' | 'default';
    themes: Theme[] = [];

    constructor(name: string, type: 'final' | undefined, themes: iThemes[]) {
        this.name = name;
        this.type = type ? 'final' : 'default';
        if (!Array.isArray(themes))
            themes = [themes];
        for (const theme of themes) {
            if (theme.questions)
                this.themes.push(new Theme(theme["@_name"], theme.questions.question));
        }
    }
}