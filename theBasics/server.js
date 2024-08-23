const fs = require('fs') //we need this to read our keys. Part of node
const https = require('https') //we need this for a secure express server. part of node
//express sets up the http server and serves our front end
const express = require('express')
const app = express()
//seve everything in public statically
app.use(express.static('public'))

//get the keys we made with mkcert
const key = fs.readFileSync('./config/cert.key')
const cert = fs.readFileSync('./config/cert.crt')
const options = {key,cert}
//use those keys with the https module to have https
const httpsServer = https.createServer(options, app)

const socketio = require('socket.io')
const mediasoup = require('mediasoup')

const config = require('./config/config')
const createWorkers = require('./createWorkers')
const createWebRtcTransportBothKinds = require('./createWebRtcTransportBothKinds')

//set up the socketio server, listening by way of our express https sever
const io = socketio(httpsServer,{
    cors: [`https://localhost:${config.port}`]
})

//our globals
//init workers, it's where our mediasoup workers will live
let workers = null
// init router, it's where our 1 router will live
let router = null

//initMediaSoup gets mediasoup ready to do its thing
const initMediaSoup = async()=>{
    workers = await createWorkers()
    // console.log(workers)
    router = await workers[0].createRouter({
        mediaCodecs: config.routerMediaCodecs
    })
}

initMediaSoup() //build our mediasoup server/sfu

// socketIo listeners
io.on('connect', socket=>{
    let thisClientProducerTransport = null
    let thisClientProducer = null
    let thisClientConsumerTransport = null
    let thisClientConsumer = null    
    // socket is the client that just connected
    // changed cb to ack, because cb is too generic
    // ack stand for acknowledge, and is a callback
    socket.on('getRtpCap',ack=>{
        // ack is a callback to run, that will send the args
        // back to the client
        ack(router.rtpCapabilities)
    })
    socket.on('create-producer-transport', async ack=>{
        // create a transport! A producer transport
        const {transport,clientTransportParams} = await createWebRtcTransportBothKinds(router)
        thisClientProducerTransport = transport
        ack(clientTransportParams) //what we send back to the client
    })
    socket.on('connect-transport',async(dtlsParameters, ack)=>{
        //get the dtls info from the client, and finish the connection
        // on success, send success, on fail, send error
        try{
            await thisClientProducerTransport.connect(dtlsParameters)
            ack("success")
        }catch(error){
            // something went wrong. Log it, and send back "err"
            console.log(error)
            ack("error")
        }
    })
    socket.on('start-producing',async({kind, rtpParameters}, ack)=>{
        try{
            thisClientProducer = await thisClientProducerTransport.produce({kind, rtpParameters})
            ack(thisClientProducer.id)
        }catch(error){
            console.log(error)
            ack("error")
        }
    })
    socket.on('create-consumer-transport', async ack=>{
        // create a transport! A producer transport
        const {transport,clientTransportParams} = await createWebRtcTransportBothKinds(router)
        thisClientConsumerTransport = transport
        ack(clientTransportParams) //what we send back to the client
    })    
    socket.on('connect-consumer-transport',async(dtlsParameters, ack)=>{
        //get the dtls info from the client, and finish the connection
        // on success, send success, on fail, send error
        try{
            await thisClientConsumerTransport.connect(dtlsParameters)
            ack("success")
        }catch(error){
            // something went wrong. Log it, and send back "err"
            console.log(error)
            ack("error")
        }
    })    
})

httpsServer.listen(config.port)