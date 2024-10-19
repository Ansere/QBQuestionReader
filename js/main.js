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
        }
    }
    chatButton.onclick = sendMessage
    let chatInput = document.getElementById("chatInput")
    chatInput.addEventListener("keyup", (event) => {
        if (event.key == "Enter") {
            event.preventDefault()
            sendMessage()
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
    startQuestionButton.onclick = async () => {
        if (entity.host) {
            entity.startQuestion()
        } else {
            entity.requestStartQuestion()
        }
        if (entity.host) {
            await Game.readNewQuestion()
        }
    }
    document.addEventListener("keyup", (e) => {
        if (e.target.tagName == "INPUT") {
            return
        }
        e.preventDefault()
        if (e.code == "Space" && Game.buzzedPlayers[entity.uuid] === undefined && Game.live) {
            if (entity.host) {
                Game.buzz(entity.uuid)
                entity.buzz()
            } else {
                entity.attemptBuzz()
            }
        }

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