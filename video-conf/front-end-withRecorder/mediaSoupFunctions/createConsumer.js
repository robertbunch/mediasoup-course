const createConsumer = (consumerTransport,pid,device,socket,kind,slot)=>{
    return new Promise(async(resolve, reject)=>{
        // consume from the basics, emit the consumeMedia event, we take
        // the params we get back, and run .consume(). That gives us our track
        const consumerParams = await socket.emitWithAck('consumeMedia',{rtpCapabilities:device.rtpCapabilities,pid,kind})
        console.log(consumerParams)
        if(consumerParams === "cannotConsume"){
            console.log("Cannot consume")
            resolve()
        }else if(consumerParams === "consumeFailed"){
            console.log("Consume failed...")
            resolve()
        }else{
            // we got valid params! Use them to consume
            const consumer = await consumerTransport.consume(consumerParams)
            console.log("consume() has finished")
            const { track } = consumer
            // add track events
            //unpause
            await socket.emitWithAck('unpauseConsumer',{pid,kind})
            resolve(consumer)
        }
    })
}

export default createConsumer