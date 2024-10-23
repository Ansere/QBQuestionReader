import { createHost, createPlayerOrHost } from "./networking.js";
import UI from "./ui.js";
import { Game, getPlayers } from "./game.js";

export let entity;

export let setEntity = (e) => {
    entity = e
}

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


//init window unload and player disconnect
window.onpagehide = async (event) => { 
    event.stopImmediatePropagation()
    event.preventDefault()
    await beforeClose(event);
    event.returnValue = undefined;
    return undefined;
}

async function beforeClose(event) {
    if (entity === undefined) {
        return false;
    }
    console.log("attempted leave")
    if (entity.host && Object.keys(getPlayers()).length > 1) {
        //TODO - transfer host status
        let newHostUUID = Object.keys(getPlayers())[1]
        if (Game.live) {
            await Game.endQuestion()
        }
        await entity.transferHost(newHostUUID)
    } else if (!entity.host) {
        entity.conn.close()
    }
}

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
        UI.addPlayerToLeaderboard(entity.uuid, getPlayers()[entity.uuid].score)
        UI.assignHostSpan()
        UI.boldYourself()
        
    } else {
        //player

    }
}