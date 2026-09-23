/* ============================================================
   face-camera.js - shared helper for camera + face-api.js
   Used by face-register.html and face-verify.html
   ============================================================ */

const MODELS_URI = '/models/face-api';
const FACE_API_URL = '/vendor/face-api/face-api.min.js';

let faceLoaded = false;

/* Ensure face-api.js script + model weights are loaded */
async function ensureFaceApi() {
  if (window.faceapi) return;
  if (document.querySelector('script[data-faceapi]')) {
    await new Promise((resolve) => {
      if (faceLoaded) return resolve();
      document.querySelector('script[data-faceapi]').addEventListener('load', resolve);
    });
    return;
  }
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = FACE_API_URL;
    s.dataset.faceapi = '1';
    s.onload = () => { faceLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load face-api library.'));
    document.head.appendChild(s);
  });
}

/* Load all model weights (tiny detector + landmark + recognition) */
async function loadFaceModels() {
  await ensureFaceApi();
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URI),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URI),
  ]);
}

/* Start camera on a <video> element. Returns the MediaStream. */
async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await new Promise((resolve) => videoEl.onloadedmetadata && resolve());
  videoEl.play();
  return stream;
}

function stopCamera(stream) {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((t) => t.stop());
  }
}

/* Capture ONE frontal face and read its 128-dim embedding.
   Returns { descriptor: Float32Array, score: number, box } */
async function captureFaceDescriptor(videoEl) {
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    const err = new Error('No face detected. Make sure your face is well lit and facing the camera.');
    err.code = 'NO_FACE';
    throw err;
  }

  return {
    descriptor: Array.from(detection.descriptor),
    score: detection.detection.score,
    box: detection.detection.box,
  };
}

/* Very simple helper: draw a face frame on a canvas overlay */
function drawFaceBox(canvas, videoEl, box, color = 'rgba(52,211,153,0.9)') {
  const ctx = canvas.getContext('2d');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}