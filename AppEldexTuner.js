// Esconde splash e mostra o app
window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("splash").style.display = "none";
        document.getElementById("app").style.display = "block";
    }, 3000);
});

const startBtn = document.getElementById("startBtn");
const freqDisplay = document.getElementById("freq");
const noteDisplay = document.getElementById("note");
const needle = document.getElementById("needle");

let audioContext;
let analyser;
let bufferLength;
let dataArray;

const notes = [
    { note: "E", freq: 82.41 },
    { note: "A", freq: 110.00 },
    { note: "D", freq: 146.83 },
    { note: "G", freq: 196.00 },
    { note: "B", freq: 246.94 },
    { note: "E", freq: 329.63 }
];

startBtn.addEventListener("click", async () => {
    if (!audioContext) {
        audioContext = new AudioContext();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 2048;
        bufferLength = analyser.fftSize;
        dataArray = new Float32Array(bufferLength);
        detectPitch();
    }
});

function detectPitch() {
    analyser.getFloatTimeDomainData(dataArray);
    const pitch = autoCorrelate(dataArray, audioContext.sampleRate);
    if (pitch !== -1) {
        freqDisplay.textContent = pitch.toFixed(2) + " Hz";
        const closest = findClosestNoteObj(pitch);
        noteDisplay.textContent = closest.note;

        // Ajusta ponteiro
        const diff = pitch - closest.freq;
        let angle = diff * 2; // sensibilidade
        if (angle > 45) angle = 45;
        if (angle < -45) angle = -45;
        needle.style.transform = `rotate(${angle}deg)`;
    }
    requestAnimationFrame(detectPitch);
}

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        let val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - i; j++) {
            c[i] = c[i] + buf[j] * buf[j+i];
        }
    }

    let d = 0; 
    while (c[d] > c[d+1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }

    let T0 = maxpos;
    return sampleRate / T0;
}

function findClosestNoteObj(freq) {
    return notes.reduce((prev, curr) =>
        Math.abs(curr.freq - freq) < Math.abs(prev.freq - freq) ? curr : prev
    );
}
