
const createProducer = (localStream, producerTransport)=>{
    return new Promise(async(resolve, reject)=>{
        //get the audio and video tracks so we can produce
        const videoTrack = localStream.getVideoTracks()[0]
        const audioTrack = localStream.getAudioTracks()[0]
        try{
            // running the produce method, will tell the transport 
            // connect event to fire!!
            console.log("Calling produce on video")
            const videoProducer = await producerTransport.produce({track:videoTrack})
            console.log("Calling produce on audio")
            const audioProducer = await producerTransport.produce({track:audioTrack})
            console.log("finished producing!")
            resolve({audioProducer,videoProducer})
        }catch(err){
            console.log(err,"error producing")
        }
    })
}

export default createProducer
