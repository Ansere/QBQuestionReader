import {Player, randomName} from "./player.js"
import {Host} from "./host.js"

export let connectionWaitingTime = 1000
/**
 * Creates Player, connects to Host if possible, and returns the Player object. If Host is not reached, returns a new Host
 * @param {string} host
 */
export let createPlayerOrHost = async function createPlayerOrHost(host, name = randomName()) {
    let peer = new Peer({
        //debug: 3
    })
    await initPeer(peer)
    //await new Promise(resolve => setTimeout(resolve, 5000))
    console.log(peer.id)
    let conn = await connectToHost(peer, host, name)
    if (conn === undefined) {
        //alert("Unable to connect to Host")
        return new Host(peer, name)
    } else {
        return new Player(peer, conn, name)
    }
}   

export let createHost = async function createHost(name = randomName()) {
    let peer = new Peer({
        //debug: 3
    })
    await initPeer(peer) 
    console.log(randomName())   
    return new Host(peer, name)
}

/**
 * Returns a PeerJS DataConnection object if connection to host is established. If not, returns undefined.
 * @param {string} host 
 */
export let connectToHost = async function connectToHost(peer, host, name) {
    let conn = peer.connect(host, {
        metadata: {
            name: name
        }
    })
    return await establishConnection(conn)
}

function initPeer(peer) {
    if (peer.id !== null) return Promise.resolve(peer.id);
    return new Promise(resolve => {
        peer.on("open", id => {
            resolve(id)
        })
    })
}

export let establishConnection = async function establishConnection(conn) {
    let connected = false
    conn.on('open', () => {
        connected = true
    })
    return new Promise(resolve => {
        setTimeout(() => {
            if (connected == false) {
                conn.close()
                console.error("Could not establish a connection with peer " + conn.peer)
                resolve(undefined)
            } else {
                resolve(conn);
            }
        }, connectionWaitingTime)
    })
}