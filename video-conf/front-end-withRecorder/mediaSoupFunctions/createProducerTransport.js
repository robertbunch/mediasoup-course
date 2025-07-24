
const createProducerTransport = (socket,device)=>new Promise(async(resolve, reject)=>{
    // ask the server to make a transport and send params
    const producerTransportParams = await socket.emitWithAck('requestTransport',{type:"producer"})
    // console.log(producerTransportParams)
    //use the device to create a front-end transport to send
    // it takes our object from requestTransport
    const producerTransport = device.createSendTransport(producerTransportParams)
    // console.log(producerTransport)
    producerTransport.on('connect',async({dtlsParameters},callback,errback)=>{
        // transport connect event will NOT fire until transport.produce() runs
        // dtlsParams are created by the browser so we can finish
        // the other half of the connection
        // emit connectTransport
        console.log("Connect running on produce...")
        const connectResp = await socket.emitWithAck('connectTransport',{dtlsParameters,type:"producer"})
        console.log(connectResp,"connectResp is back")
        if(connectResp === "success"){
            // we are connected! move forward
            callback()
        }else if(connectResp === "error"){
            // connection failed. Stop
            errback()
        }
    })
    producerTransport.on('produce',async(parameters, callback, errback)=>{
        // emit startProducing
        console.log("Produce event is now running")
        const { kind, rtpParameters } = parameters
        const produceResp = await socket.emitWithAck('startProducing',{kind, rtpParameters})
        console.log(produceResp,"produceResp is back!")
        if(produceResp === "error"){
            errback()
        }else{
            // only other option is the producer id
            callback({id:produceResp})
        }
    })

    // setInterval(async()=>{
    //     const stats = await producerTransport.getStats()
    //     for(const report of stats.values()){
    //         // console.log(report)
    //         if(report.type === "outbound-rtp"){
    //             console.log(report.bytesSent,'-',report.packetsSent)
    //         }
    //     }
    // },1000)

    // send the transport back to main
    resolve(producerTransport)
})

export default createProducerTransport
