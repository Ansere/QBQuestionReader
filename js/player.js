import { setPlayers, getPlayers, addPlayer, getUUIDs, getPlayerArray, Game } from "./game.js"
import { Host } from "./host.js"
import { entity, setEntity } from "./main.js"
import { connectToHost } from "./networking.js"
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
        conn.on("data", async (data) => await this.onDataReceive(data))
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

    }

    async onDataReceive(data) {
        data = JSON.parse(data)
        console.log(data)
        if (data.error) {
            this.onErrorReceive(data)
            return
        }
        switch (data.action) {
            case "init":
                this.uuid = data.uuid
                this.hostUUID = data.hostUUID
                setPlayers(data.players)
                UI.setLeaderboard(getPlayerArray())
                UI.boldYourself()
                break
            case "newPlayer":
                console.log("newPlayer called")
                addPlayer(data.player)
                console.log(Object.keys(data.currentPlayers))
                console.log(getUUIDs())
                console.log(data.player)
                if (Object.keys(data.currentPlayers).length != getUUIDs().length || getUUIDs().some(uuid => data.currentPlayers[uuid] === undefined)) {
                    console.log("Found a discrepancy!")
                    setPlayers(data.currentPlayers)
                    UI.setLeaderboard(getPlayerArray())
                } else {
                    UI.addPlayerToLeaderboard(data.player.uuid)
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
                Game.enactAnswerEffects(data.player, data.answer, data.verdict, data.answer, data.correctAnswer)
                break
            case "playerDisconnect":
                UI.removePlayerFromLeaderboard(data.hostUUID)
                delete getPlayers()[data.player]
                break
            case "transferHost":
                UI.removePlayerFromLeaderboard(data.hostUUID)
                setEntity(await Host.fromPlayer(entity, data.players))
                console.log(getPlayers())
                this.confirmReady()
                break
            case "newHost":
                let url = new URL(window.location.href)
                url.searchParams.set("room", data.player)
                history.pushState({}, '', url.href)
                if (entity.uuid == data.playerUUID) {
                    UI.assignHostSpan()
                    return
                }
                let conn = await connectToHost(entity.peer, data.player, entity.name)
                if (conn == undefined) {
                    alert("Disconnected from server...")
                    window.location.reload()
                } else {
                    UI.removePlayerFromLeaderboard(data.hostUUID)
                    delete getPlayers()[data.hostUUID]
                    this.conn = conn;
                    this.hostID = conn.peer;
                    this.hostUUID = data.playerUUID
                    UI.assignHostSpan()
                }
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

    confirmReady() {
        this.sendToHost(PlayerActionData.readyForHost())
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

    static readyForHost() {
        return JSON.stringify({
            action: "readyForHost"
        })
    }
}

let s = "abcdefghjilmnopqrstuvwxyz".split("")
export let randomName = function randomName() {
    return s[Math.floor(Math.random() * s.length)] + s[Math.floor(Math.random() * s.length)] + s[Math.floor(Math.random() * s.length)]
}


