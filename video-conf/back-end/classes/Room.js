const config = require('../config/config')

// Rooms are not a MediaSoup thing. MS cares about mediastreams, transports, 
// things like that. It doesn't care, or know, about rooms. 
// Rooms can be inside of clients, clients inside of rooms, 
// transports can belong to rooms or clients, etc.
class Room{
    constructor(roomName,workerToUse){
        this.roomName = roomName
        this.worker = workerToUse
        this.router = null
        //all the Client objects that are in this room
        this.clients = []
        //an array of id's with the most recent dominant speaker first
        this.activeSpeakerList = []
    }
    addClient(client){
        this.clients.push(client)
    }
    createRouter(){
        return new Promise(async(resolve, reject)=>{
            this.router = await this.worker.createRouter({
                mediaCodecs: config.routerMediaCodecs
            })
            resolve()
        })
    }
}

module.exports = Room