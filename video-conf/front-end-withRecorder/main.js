import './style.css'
import buttons from './uiStuff/uiButtons'
import { io } from 'socket.io-client'
import { Device } from 'mediasoup-client'
import getMic2 from './getMic2'
import createProducerTransport from './mediaSoupFunctions/createProducerTransport'
import createProducer from './mediaSoupFunctions/createProducer'
import requestTransportToConsume from './mediaSoupFunctions/requestTransportToConsume'

let device = null
let localStream = null
let producerTransport = null
let videoProducer = null
let audioProducer = null //THIS client's producer
let consumers = {} //key off the audioPid

// const socket = io.connect('https://localhost:3031')
//FOR LOCAL ONLY... no https
const socket = io.connect('http://localhost:3031')
socket.on('connect',()=>{
  console.log("Connected")
})

socket.on('updateActiveSpeakers',async newListOfActives=>{
  // console.log("updateActiveSpeakers")
  // console.log(newListOfActives)
  // an array of the most recent 5 dominant speakers. Just grab the 1st
    // and put it in the slot. Move everything else down
    // consumers is an {} with key of audioId, value of combined feed
    console.log(newListOfActives)
    let slot = 0
    // remove all videos from video Els
    const remoteEls = document.getElementsByClassName('remote-video')
    for(let el of remoteEls){
      el.srcObject = null //clear out the <video>
    }
    newListOfActives.forEach(aid=>{
      if(aid !== audioProducer?.id){
        // do not show THIS client in a video tag, other than local
        // put this video in the next available slot
        const remoteVideo = document.getElementById(`remote-video-${slot}`)
        const remoteVideoUserName = document.getElementById(`username-${slot}`)
        const consumerForThisSlot = consumers[aid]
        remoteVideo.srcObject = consumerForThisSlot?.combinedStream
        remoteVideoUserName.innerHTML = consumerForThisSlot?.userName
        slot++ //for the next 
      }
    })
})

socket.on('newProducersToConsume',consumeData=>{
  // console.log("newProducersToConsume")
  // console.log(consumeData)
  requestTransportToConsume(consumeData,socket,device,consumers)
})

const joinRoom = async()=>{
  // console.log("Join room!")
  const userName = document.getElementById('username').value
  const roomName = document.getElementById('room-input').value
  const joinRoomResp = await socket.emitWithAck('joinRoom',{userName,roomName})
  // console.log(joinRoomResp)
  device = new Device()
  await device.load({routerRtpCapabilities: joinRoomResp.routerRtpCapabilities})
  // console.log(device)
  console.log(joinRoomResp)
  // joinRoomResp contains arrays for:
    // audioPidsToCreate
    // mapped to videoPidsToCreate
    // mapped to usernames
  //These arrays, may be empty... they may have a max of 5 indicies
  requestTransportToConsume(joinRoomResp,socket,device,consumers)


  buttons.control.classList.remove('d-none')
}

const enableFeed = async()=>{
  buttons.recordingControls.classList.remove('d-none')
  const mic2Id = await getMic2() //this is for me!
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    // audio: true,
    audio: {deviceId:{exact:mic2Id}}, //this is for me!
  })
  buttons.localMediaLeft.srcObject = localStream
  buttons.enableFeed.disabled = true
  buttons.sendFeed.disabled = false
  buttons.muteBtn.disabled = false
}

const sendFeed = async()=>{
  //create a transport for THIS client's upstream
  // it will handle both audio and video producers
  producerTransport = await createProducerTransport(socket,device)
  // console.log("Have producer transport. Time to produce!")
  // Create our producers
  const producers = await createProducer(localStream, producerTransport)
  audioProducer = producers.audioProducer
  videoProducer = producers.videoProducer
  console.log(producers)
  buttons.hangUp.disabled = false
}

const muteAudio = ()=>{
  // mute at the producer level, to keep the transport, and all
  // other mechanism in place
  if(audioProducer.paused){
    // currently paused. User wants to unpause
    audioProducer.resume()
    buttons.muteBtn.innerHTML = "Audio On"
    buttons.muteBtn.classList.add('btn-success') //turn it green
    buttons.muteBtn.classList.remove('btn-danger') //remove the red
    // unpause on the server
    socket.emit('audioChange','unmute')
  }else{
    //currently on, user wnats to pause
    audioProducer.pause()
    buttons.muteBtn.innerHTML = "Audio Muted"
    buttons.muteBtn.classList.remove('btn-success') //turn it green
    buttons.muteBtn.classList.add('btn-danger') //remove the red
    socket.emit('audioChange','mute')
  }
}

buttons.joinRoom.addEventListener('click',joinRoom)
buttons.enableFeed.addEventListener('click',enableFeed)
buttons.sendFeed.addEventListener('click',sendFeed)
buttons.muteBtn.addEventListener('click',muteAudio)
buttons.startRecording.addEventListener('click', startRecording)
buttons.stopRecording.addEventListener('click', stopRecording)

let mediaRecorder = null
const recordedChunks = []

//===================RECORDING STUFF=======================//
async function startRecording() {
  buttons.startRecording.disabled = true
  buttons.stopRecording.disabled = false
  recordedChunks = []

  // 1. Capture screen (includes all visuals). JUST screen. We 
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false // we'll add audio manually
  })

  // 2. Capture mic audio (optional, for local voice)
  let micStream = null
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: false 
    })
  } catch (err) {
    console.warn("Mic access failed:", err)
  }

  // 3. Extract remote audio from consumer video elements. They all have a class of remote-video
  const remoteEls = document.getElementsByClassName('remote-video')
  const audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()

  for (let el of remoteEls) {
    if (el.srcObject) {
      try {
        const source = audioContext.createMediaStreamSource(el.srcObject)
        source.connect(destination)
      } catch (err) {
        console.warn("Skipping remote audio (not ready yet):", err)
      }
    }
  }

  // 4. Also add mic to audio context
  if (micStream) {
    const micSource = audioContext.createMediaStreamSource(micStream)
    micSource.connect(destination)
  }

  // 5. Combine screen + merged audio
  const fullStream = new MediaStream([
    ...screenStream.getVideoTracks(),
    ...destination.stream.getAudioTracks()
  ])

  // 6. Record!
  mediaRecorder = new MediaRecorder(fullStream, { mimeType: 'video/webm' })

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data)
    }
  }

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = 'recording.webm'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }

  mediaRecorder.start()
  console.log("Recording started.")
}


function stopRecording() {
  buttons.startRecording.disabled = false
  buttons.stopRecording.disabled = true
  mediaRecorder?.stop()
  console.log("Recording stopped.")
}
