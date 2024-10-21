import { createHost, createPlayerOrHost } from "./networking.js";
import UI from "./ui.js";
import { Game } from "./game.js";

export let entity;

//init
document.addEventListener("DOMContentLoaded", async () => {
    //init controls
    let chatButton = document.getElementById("chatButton")
    let sendMessage = () => {
        let message = UI.sendMessage()
        if (message) {
            if (entity.host) {
                UI.addMessage(entity.uuid, message)
            }
            entity.sendMessage(message)
            UI.hideChat()
        }
    }
    chatButton.onclick = sendMessage
    let chatInput = document.getElementById("chatInput")
    chatInput.addEventListener("keyup", (event) => {
        if (event.key == "Enter") {
            event.preventDefault()
            sendMessage()
        } else if (event.key == "Escape") {
            UI.hideChat()
            event.preventDefault()
        }
    })
    let answerButton = document.getElementById("answerButton")
    let sendAnswer = ()=> {
        Game.answerQuestion(UI.submitAnswer())
    }
    answerButton.onclick = sendAnswer
    let answerInput = document.getElementById("answerInput")
    answerInput.addEventListener("keyup", (event) => {
        if (event.key == "Enter") {
            event.preventDefault()
            Game.answerQuestion(UI.submitAnswer())
        }
    })


    let startQuestionButton = document.getElementById("startQuestionButton")
    let startQuestion = async () => {
        if (entity.host) {
            entity.startQuestion()
        } else {
            entity.requestStartQuestion()
        }
        if (entity.host) {
            await Game.readNewQuestion()
        }
    }
    startQuestionButton.onclick = startQuestion
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName == "INPUT") {
            return
        }
        if (e.code == "Space" && Game.buzzedPlayers[entity.uuid] === undefined && Game.live) {
            if (entity.host) {
                if(Game.buzz(entity.uuid)) {
                    entity.buzz()
                }
            } else {
                entity.attemptBuzz()
            }
            e.preventDefault()
        } else if (e.code == "Enter") {
            UI.chat()
            e.preventDefault()
        } else if (e.code == "KeyN") {
            e.preventDefault()
            if (Game.live) {
                return
            } else {
                startQuestion()
            }
        } else if (e.code == "Escape") {
            UI.hideChat()
            e.preventDefault()
        }
        return false;

    })
    
    //networking
    await initPlayer()

})
/**
 * Initializes the player and grants them host if applicable
 */
async function initPlayer() {
    let urlSearchParams = new URLSearchParams(window.location.search);
    let myParam = urlSearchParams.get("room")
    if (myParam === null) {
        entity = await createHost()
    } else {
        entity = await createPlayerOrHost(myParam)
    }
    console.log(entity)
    let roomId = entity.host ? entity.id : entity.hostID
    let url = new URL(window.location.href)
    url.searchParams.set("room", roomId)
    history.pushState({}, '', url.href)
    if (entity.host) {
        //host

    } else {
        //player

    }
}