import iRound from "./iRound";

export default interface iPackage {
    "@_name": string,
    "@_version": string,
    "@_date": string,
    "@_difficulty": string,
    "@_logo"?: string;
    info: { authors: { author: string[] | string } }
    rounds: { round: iRound[] }
}