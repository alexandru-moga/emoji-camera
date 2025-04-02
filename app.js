const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const expressionText = document.getElementById('expression-text');
const startButton = document.getElementById('startButton');

let modelsLoaded = false;
let detectionActive = false;
let detectionInterval = null;

async function loadModels() {
    try {
        console.log('Loading AI models...');
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
            faceapi.nets.faceExpressionNet.loadFromUri('./models')
        ]);
        modelsLoaded = true;
        console.log('Models loaded successfully');
        expressionText.textContent = "Ready! Click 'Enable Camera'";
        startButton.disabled = false;
        startButton.style.backgroundColor = '#4CAF50';
    } catch (err) {
        console.error("Model loading failed:", err);
        expressionText.textContent = "Failed to load AI models!";
        startButton.style.backgroundColor = '#f44336';
    }
}

async function startVideo() {
    try {
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        video.srcObject = stream;
        startButton.disabled = true;
        startButton.textContent = 'Camera Active';
        startButton.style.backgroundColor = '#2196F3';

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                console.log('Video metadata loaded');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                video.play().then(() => {
                    console.log('Video playback started');
                    resolve();
                }).catch(playErr => {
                    console.error('Video play failed:', playErr);
                    alert('Failed to start video playback');
                });
            };
        });
    } catch (err) {
        console.error("Camera error:", err);
        alert(`Camera error: ${err.name}\n${err.message}`);
        startButton.style.backgroundColor = '#f44336';
        throw err;
    }
}

function startDetection() {
    if (!detectionActive) {
        detectionActive = true;
        detectionInterval = setInterval(async () => {
            try {
                const detections = await faceapi.detectAllFaces(
                    video,
                    new faceapi.TinyFaceDetectorOptions()
                ).withFaceExpressions();

                if (detections.length > 0) {
                    const face = detections[0];
                    const expressions = face.expressions;
                    const [expression, confidence] = Object.entries(expressions)
                        .sort((a, b) => b[1] - a[1])[0];
                    
                    updateExpressionDisplay(expression, confidence);
                    drawEmoji(face.detection.box, expression);
                }
            } catch (detectionErr) {
                console.error('Detection error:', detectionErr);
                stopDetection();
            }
        }, 150);
    }
}

function updateExpressionDisplay(expression, confidence) {
    expressionText.textContent = `${expression} (${Math.round(confidence * 100)}%)`;
    expressionText.style.color = getExpressionColor(expression);
}

function getExpressionColor(expression) {
    const colors = {
        happy: '#4CAF50',
        sad: '#2196F3',
        angry: '#f44336',
        fearful: '#FF9800',
        disgusted: '#9C27B0',
        surprised: '#FFEB3B',
        neutral: '#9E9E9E'
    };
    return colors[expression] || '#000';
}

function drawEmoji(faceBox, expression) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const emojiMap = {
        neutral: '😐',
        happy: ['😀', '😄', '😁', '😆', '🥰'],
        sad: ['😢', '😭', '😞', '💔'],
        angry: ['😠', '👿', '🤬', '💢'],
        fearful: ['😨', '😰', '😖'],
        disgusted: ['🤢', '🤮', '👺'],
        surprised: ['😲', '😯', '🤯'],
        excited: '🤩',
        confused: '🤔',
        sleepy: '😴',
        winking: '😉'
    };

    const emojiSet = Array.isArray(emojiMap[expression]) 
        ? emojiMap[expression]
        : [emojiMap[expression]];
    
    const emoji = emojiSet[Math.floor(Math.random() * emojiSet.length)] || '❓';
    
    ctx.font = `${Math.min(faceBox.width * 0.8, 120)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getExpressionColor(expression);
    ctx.fillText(
        emoji,
        faceBox.x + faceBox.width / 2,
        faceBox.y + faceBox.height / 2 - (faceBox.height * 0.1)
    );
}

function stopDetection() {
    detectionActive = false;
    clearInterval(detectionInterval);
    console.log('Detection stopped');
}

startButton.addEventListener('click', async () => {
    try {
        await startVideo();
        startDetection();
    } catch (err) {
        console.error('Initialization failed:', err);
    }
});

loadModels().catch(err => {
    console.error('Critical initialization error:', err);
    expressionText.textContent = "Failed to initialize app!";
});