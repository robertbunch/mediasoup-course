const createWebRtcTransportBothKinds = (router)=>new Promise(async(resolve, reject)=>{
    const transport = await router.createWebRtcTransport({
        enableUdp: true,
        enableTcp: true, //always use UDP unless we can't
        preferUdp: true,
        listenInfos: [
            {
                protocol: 'udp',
                ip: '0.0.0.0'
            },
            {
                protocol: 'tcp',
                ip: '0.0.0.0'
            }
        ]
    })
    // console.log(transport)
    const clientTransportParams = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
    }
    resolve({transport,clientTransportParams})
})

module.exports = createWebRtcTransportBothKinds