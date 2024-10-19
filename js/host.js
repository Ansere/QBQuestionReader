import {Game, getPlayerArray, getPlayers} from "./game.js"
import { establishConnection } from "./networking.js"
import UI from "./ui.js"

export class Host {

    constructor(peer, name) {
        this.uuid = uuidv4()
        this.peer = peer
        this.name = name  
        this.id = peer.id
        this.host = true
        let players = getPlayers()
        players[this.uuid] = new PlayerData(this.uuid, false, this.id, name, 0)
        peer.on('connection', async (conn) => {
            let uuid = await this.onPlayerConnect(conn)
            if (!uuid) {
                return
            }
            conn.on("data", data => this.onDataReceived(data, conn.peer, uuid))
        })
        UI.addPlayerToLeaderboard(this.uuid, players[this.uuid].score)
    }

    async onPlayerConnect(conn) {
        let result = await establishConnection(conn)
        if (result === undefined) {
            return false;
        }
        let uuid = uuidv4()
        let players = getPlayers()
        while (players[uuid] !== undefined) {
            uuid = uuidv4()
        }
        players[uuid] = new PlayerData(uuid, conn, conn.peer, conn.metadata.name)
        conn.send(HostActionData.initPlayer(uuid, players))
        UI.addPlayerToLeaderboard(uuid, players[uuid].score)
        this.propagate(HostActionData.announcePlayer(players[uuid], players), uuid)
        return uuid
    }
    
    onDataReceived(data, peer, peerUUID) {
        data = JSON.parse(data)
        console.log(data)
        switch(data.action) {
            case "sendMessage":
                UI.addMessage(peerUUID, data.message)
                this.sendMessage(data.message, peerUUID)
                break
            case "requestStartQuestion":
                if (Game.live) {
                    this.privateMessage(peerUUID, HostActionData.error("Question could not start. Game is live"))
                } else {
                    UI.startQuestion()
                    this.broadcast(HostActionData.startQuestion())
                    Game.readNewQuestion()
                }
                break
            case "attemptBuzz":
                if (Game.live && !Game.buzzedPlayer && Game.buzzedPlayers[peerUUID] === undefined) {
                    this.broadcast(HostActionData.playerBuzz(peerUUID))
                    Game.buzz(peerUUID)
                } else if (!Game.live) {
                    this.privateMessage(peerUUID, HostActionData.error("Cannot buzz. Game is not live."))
                } else if (Game.buzzedPlayer) {
                    this.privateMessage(peerUUID, HostActionData.error("Someone has already buzzed."))
                } else {
                    this.privateMessage(peerUUID, HostActionData.error("You have already buzzed"))
                }
                break
            case "answer":
                if (Game.buzzedPlayer !== peerUUID) {
                    this.privateMessage(peerUUID, HostActionData.error("Invalid answer attempt. You must buzz first!"))
                } else {
                    Game.judgeAnswer(data.answer, peerUUID)
                }
                break
        }
    }

    propagate(data, source) {
        getPlayerArray().forEach(player => {
            if (player.uuid == source || player.conn == false) {
                return
            }
            player.conn.send(data)
        })
    }

    broadcast(data) {
        getPlayerArray().forEach(player => {
            if (player.conn == false) {
                return
            }
            player.conn.send(data)
        })
    }

    privateMessage(uuid, message) {
        getPlayers()[uuid].conn.send(message)
    }

    sendMessage(message, uuid = this.uuid) {
        this.broadcast(HostActionData.chatMessage(message, uuid))
    }

    startQuestion() {
        this.broadcast(HostActionData.startQuestion())
    }

    sendQuestionData(string) {
        this.broadcast(HostActionData.questionData(string))
    }

    startTimer() {
        this.broadcast(HostActionData.startTimer())
    }

    endQuestion(answer) {
        this.broadcast(HostActionData.endQuestion(answer))
    }

    buzz() {
        this.broadcast(HostActionData.playerBuzz(this.uuid))
    }

    announceQuestionOutcome(verdict, player, answer, correctAnswer) {
        this.broadcast(HostActionData.announceQuestionOutcome(verdict, player, answer, correctAnswer))
    }

}

class PlayerData {

    static excludedFields = ["conn", "peerID"]

    constructor(uuid, conn, peerID, name, score = 0){
        this.uuid = uuid
        this.conn = conn //false if player is host
        this.peerID = peerID
        this.name = name
        this.score = score
    }

    toJSON() {
        let res = {}
        for (let key of Object.keys(this)) {
            if (PlayerData.excludedFields.includes(key)) {
                continue
            }
            res[key] = this[key]
        }
        return res;
    }
}

class HostActionData {

    static announcePlayerNameChange(uuid, name) {
        return JSON.stringify({
            action: "nameChange",
            uuid: uuid,
            name: name
        })
    }

    static initPlayer(uuid, players) {
        return JSON.stringify({
            action: "init",
            uuid: uuid,
            players: players
        })
    }

    static announcePlayer(player, players) {
        return JSON.stringify({
            action: "newPlayer",
            player: player,
            currentPlayers: players
        })
    }

    static chatMessage(message, source) {
        return JSON.stringify({
            action: "chatMessage",
            message: message,
            source: source
        })
    }

    static startQuestion() {
        return JSON.stringify({
            action: "startQuestion"
        })
    }

    static questionData(string) {
        return JSON.stringify({
            action: "questionData",
            string: string
        })
    }

    static startTimer() {
        return JSON.stringify({
            action: "startTimer"
        })
    }

    static playerBuzz(playerUUID) {
        return JSON.stringify({
            action: "playerBuzz",
            player: playerUUID
        })
    }

    static endQuestion(answer) {
        return JSON.stringify({
            action: "endQuestion",
            answer: answer
        })
    }

    static error(message) {
        return JSON.stringify({
            error: true,
            message: message
        })
    }

    static announceQuestionOutcome(verdict, player, answer, correctAnswer) {
        return JSON.stringify({
            action: "questionOutcome",
            verdict: verdict,
            player: player,
            answer: answer,
            correctAnswer: correctAnswer,
            playerScores: Object.fromEntries(getPlayerArray().map(({uuid, score}) => [uuid, score]))
        })
    }

}