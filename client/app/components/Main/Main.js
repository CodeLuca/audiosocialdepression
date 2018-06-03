import './Main.scss'
import Post from  './Post.js'
import React from 'react';

var wavesurfer;

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      recorder: null,
      recording: false,
      blob: null,
      timeline: []
    };
  }

  componentDidMount() {
    wavesurfer = WaveSurfer.create({
      container: '#waveform',
      height: 75,
      waveColor: 'grey',
      progressColor: 'darkgrey',
      responsive: true
    });

    wavesurfer.on('ready', function () {
      wavesurfer.play();
    });

    fetch('/get').then((res) => {
      return res.json()
    }).then((res) => {
      this.setState({
        timeline: res
      })
    });
  }

  recordAudio() {
    return new Promise(async resolve => {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunks.push(event.data);
      });

      const start = () => mediaRecorder.start();

      const stop = () =>
        new Promise(resolve => {
          mediaRecorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            const play = () => audio.play();

            resolve({audioBlob, audioUrl, play});

            var audioContext = new AudioContext();
            this.bufferSound(audioContext, audioUrl).then(async (buffer) => {
              buffer = await this.pitchTransform(buffer, 1);
              var mp3Data = [];

              var data = buffer.getChannelData(0);
              var len = data.length, i = 0;
              var dataAsInt16Array = new Int16Array(len);

              while(i < len){
                dataAsInt16Array[i] = convert(data[i++]);
              }
              function convert(n) {
                var v = n < 0 ? n * 32768 : n * 32767;       // convert in range [-32768, 32767]
                return Math.max(-32768, Math.min(32768, v)); // clamp
              }

              var sampleBlockSize = 1152;
              var samples = dataAsInt16Array;
              var sampleChunk;
              var mp3encoder = new lamejs.Mp3Encoder(1, 44100, 128); //mono 44.1khz encode to 128kbps
              var mp3Tmp = mp3encoder.encodeBuffer(samples); //encode mp3

              for(var i = 0; i < samples.length; i += sampleBlockSize){
                sampleChunk = samples.subarray(i, i + sampleBlockSize);
                var mp3buf = mp3encoder.encodeBuffer(sampleChunk);
                if(mp3buf.length > 0){
                  mp3Data.push(mp3buf);
                }
              }
              mp3buf = mp3encoder.flush();

              if(mp3buf.length > 0){
                mp3Data.push(mp3buf);
                var blob = new Blob(mp3Data, {type: 'audio/mp3'});
                var url = window.URL.createObjectURL(blob);
                this.setState({
                  blob: blob
                })
                wavesurfer.load(url);
              }
            });

          });

          mediaRecorder.stop();
        });

      resolve({start, stop});
    });
  }

  async startRecording() {
    const sleep = time => new Promise(resolve => setTimeout(resolve, time));
    const recorder = await this.recordAudio();
    recorder.start();
    this.setState({
      recorder
    });
  }

  async stopRecording() {
    const recorder = this.state.recorder;
    const audio = await recorder.stop();
    // audio.play();
  }

  toggleRecording() {
    if (this.state.recording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }

    this.setState({
      recording: !this.state.recording
    })
  }

  bufferSound(ctx, url) {
    var p = new Promise(function (resolve, reject) {
      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.responseType = 'arraybuffer';
      req.onload = function () {
        ctx.decodeAudioData(req.response, resolve, reject);
      }
      req.send();
    });
    return p;
  }

  submitFile() {
    console.log(this.state.blob);
    var fd = new FormData();
    fd.append('audio', this.state.blob);
    $.ajax({
      type: 'POST',
      url: '/upload',
      data: fd,
      processData: false,
      contentType: false
    }).done((data) => {
      console.log(data);

      fetch('/get').then((res) => {
        return res.json()
      }).then((res) => {
        this.setState({
          timeline: res
        })
      });
    });
  }

  async pitchTransform(audioBuffer, pitchMod) {

    let ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

    let source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    let pitchChangeEffect = new Jungle(ctx);

    let compressor = ctx.createDynamicsCompressor();

    source.connect(pitchChangeEffect.input)
    pitchChangeEffect.output.connect(compressor)
    pitchChangeEffect.setPitchOffset(pitchMod);

    compressor.connect(ctx.destination);

    source.start(0);
    return await
      ctx.startRendering();
  }

  render() {
    return (
      <div className="container">
        <div className="main-container">
          <div className="heading" style={{marginBottom: 15}}>
            Record:
          </div>
          <div className="record-wrapper">
            <div className="record-container">
              <div className="record-button" onClick={this.toggleRecording.bind(this)}>
                <i className="fa fa-microphone fa-3x" style={{
                  color: this.state.recording ? 'red' : 'grey'
                }}></i>
              </div>
              <div className="waveform-container">
                <div id="waveform"></div>
              </div>
              <div className="normal-button-container">
                <button onClick={this.submitFile.bind(this)}>
                  <i className="fa fa-check-circle fa-3x"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="timeline-wrapper">
            <div className="timeline">
              <div className="heading">
                Timeline:
              </div>
              {
                this.state.timeline.map((audio, i) => {
                  return (
                    <Post key={i} index={i} audio={audio} />
                  );
                })
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Main;


// Google API


function createFadeBuffer(context, activeTime, fadeTime) {
  var length1 = activeTime * context.sampleRate;
  var length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
  var length = length1 + length2;
  var buffer = context.createBuffer(1, length, context.sampleRate);
  var p = buffer.getChannelData(0);

  var fadeLength = fadeTime * context.sampleRate;

  var fadeIndex1 = fadeLength;
  var fadeIndex2 = length1 - fadeLength;

  // 1st part of cycle
  for (var i = 0; i < length1; ++i) {
    var value;

    if (i < fadeIndex1) {
      value = Math.sqrt(i / fadeLength);
    } else if (i >= fadeIndex2) {
      value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
    } else {
      value = 1;
    }

    p[i] = value;
  }

  // 2nd part
  for (var i = length1; i < length; ++i) {
    p[i] = 0;
  }


  return buffer;
}

function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
  var length1 = activeTime * context.sampleRate;
  var length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
  var length = length1 + length2;
  var buffer = context.createBuffer(1, length, context.sampleRate);
  var p = buffer.getChannelData(0);

  // 1st part of cycle
  for (var i = 0; i < length1; ++i) {
    if (shiftUp)
    // This line does shift-up transpose
      p[i] = (length1 - i) / length;
    else
    // This line does shift-down transpose
      p[i] = i / length1;
  }

  // 2nd part
  for (var i = length1; i < length; ++i) {
    p[i] = 0;
  }

  return buffer;
}

var delayTime = 0.100;
var fadeTime = 0.050;
var bufferTime = 0.100;

function Jungle(context) {
  this.context = context;
  // Create nodes for the input and output of this "module".
  var input = context.createGain();
  var output = context.createGain();
  this.input = input;
  this.output = output;

  // Delay modulation.
  var mod1 = context.createBufferSource();
  var mod2 = context.createBufferSource();
  var mod3 = context.createBufferSource();
  var mod4 = context.createBufferSource();
  this.shiftDownBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, false);
  this.shiftUpBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, true);
  mod1.buffer = this.shiftDownBuffer;
  mod2.buffer = this.shiftDownBuffer;
  mod3.buffer = this.shiftUpBuffer;
  mod4.buffer = this.shiftUpBuffer;
  mod1.loop = true;
  mod2.loop = true;
  mod3.loop = true;
  mod4.loop = true;

  // for switching between oct-up and oct-down
  var mod1Gain = context.createGain();
  var mod2Gain = context.createGain();
  var mod3Gain = context.createGain();
  mod3Gain.gain.value = 0;
  var mod4Gain = context.createGain();
  mod4Gain.gain.value = 0;

  mod1.connect(mod1Gain);
  mod2.connect(mod2Gain);
  mod3.connect(mod3Gain);
  mod4.connect(mod4Gain);

  // Delay amount for changing pitch.
  var modGain1 = context.createGain();
  var modGain2 = context.createGain();

  var delay1 = context.createDelay();
  var delay2 = context.createDelay();
  mod1Gain.connect(modGain1);
  mod2Gain.connect(modGain2);
  mod3Gain.connect(modGain1);
  mod4Gain.connect(modGain2);
  modGain1.connect(delay1.delayTime);
  modGain2.connect(delay2.delayTime);

  // Crossfading.
  var fade1 = context.createBufferSource();
  var fade2 = context.createBufferSource();
  var fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
  fade1.buffer = fadeBuffer
  fade2.buffer = fadeBuffer;
  fade1.loop = true;
  fade2.loop = true;

  var mix1 = context.createGain();
  var mix2 = context.createGain();
  mix1.gain.value = 0;
  mix2.gain.value = 0;

  fade1.connect(mix1.gain);
  fade2.connect(mix2.gain);

  // Connect processing graph.
  input.connect(delay1);
  input.connect(delay2);
  delay1.connect(mix1);
  delay2.connect(mix2);
  mix1.connect(output);
  mix2.connect(output);

  // Start
  var t = context.currentTime + 0.050;
  var t2 = t + bufferTime - fadeTime;
  mod1.start(t);
  mod2.start(t2);
  mod3.start(t);
  mod4.start(t2);
  fade1.start(t);
  fade2.start(t2);

  this.mod1 = mod1;
  this.mod2 = mod2;
  this.mod1Gain = mod1Gain;
  this.mod2Gain = mod2Gain;
  this.mod3Gain = mod3Gain;
  this.mod4Gain = mod4Gain;
  this.modGain1 = modGain1;
  this.modGain2 = modGain2;
  this.fade1 = fade1;
  this.fade2 = fade2;
  this.mix1 = mix1;
  this.mix2 = mix2;
  this.delay1 = delay1;
  this.delay2 = delay2;

  this.setDelay(delayTime);
}

Jungle.prototype.setDelay = function (delayTime) {
  this.modGain1.gain.setTargetAtTime(0.5 * delayTime, 0, 0.010);
  this.modGain2.gain.setTargetAtTime(0.5 * delayTime, 0, 0.010);
}

Jungle.prototype.setPitchOffset = function (mult) {
  if (mult > 0) { // pitch up
    this.mod1Gain.gain.value = 0;
    this.mod2Gain.gain.value = 0;
    this.mod3Gain.gain.value = 1;
    this.mod4Gain.gain.value = 1;
  } else { // pitch down
    this.mod1Gain.gain.value = 1;
    this.mod2Gain.gain.value = 1;
    this.mod3Gain.gain.value = 0;
    this.mod4Gain.gain.value = 0;
  }
  this.setDelay(delayTime * Math.abs(mult));
}


