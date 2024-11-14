const config = require('../config/config')

class Client{
    constructor(userName,socket){
        this.userName = userName
        this.socket = socket
        //instead of calling this producerTransport, call it upstream, THIS client's transport
        // for sending data
        this.upstreamTransport = null
        //we will have an audio and video consumer
        this.producer = {}
        //instead of calling this consumerTransport, call it downstream, 
        // THIS client's transport for pulling data
        this.downstreamTransports = []
        //an array of consumers, each with 2 parts
        this.consumers = []
        // this.rooms = []
        this.room = null // this will be a Room object
    }
    addTransport(type){
        return new Promise(async(resolve, reject)=>{
            const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate} = config.webRtcTransport
            const transport = await this.room.router.createWebRtcTransport({
                enableUdp: true,
                enableTcp: true, //always use UDP unless we can't
                preferUdp: true,
                listenInfos: listenIps,
                initialAvailableOutgoingBitrate,
            })

            if(maxIncomingBitrate){
                // maxIncomingBitrate limit the incoming bandwidth from this transport
                try{
                    await transport.setMaxIncomingBitRate(maxIncomingBitrate)
                }catch(err){
                    console.log("Error setting bitrate")
                }
            }

            // console.log(transport)
            const clientTransportParams = {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            }
            if(type === "producer"){
                // set the new transport to the client's upstreamTransport
                this.upstreamTransport = transport
            }else if(type === "consumer"){

            }
            resolve(clientTransportParams)
        })
    }
    addProducer(kind,newProducer){
        this.producer[kind] = newProducer
        if(kind === "audio"){
            // add this to our activeSpeakerObserver
            this.room.activeSpeakerObserver.addProducer({
                producerId: newProducer.id
            })
        }
    }
}

module.exports = Client