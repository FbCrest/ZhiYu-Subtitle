/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service to extract and compress audio from video files purely in the browser.
 * This helps avoid "Out of Memory" errors by sending small audio files to Gemini instead of large video files.
 */

export async function extractAudio(file: File): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        
        // Decode the audio from the video file
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Downsample to 16kHz mono to minimize size
        const targetSampleRate = 16000;
        const offlineContext = new OfflineAudioContext(
          1, // mono
          Math.ceil(audioBuffer.duration * targetSampleRate),
          targetSampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();

        const renderedBuffer = await offlineContext.startRendering();
        
        // Encode as WAV
        const wavBlob = bufferToWav(renderedBuffer);
        resolve(wavBlob);
      } catch (error) {
        reject(error);
      }
    };
    fileReader.onerror = () => reject(new Error("Failed to read file"));
    fileReader.readAsArrayBuffer(file);
  });
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const buffer1 = new ArrayBuffer(length);
  const view = new DataView(buffer1);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for(i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF); // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // write 16-bit sample
      pos += 2;
    }
    offset++;                                     // next source sample
  }

  return new Blob([buffer1], {type: 'audio/wav'});

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
