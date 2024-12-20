import { entity } from "./main.js"
import { randomQuestion } from "./questions.js";
import UI from "./ui.js"

let timeConstant = 110
let sentenceExtraTime = 50;
let players = {}
let buzzSymbol = "(#)"

/**
 * Sets the global player object to the specified array of players ({uuid, name, score})
 * @param {{uuid: {uuid: string, peerID: string, name: string, score: number}}} playerObj 
 */
export let setPlayers = (playerObj) => {
    players = {}
    for (let player of Object.keys(playerObj)) {
        players[player] = playerObj[player]
    }
    for (let player of Object.keys(players)) {
        players[player].score = parseInt(players[player].score)
    }
}

/**
 * Sets the global player object to the specified array of players ({uuid, name, score})
 * @param {{uuid: string, peerID: string, name: string, score: number}} playerObj 
 */
export let addPlayer = (playerObj) => {
    players[playerObj.uuid] = playerObj
    players[playerObj.uuid].score = parseInt(players[playerObj.uuid].score)
}

/**
 * Returns the global players object
 * @returns players
 */
export let getPlayers = () => {
    return players
}

export let getPlayerArray = () => {
    return Object.values(players)
}

export let getUUIDs = () => {
    return Object.keys(players)
}

class QuestionReader {

    static isRunning = false
    static isPaused = false
    static instant = false

    /**
     * Reads questionText to players
     * @param {string} questionText 
     */
    static async readQuestion(questionText) {
        QuestionReader.instant = false
        QuestionReader.isRunning = true
        for await (let string of questionText.split(" ")) {
            if (!QuestionReader.instant) {
                await new Promise(resolve => setTimeout(resolve, Math.sqrt(string.length) * timeConstant))
                await new Promise(resolve => {
                    if (QuestionReader.isPaused) {
                        console.log("paused")
                        QuestionReader.continueQuestion = () => {
                            QuestionReader.isPaused = false
                            resolve()
                        }
                    } else {
                        resolve()
                    }
                })
            }
            let append = string + " "
            UI.appendStringToQuestion(append)
            entity.sendQuestionTextData(append)
            if (!QuestionReader.instant && string.includes(".")) {
                await new Promise(resolve => setTimeout(resolve, sentenceExtraTime))
            }
        }
        QuestionReader.isRunning = false
        QuestionReader.finished()
    }

    static pauseQuestion() {
        QuestionReader.isPaused = true
    }

    static continueQuestion() {
        QuestionReader.isPaused = false
    }

    static addBuzzSymbol() {
        UI.appendStringToQuestion(buzzSymbol + " ")
    }

    static finishQuestionText() {
        QuestionReader.instant = true
        QuestionReader.continueQuestion()
        return new Promise(resolve => {
            QuestionReader.finished = () => {
                resolve()
            }
        })
    }

    static finished() { //helper

    }
}

