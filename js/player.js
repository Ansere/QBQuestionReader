import {setPlayers, getPlayers, addPlayer, getUUIDs, getPlayerArray, Game} from "./game.js"
import { entity } from "./main.js"
import UI from "./ui.js"

export let Player = class Player {

    /**
     * Creates Player from a PeerJS Peer object, a PeerJS DataConnection object with the host, and a name
     * @param {Peer} peer 
     * @param {DataConnection} conn
     * @param {string} name 
     * @param {string} hostID 
     */
    constructor(peer, conn, name, uuid) {
        this.name = name
        this.host = false
        this.hostID = conn.peer
        this.peer = peer
        this.conn = conn
        this.uuid = uuid
        conn.on("data", (data) => this.onDataReceive(data))
    }

    /**
     * Disconnect from host 
     */
    disconnect() {
        this.conn.close()
    }

    /**
     * Upgrades Peer to Host
     */
    convertToHost() {
        this.peer = false
    }

    onDataReceive(data) {
        data = JSON.parse(data)
        console.log(data)
        if (data.error) {
            this.onErrorReceive(data)
            return
        }
        switch (data.action) {
            case "init":
                this.uuid = data.uuid
                setPlayers(data.players)
                UI.setLeaderboard(getPlayerArray())
                break
            case "newPlayer":
                console.log("newPlayer called")
                UI.addPlayer(data.player)
                if (Object.keys(data.currentPlayers) != getUUIDs()) {
                    console.log("Found a discrepancy!")
                    UI.setPlayers(data.currentPlayers)
                    UI.setLeaderboard(getPlayerArray())
                } else {
                    UI.addPlayerToLeaderboard(data.player)
                }
                break;
            case "chatMessage":
                UI.addMessage(data.source, data.message)
                break;
            case "startQuestion":
                Game.startQuestion()
                break;
            case "questionData":
                UI.appendStringToQuestion(data.string)
                break;
            case "startTimer":
                Game.startQuestionTimer()
                break
            case "endQuestion":
                console.log(data)
                Game.endQuestion(data.answer)
                break
            case "playerBuzz":
                Game.buzz(data.player)
                break
            case "questionOutcome":
                console.log("received outcome")
                console.log(data)
                Game.enactAnswerEffects(data.player, data.answer, data.verdict)
                break
        }
    }

    onErrorReceive(error) {
        console.error(error.message)
    }

    sendToHost(message) {
        if (this.conn.open) {
            console.log("data sent!")
            this.conn.send(message)
        } else {
            error.log("Connection not open for sending messages!")
        }
    }

    sendMessage(message) {
        this.sendToHost(PlayerActionData.sendMessage(message))
    }

    requestStartQuestion() {
        this.sendToHost(PlayerActionData.requestStartQuestion())
    }

    attemptBuzz() {
        console.log("buzzed.")
        this.sendToHost(PlayerActionData.attemptBuzz())
    }

    answer(answer) {
        this.sendToHost(PlayerActionData.submitAnswer(answer))
    }

}

class PlayerActionData {
    
    static submitAnswer(answer) {
        return JSON.stringify({
            action: "answer",
            answer: answer
        })
    }

    static changeName(name) {
        return JSON.stringify({
            action: "nameChange",
            name: name
        })
    }

    static sendMessage(message) {
        return JSON.stringify({
            action: "sendMessage",
            message: message
        })
    }

    static requestStartQuestion() {
        return JSON.stringify({
            action: "requestStartQuestion"
        })
    }

    static attemptBuzz() {
        return JSON.stringify({
            action: "attemptBuzz"
        })
    }
}

let s = "abcdefghjilmnopqrstuvwxyz".split("")
export let randomName = function randomName() {
    return s[Math.floor(Math.random() * s.length)] + s[Math.floor(Math.random() * s.length)] + s[Math.floor(Math.random() * s.length)]
}


