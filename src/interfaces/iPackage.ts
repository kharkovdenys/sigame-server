import iRound from "./iRound";

export default interface iPackage {
    "@_name": string,
    "@_date": string,
    info: { authors: { author: string[] | string } }
    rounds: { round: iRound[] }
}