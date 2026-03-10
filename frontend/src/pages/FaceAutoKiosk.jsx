import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { attendanceAPI } from '../services/api';
import * as faceapi from 'face-api.js';
import { FiCamera, FiMonitor, FiCheckCircle, FiXCircle, FiArrowLeft, FiClock, FiMaximize } from 'react-icons/fi';

const MODEL_URL = '/models';
const COOLDOWN_MS = 5000; // 5 seconds wait before next recognition
const DETECTION_INTERVAL = 300; // Detect every 300ms

export default function FaceAutoKiosk() {
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [markResult, setMarkResult] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastMarkedId, setLastMarkedId] = useState(null);
    const [cooldown, setCooldown] = useState(false);

    const { success, error } = useToast();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const isProcessingRef = useRef(false);

    // Clock update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load models
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                startCamera();
            } catch (err) {
                console.error('Error loading face-api models:', err);
            }
        };
        loadModels();
        return () => stopCamera();
    }, []);

    // Main Detection Loop
    useEffect(() => {
        if (modelsLoaded && !cooldown) {
            detectionIntervalRef.current = setInterval(processFrame, DETECTION_INTERVAL);
        } else {
            if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        }
        return () => {
            if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        };
    }, [modelsLoaded, cooldown]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            error('Camera access denied');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };

    const processFrame = async () => {
        if (!videoRef.current || isProcessingRef.current || !modelsLoaded || cooldown) return;
        if (videoRef.current.readyState !== 4) return;

        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        const displaySize = { width: video.clientWidth, height: video.clientHeight };

        if (canvas.width !== displaySize.width) {
            faceapi.matchDimensions(canvas, displaySize);
        }

        try {
            // Using slightly higher confidence for stabilization
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
                const resizedDetection = faceapi.resizeResults(detection, displaySize);
                const box = resizedDetection.detection.box;

                // Simple stabilization: face must be within the center area and large enough
                const centerX = box.x + box.width / 2;
                const isCentered = centerX > displaySize.width * 0.25 && centerX < displaySize.width * 0.75;
                const isLargeEnough = box.width > displaySize.width * 0.15;

                setFaceDetected(isCentered && isLargeEnough);

                // Draw detection box with visual feedback for alignment
                ctx.strokeStyle = (isCentered && isLargeEnough) ? '#22c55e' : '#f59e0b';
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Auto Trigger Recognition only when stabilized
                if (isCentered && isLargeEnough && !isProcessingRef.current) {
                    handleAutoRecognize(detection.descriptor);
                }
            } else {
                setFaceDetected(false);
            }
        } catch (err) {
            console.error('Detection error:', err);
        }
    };

    const handleAutoRecognize = async (descriptor) => {
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        setLoading(true);
        try {
            const faceDescriptor = Array.from(descriptor);
            const res = await attendanceAPI.markByFace(faceDescriptor);

            setMarkResult({ success: true, data: res.data });
            success(res.data.message);
            triggerCooldown();
        } catch (err) {
            // If recognized as someone else or unknown, show result and cooldown
            if (err.response?.status === 400 || err.response?.status === 404) {
                setMarkResult({ success: false, message: err.response.data?.error || 'Face not recognized' });
                triggerCooldown();
            } else {
                // For other errors (network etc), just reset processing to allow retry
                setLoading(false);
                isProcessingRef.current = false;
            }
        } finally {
            setLoading(false);
        }
    };

    const triggerCooldown = () => {
        setCooldown(true);
        setLoading(false);
        isProcessingRef.current = false;
        setTimeout(() => {
            setCooldown(false);
            setMarkResult(null);
        }, COOLDOWN_MS);
    };

    return (
        <div className="auto-kiosk">
            <div className="animated-bg"></div>

            <div className="kiosk-ui-overlay">
                <header className="kiosk-nav">
                    <Link to="/login" className="back-btn"><FiArrowLeft /> Exit Kiosk</Link>
                    <div className="kiosk-status">
                        <div className={`status-dot ${modelsLoaded ? 'online' : 'loading'}`}></div>
                        {modelsLoaded ? 'SYSTEM READY' : 'INITIALIZING...'}
                    </div>
                </header>

                <div className="main-viewport">
                    <div className="camera-container">
                        <video ref={videoRef} autoPlay playsInline muted className="kiosk-video" />
                        <canvas ref={overlayCanvasRef} className="kiosk-canvas" />

                        <div className="scan-region">
                            <div className={`scan-frame ${faceDetected ? 'active' : ''}`}>
                                <div className="corner top-left"></div>
                                <div className="corner top-right"></div>
                                <div className="corner bottom-left"></div>
                                <div className="corner bottom-right"></div>
                            </div>
                        </div>

                        {loading && (
                            <div className="processing-overlay">
                                <div className="spinner"></div>
                                <p>Identifying...</p>
                            </div>
                        )}

                        {markResult && (
                            <div className={`result-overlay ${markResult.success ? 'success' : 'error'}`}>
                                <div className="result-content">
                                    {markResult.success ? (
                                        <>
                                            {markResult.data.profileImage && (
                                                <div className="result-avatar">
                                                    <img src={markResult.data.profileImage} alt={markResult.data.employeeName} />
                                                </div>
                                            )}
                                            <div className="icon"><FiCheckCircle /></div>
                                            <h2>{markResult.data.type === 'CHECK_IN' ? 'Welcome!' : 'Goodbye!'}</h2>
                                            <h3>{markResult.data.employeeName}</h3>
                                            <p>{markResult.data.message}</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="icon"><FiXCircle /></div>
                                            <h2>Access Denied</h2>
                                            <p>{markResult.message}</p>
                                        </>
                                    )}
                                    <div className="cooldown-bar"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="kiosk-info">
                        <div className="clock-section">
                            <div className="time">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                            <div className="date">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        </div>

                        <div className="instructions">
                            <FiCamera className="instr-icon" />
                            <h4>Hands-Free Attendance</h4>
                            <p>Look directly at the camera. The system will automatically recognize you and mark your attendance.</p>
                        </div>

                        <div className="stats-preview">
                            <div className="stat-item">
                                <span className="label">Mode</span>
                                <span className="val">Auto-Detection</span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Status</span>
                                <span className={`val ${faceDetected ? 'text-success' : ''}`}>
                                    {faceDetected ? 'Face Detected' : 'Scanning...'}
                                </span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <style>{`
                .auto-kiosk { height: 100vh; width: 100vw; overflow: hidden; position: relative; background: #000; color: #fff; font-family: 'Inter', sans-serif; }
                .kiosk-ui-overlay { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 2rem; }
                .kiosk-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                .back-btn { display: flex; align-items: center; gap: 0.5rem; color: rgba(255,255,255,0.6); text-decoration: none; padding: 0.8rem 1.2rem; border-radius: 12px; background: rgba(255,255,255,0.05); transition: 0.3s; }
                .back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
                .kiosk-status { display: flex; align-items: center; gap: 0.8rem; font-weight: 700; font-size: 0.9rem; letter-spacing: 1px; color: rgba(255,255,255,0.8); }
                .status-dot { width: 10px; height: 10px; border-radius: 50%; }
                .status-dot.online { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
                .status-dot.loading { background: #f59e0b; animation: pulse 1s infinite; }

                .main-viewport { flex: 1; display: grid; grid-template-columns: 1fr 350px; gap: 2rem; min-height: 0; }
                .camera-container { position: relative; background: #111; border-radius: 30px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .kiosk-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
                .kiosk-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: scaleX(-1); pointer-events: none; }

                .scan-region { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
                .scan-frame { width: 300px; height: 350px; position: relative; transition: 0.3s; border: 1px solid rgba(255,255,255,0.1); }
                .scan-frame.active { border-color: rgba(34, 197, 94, 0.3); }
                .corner { position: absolute; width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); transition: 0.3s; }
                .scan-frame.active .corner { border-color: #22c55e; }
                .top-left { top: -2px; left: -2px; border-right: 0; border-bottom: 0; border-top-left-radius: 20px; }
                .top-right { top: -2px; right: -2px; border-left: 0; border-bottom: 0; border-top-right-radius: 20px; }
                .bottom-left { bottom: -2px; left: -2px; border-right: 0; border-top: 0; border-bottom-left-radius: 20px; }
                .bottom-right { bottom: -2px; right: -2px; border-left: 0; border-top: 0; border-bottom-right-radius: 20px; }

                .processing-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 20; }
                .result-overlay { position: absolute; inset: 2rem; border-radius: 24px; display: flex; align-items: center; justify-content: center; z-index: 30; animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .result-overlay.success { background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 0 50px rgba(16, 185, 129, 0.4); }
                .result-overlay.error { background: linear-gradient(135deg, #dc2626, #ef4444); }
                .result-content { text-align: center; color: #fff; padding: 2rem; }
                .result-content .icon { font-size: 5rem; margin-bottom: 1rem; }
                .result-content h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
                .result-content h3 { font-size: 1.8rem; margin-bottom: 1rem; opacity: 0.9; }
                .cooldown-bar { height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; margin-top: 2rem; width: 100%; position: relative; overflow: hidden; }
                .cooldown-bar::after { content: ''; position: absolute; left: 0; top: 0; height: 100%; background: #fff; width: 100%; animation: shrink 5s linear forwards; }

                .result-avatar { width: 90px; height: 90px; border-radius: 50%; overflow: hidden; margin: 0 auto 1rem; border: 3px solid rgba(255,255,255,0.4); box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
                .result-avatar img { width: 100%; height: 100%; object-fit: cover; }

                .kiosk-info { display: flex; flex-direction: column; gap: 2rem; }
                .clock-section { background: rgba(255,255,255,0.05); padding: 2.5rem; border-radius: 24px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
                .clock-section .time { font-size: 3.5rem; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
                .clock-section .date { font-size: 1.1rem; color: rgba(255,255,255,0.6); margin-top: 0.5rem; }

                .instructions { padding: 2rem; }
                .instr-icon { font-size: 2.5rem; color: #3b82f6; margin-bottom: 1rem; }
                .instructions h4 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.8rem; }
                .instructions p { color: rgba(255,255,255,0.6); line-height: 1.6; }

                .stats-preview { margin-top: auto; padding: 1.5rem; border-radius: 20px; background: rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 1rem; }
                .stat-item { display: flex; justify-content: space-between; font-size: 0.9rem; }
                .stat-item .label { color: rgba(255,255,255,0.4); }
                .stat-item .val { font-weight: 600; }
                .text-success { color: #22c55e; }

                @keyframes shrink { from { width: 100%; } to { width: 0%; } }
                @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}
