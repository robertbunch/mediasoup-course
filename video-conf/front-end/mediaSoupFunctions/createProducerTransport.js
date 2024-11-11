
const createProducerTransport = (socket)=>new Promise(async(resolve, reject)=>{
    // ask the server to make a transport and send params
    const producerTransportParams = await socket.emitWithAck('requestTransport',{type:"producer"})
    console.log(producerTransportParams)
})

export default createProducerTransport
