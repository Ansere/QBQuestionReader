import { getPlayerArray, getPlayers } from "./game.js"
import { entity } from "./main.js"

export default class UI {

    /**
     * Sets the leaderboard to the given players {UUID, score}. Call @function setPlayers before this method to ensure all given players exist within the program
     * @param {{uuid: string, score: number}[]} listPlayers 
     */
    static setLeaderboard = function setLeaderboard(listPlayers) {
        let leaderboard = document.getElementById("leaderboard")
        let children = []
        let players = getPlayers()
        for (let player of listPlayers) {
            let name = players[player.uuid].name
            if (name === undefined) {
                continue
            }
            let li = document.createElement("li")
            li.id = "player-list-cell-" + player.uuid
            li.classList += ["player-list-cell"]
            let div = document.createElement("div")
            div.textContent = name
            li.appendChild(div)
            let span = document.createElement("span")
            span.classList += "player-score"
            span.textContent = player.score
            li.appendChild(span)
            children.push(li)
            li.setAttribute("uuid", player.uuid)
        }
        leaderboard.replaceChildren(...children)
        UI.assignHostSpan()
        UI.updateScoreboard()
    }

    /**
     * Adds the player to the leaderboard
     * @param {string} player 
     * @param {number} score 
     */
    static addPlayerToLeaderboard = function addPlayerToLeaderboard(playerUUID, score) {
        let players = getPlayers()
        if (players[playerUUID] === undefined) {
            console.log("UI: cannot find player")
            return false;
        }
        if (document.getElementById("player-list-cell-" + playerUUID)) {
            return false;
        }
        let leaderboard = document.getElementById("leaderboard")
        let li = document.createElement("li")
        li.classList += ["player-list-cell"]
        let div = document.createElement("div")
        div.textContent = players[playerUUID].name
        li.appendChild(div)
        li.id = "player-list-cell-" + playerUUID
        let span = document.createElement("span")
        span.classList += "player-score"
        span.textContent = score
        li.appendChild(span)
        leaderboard.appendChild(li)
        li.setAttribute("uuid", playerUUID)
        UI.updateScoreboard()
    }

    /**
     * Removes the player from the leaderboard
     * @param {string} playerUUID
     */
    static removePlayerFromLeaderboard = function removePlayerFromLeaderboard(playerUUID) {
        let players = getPlayers()
        if (players[playerUUID] === undefined) {
            return false;
        }
        console.log("removed")
        document.getElementById("player-list-cell-" + playerUUID).remove()
        UI.updateScoreboard()
    }

    /**
     * Appends message to the chat log
     * @param {string} uuid 
     * @param {string} message 
     */
    static addMessage = (uuid, message) => {
        let players = getPlayers()
        if (players[uuid] === undefined) {
            return;
        }
        let chatLog = document.getElementById("chatLog")
        let messageLi = document.createElement("li")
        messageLi.textContent = players[uuid].name + ": " + message
        messageLi.classList += ["chat-log-item"]
        chatLog.prepend(messageLi)
    }

    /**
     * Sends message in input box.
     */
    static sendMessage = () => {
        let message = document.getElementById("chatInput").value.trim()
        document.getElementById("chatInput").value = ""
        if (message !== "") {
            return message
        } else {
            return false
        }
    }

    static addQuestionInfo = (type) => {
        document.getElementById("questionInfo").textContent = type
    }

    static startQuestion = () => {
        let startButton = document.getElementById("startQuestionButton")
        startButton.setAttribute("disabled", true)
    }

    static appendStringToQuestion = (append) => {
        let questionBox = document.getElementById("questionBox");
        questionBox.textContent += append
    }

    static clearQuestionBox = () => {
        let questionBox = document.getElementById("questionBox");
        questionBox.textContent = ""
        let answerBox = document.getElementById("answerBox")
        answerBox.textContent = ""
        answerBox.classList.add("hidden")
    }

    static showAnswer = (answer) => {
        let answerBox = document.getElementById("answerBox")
        answerBox.textContent = answer.some ? answer.join(") ") : answer
        answerBox.classList.remove("hidden")
    }

    static updateTimerDisplay = (string) => {
        let timer = document.getElementById("timer")
        timer.textContent = string
    }

    static endQuestion = () => {
        let startButton = document.getElementById("startQuestionButton")
        startButton.removeAttribute("disabled")
    }

    static buzz = () => {
        let input = document.getElementById("answerInputDiv")
        input.classList.remove("hidden")
        let answerInput = document.getElementById("answerInput")
        answerInput.focus()
    }

    static hideBuzz = () => {
        let input = document.getElementById("answerInputDiv")
        input.classList.add("hidden")
    }

    static showBuzzOnTimer() {
        let timer = document.getElementById("timer")
        timer.classList.add("buzz")
    }

    static hideBuzzOnTimer() {
        let timer = document.getElementById("timer")
        timer.classList.remove("buzz")
    }

    static submitAnswer = () => {
        let message = document.getElementById("answerInput").value.trim()
        document.getElementById("answerInput").value = ""
        return message
    }

    static updateScoreboard() {
        for (let player of getPlayerArray()) {
            let playerCell = document.getElementById("player-list-cell-" + player.uuid)
            if (playerCell === null) {
                return
            }
            playerCell.getElementsByClassName("player-score")[0].textContent = player.score
        }
        let ul = document.getElementById("leaderboard")
        ul.replaceChildren(...Array.from(...[ul.getElementsByTagName("li")]).sort((a, b) => getPlayers()[b.getAttribute("uuid")].score - getPlayers()[a.getAttribute("uuid")].score))
    }

    static appendAnswer = (playerUUID, answer, verdict) => {
        let player = getPlayers()[playerUUID]
        let li = document.createElement("li")
        let buzz = document.createElement("span")
        buzz.classList.add("buzzLog")
        buzz.textContent = "Buzz"
        let span = document.createElement("span")
        if (verdict) {
            span.textContent = "Correct"
            span.classList.add("correct")
        } else {
            span.textContent = "Incorrect"
            span.classList.add("incorrect")
        }
        let answerSpan = document.createElement("span")
        answerSpan.textContent = player.name + ": " + answer
        li.replaceChildren(buzz, answerSpan, span)
        document.getElementById("chatLog").prepend(li)
    }

    static chat = () => {
        let input = document.getElementById("chatInputDiv")
        input.classList.remove("hidden")
        let chatInput = document.getElementById("chatInput")
        chatInput.focus()
    }

    static hideChat = () => {
        let input = document.getElementById("chatInputDiv")
        input.classList.add("hidden")
    }

    static boldYourself = () => {
        console.log("hi")
        document.getElementById("player-list-cell-" + entity.uuid).classList.add("you")
    }

    static assignHostSpan() {
        let hostSpan = document.createElement("span")
        hostSpan.classList.add("host")
        hostSpan.textContent = "Host"
        let li = document.getElementById("player-list-cell-" + (entity.host ? entity.uuid : entity.hostUUID))
        li.getElementsByTagName("div")[0].appendChild(hostSpan)
    }

}