export let Game = class {

    static answer = ""
    static QuestionReader = QuestionReader
    static live = false;
    static buzzedPlayer; //uuid
    static buzzedPlayers = {}

    static timerEndTime;
    static timerCoroutine;
    static defaultBuzzPeriod = 10 * 1000;//MS
    static defaultBuzzTime = 6 * 1000; //MS
    
    static defaultNegPenalty = 5
    static defaultTossupPoints = 10

    static createTimerCoroutine = () => new Promise(resolve => {
        let interval = setInterval(() => {
            if (Date.now() < Game.timerEndTime) {
                UI.updateTimerDisplay((Math.round((Game.timerEndTime - Date.now()) / 100) / 10).toFixed(1))
            } else {
                if (Game.buzzedPlayer) { //time runs out on player guess
                    Game.buzzedPlayer = false
                    Game.timerCoroutine = undefined
                    Game.answerQuestion(UI.submitAnswer())
                    clearInterval(interval)
                    resolve()
                } else {
                    if (entity.host) {
                        Game.endQuestion(Game.answer)
                    }
                    UI.updateTimerDisplay("0.0")
                    clearInterval(interval)
                    resolve()
                }
            }
        }, 100)
        Game.clearTimer = () => {
            clearInterval(interval)
            Game.timerCoroutine = undefined
        }
    })

    static clearTimer;

    static setTimeOnTimer = (time) => {
        Game.timerEndTime = Date.now() + time
    }

    static startQuestionTimer = () => {
        QuestionReader.isRunning = false
        Game.setTimeOnTimer(Game.defaultBuzzPeriod)
        Game.timerCoroutine = Game.createTimerCoroutine()
    }

    static startBuzzTimer = async () => {
        Game.setTimeOnTimer(Game.defaultBuzzTime)
        if (Game.timerCoroutine == undefined) {
            Game.timerCoroutine = Game.createTimerCoroutine()
        }
        if (entity.host) {
            if (QuestionReader.isRunning) {
                QuestionReader.pauseQuestion()
            }
            await Game.timerCoroutine
        }
    }

    static async buzz(playerUUID) {
        if (!Game.live) {
            console.error("Cannot buzz on dead question.")
            return
        }
        if (players[playerUUID] === undefined) {
            console.error("Player does not exist.")
            return
        }
        if (this.buzzedPlayer === playerUUID || this.buzzedPlayers[playerUUID]) {
            console.log("This player has already buzzed.")
            return
        }
        if (this.buzzedPlayer) {
            console.log("Someone has already buzzed!")
            return
        }
        this.buzzedPlayer = playerUUID
        this.buzzedPlayers[playerUUID] = true
        if (entity.uuid == this.buzzedPlayer) {
            UI.buzz()
        }
        if (QuestionReader.isRunning) {
            QuestionReader.pauseQuestion()
            Game.QuestionReader.addBuzzSymbol()
        }
        UI.showBuzzOnTimer()
        Game.startBuzzTimer()
        return true
    }

    static startQuestion() {
        UI.clearQuestionBox()
        UI.updateTimerDisplay((this.defaultBuzzPeriod/1000).toFixed(1))
        QuestionReader.isRunning = true
        UI.startQuestion()
        Game.timerCoroutine = undefined
        Game.live = true;
    }

    static async endQuestion(answer) {
        if (entity.host) {
            if (QuestionReader.isRunning) {
                await QuestionReader.finishQuestionText()
            }
            entity.endQuestion(answer)
        }
        console.log("endQuestion")
        UI.endQuestion()
        UI.showAnswer(answer)
        if (this.clearTimer) {
            this.clearTimer()
        }
        Game.live = false
        Game.buzzedPlayers = {}
        UI.updateTimerDisplay("0.0")
        Game.timerCoroutine = undefined
        QuestionReader.isRunning = false
        QuestionReader.isPaused = false
    }

    static async readNewQuestion() {
        let questionData = randomQuestion()
        Game.answer = 0 
        let questionText = questionData.question
        let type = false
        if (questionData.mcq) {
            let ansInd = Math.floor(Math.random() * 4)
            questionText += "\n\n"
            let ansArr = d3.shuffle(questionData.answers.slice(1))
            ansArr.splice(ansInd, 0, questionData.answer)
            questionText += ansArr.map( (val, ind) => ["W", "X", "Y", "Z"][ind] + ") " + val).join("\n")
            Game.answer = [["W", "X", "Y", "Z"][ansInd], questionData.answer]
            type = "Multiple Choice"
        } else {
            Game.answer = questionData.answer
            type = "Quote Identification"
        }
        entity.sendQuestionInitData(type)
        UI.addQuestionInfo(type)
        Game.startQuestion()
        console.log(questionText.split(" ").join(" "))
        await QuestionReader.readQuestion(questionText) 
        if (!Game.live) {
            return
        }
        Game.startQuestionTimer()
        entity.startTimer()
        await Game.timerCoroutine
    }

    static answerQuestion(answer) {
        if (entity.host) {
            Game.judgeAnswer(answer, entity.uuid)
        } else {
            entity.answer(answer)
        }
    }

    static async enactAnswerEffects(person, answer, verdict, correctAnswer) {
        Game.buzzedPlayer = false
        this.clearTimer()
        UI.hideBuzz()
        UI.hideBuzzOnTimer()
        UI.appendAnswer(person, answer, verdict)
        if (verdict) {
            Game.award(person)
            this.endQuestion(correctAnswer)
            UI.updateScoreboard()
            return
        }
        Game.penalize(person)
        UI.updateScoreboard()
        if (Object.keys(this.buzzedPlayers).length == getPlayerArray().length) { //everyone has answered
            this.endQuestion(correctAnswer)
            return
        }
        if (QuestionReader.isPaused) { //interrupt
            UI.updateTimerDisplay((this.defaultBuzzPeriod/1000).toFixed(1))
            QuestionReader.continueQuestion()
        } else { //noninterrupt
            Game.startQuestionTimer()
        }

    }

    static judgeAnswer(answer, source) {
        let verdict = false
        if (Game.answer.some) {
            verdict = Game.answer.some(correct => correct.toLowerCase() === answer.toLowerCase())
        } else {
            verdict = Game.answer.toLowerCase() === answer.toLowerCase()
        }
        entity.announceQuestionOutcome(verdict, source, answer, Game.answer)
        Game.enactAnswerEffects(source, answer, verdict, Game.answer)
    }

    static penalize(player) {
        players[player].score -= Game.defaultNegPenalty
    }

    static award(player) {
        players[player].score += Game.defaultTossupPoints
    }

}