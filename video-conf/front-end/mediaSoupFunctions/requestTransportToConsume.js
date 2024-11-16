
const requestTransportToConsume = (consumeData,socket,device)=>{
    //how many transports? One for each consumer? 
    // Or one that handles all consumers?
        //if we do one for every consumer, it will mean we can do 
        //POSITIVE: more fine grained networking control
            //it also means if one transport is lost or unstable, 
            //the others are ok.
        //NEGATIVE: But it's confusing!
        //if we have one transport and all the consumers use it, 
            //POSITIVE: this makes our code much easier to manage 
            //and is potentially more efficient for the server
            //NEGATIVE: we have no fine control and a single point of failure
        // This means every peer has an upstream transport and a 
        // downstream one, so the server will have 2n transports open, 
        // where n is the number of peers
    consumeData.audioPidsToCreate.forEach(async(audioPid,i)=>{
        const videoPid = consumeData.videoPidsToCreate[i]
        // expecting back transport params for THIS audioPid. Maybe 5 times, maybe 0
        const consumerTransportParams = await socket.emitWithAck('requestTransport',{type:"consumer",audioPid})
        console.log(consumerTransportParams)
    })
}

export default requestTransportToConsume