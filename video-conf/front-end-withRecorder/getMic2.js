async function getMic2() {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(device => device.kind === 'audioinput');
    let webCamMicId
    audioDevices.forEach(device => {
        if(device.label.includes("Web")){
            webCamMicId = device.deviceId
        }
    });
    
    return webCamMicId;
}
export default getMic2