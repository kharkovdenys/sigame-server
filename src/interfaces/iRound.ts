import iTheme from "./iTheme";

export default interface iRound {
    "@_name": string,
    "@_type"?: 'final',
    themes: { theme: iTheme[] }
}