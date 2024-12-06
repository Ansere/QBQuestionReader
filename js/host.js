import {Game, getPlayerArray, getPlayers, setPlayers} from "./game.js"
import { establishConnection } from "./networking.js"
import { entity } from "./main.js"
import UI from "./ui.js"

export class Host {

    constructor(peer, name, uuid = uuidv4(), score) {
        this.uuid = uuid
        this.peer = peer
        this.name = name  
        this.id = peer.id
        this.host = true
        let players = getPlayers()
        if (score === undefined) { //Host(peer, name, uuid)
            players[this.uuid] = new PlayerData(this.uuid, false, this.id, name, 0)
        } else {
            players[uuid] = new PlayerData(uuid, false, this.id, name, score)
        }
        peer.on('connection', async (conn) => {
            let res = {}
            for (let player of getPlayerArray()) {
                res[player.peerID] = player
            }
            let player = res[conn.peer]
            let playerUUID;
            if (player === undefined) {
                console.log("new player")
                playerUUID = await this.onPlayerConnect(conn)
                if (!playerUUID) {
                    return
                }
            } else {
                console.log("returning player, change of host")
                player.conn = conn
                playerUUID = res[conn.peer].uuid
            }
            conn.on("data", data => this.onDataReceived(data, conn.peer, playerUUID))
            conn.on("close", () => this.onPlayerDisconnect(playerUUID))
        })
    }

    static async fromPlayer(player, playerData) {
        setPlayers({})
        let players = getPlayers()
        let host = new Host(player.peer, player.name, player.uuid, playerData[player.uuid].score)
        for (let key of Object.keys(playerData)) {
            if (key == host.uuid) {
                continue
            }
            let data = playerData[key]
            players[key] = new PlayerData(data.uuid, null, data.peerID, data.name, data.score)
        }
        console.log(getPlayers())
        return host
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
        conn.send(HostActionData.initPlayer(uuid, this.uuid, players))
        UI.addPlayerToLeaderboard(uuid, players[uuid].score)
        this.propagate(HostActionData.announcePlayer(players[uuid], players), uuid)
        return uuid
    }
    
    async onPlayerDisconnect(uuid) {
        console.log("disconnected")
        UI.removePlayerFromLeaderboard(uuid)
        delete getPlayers()[uuid]
        this.broadcast(HostActionData.playerDisconnect(uuid))
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
            case "readyForHost":
                console.log(peerUUID)
                console.log(this.newHost)
                if (peerUUID !== this.newHost) {
                    console.log("invalid new host request")
                    return
                }
                this.isReady()
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
        console.log(getPlayerArray())
        getPlayerArray().forEach(player => {
            if (player.conn == false) {
                return
            }
            player.conn.send(data)
        })
    }

    async privateMessage(uuid, message) {
        getPlayers()[uuid].conn.send(message)
    }

    sendMessage(message, uuid = this.uuid) {
        this.broadcast(HostActionData.chatMessage(message, uuid))
    }

    startQuestion() {
        this.broadcast(HostActionData.startQuestion())
    }

    sendQuestionTextData(string) {
        this.broadcast(HostActionData.questionTextData(string))
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

    sendQuestionInitData(type) {
        this.broadcast(HostActionData.sendQuestionInitData(type))
    }

    async transferHost(uuid) {
        console.log("hi")
        let players = getPlayers()
        console.log(players)
        let res = {}
        for (let playerKey of Object.keys(players)) {
            if (playerKey == this.uuid) {
                continue   
            }
            let {...obj} = players[playerKey]
            delete obj.conn
            res[playerKey] = obj
        }
        this.newHost = uuid
        this.privateMessage(uuid, HostActionData.transferHost(res, this.uuid))
        await new Promise(resolve => {
            this.isReady = resolve
        })
        this.announceTransferHost(uuid)
    }

    announceTransferHost(uuid) {
        console.log("transferhost")
        this.broadcast(HostActionData.announceTransferHost(getPlayers()[uuid].conn.peer, uuid, this.uuid))
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

    static initPlayer(uuid, hostUUID, players) {
        return JSON.stringify({
            action: "init",
            uuid: uuid,
            hostUUID: hostUUID,
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
            action: "startQuestion",
        })
    }

    static questionTextData(string) {
        return JSON.stringify({
            action: "questionTextData",
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

    static playerDisconnect(uuid) {
        return JSON.stringify({
            action: "playerDisconnect",
            player: uuid
        })
    }

    static transferHost(playerData, hostUUID) {
        return JSON.stringify({
            action: "transferHost",
            players: playerData,
            hostUUID: hostUUID
        })
    }

    static announceTransferHost(peerID, uuid, host) {
        return JSON.stringify({
            action: "newHost",
            player: peerID,
            playerUUID: uuid,
            hostUUID: host
        })
    }

    static sendQuestionInitData(type) {
        return JSON.stringify({
            action: "questionInitData",
            type: type
        })
    }

}