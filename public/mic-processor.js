class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._targetRate = 16000;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const inputData = input[0];
    const ratio = sampleRate / this._targetRate;
    const outLength = Math.floor(inputData.length / ratio);
    const pcm = new Int16Array(outLength);

    for (let i = 0; i < outLength; i++) {
      const s = Math.max(-1, Math.min(1, inputData[Math.floor(i * ratio)]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage({ pcm: pcm.buffer }, [pcm.buffer]);
    return true;
  }
}

registerProcessor("mic-processor", MicProcessor);
