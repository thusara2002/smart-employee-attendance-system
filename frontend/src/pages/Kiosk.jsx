import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { attendanceAPI, employeeAPI } from '../services/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as faceapi from 'face-api.js';
import { FiCamera, FiMonitor, FiCheckCircle, FiXCircle, FiArrowLeft, FiRefreshCw, FiMaximize } from 'react-icons/fi';

const MODEL_URL = '/models';

export default function Kiosk() {
    const [mode, setMode] = useState('select'); // select, qr, face
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const { success, error } = useToast();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const scannerRef = useRef(null);
    const detectionIntervalRef = useRef(null);

    // Load face-api models on component mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error('Error loading face-api models:', err);
            }
        };
        loadModels();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
            }
            stopCamera();
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    // QR Scanner setup
    useEffect(() => {
        if (mode === 'qr') {
            const scanner = new Html5QrcodeScanner('qr-reader', {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            });

            scanner.render(
                async (decodedText) => {
                    await handleQRScan(decodedText);
                    scanner.clear();
                },
                (errorMessage) => {
                    // Handle scan error silently
                }
            );

            scannerRef.current = scanner;

            return () => {
                scanner.clear();
            };
        }
    }, [mode]);

    // Face recognition camera setup
    useEffect(() => {
        if (mode === 'face') {
            startCamera();
        } else {
            stopCamera();
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        }
    }, [mode]);

    // Real-time face detection for UI feedback
    useEffect(() => {
        if (mode === 'face' && modelsLoaded) {
            detectionIntervalRef.current = setInterval(detectFaceForFeedback, 100);
        } else {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        }
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [mode, modelsLoaded]);

    const detectFaceForFeedback = async () => {
        if (!videoRef.current || !overlayCanvasRef.current || !modelsLoaded) return;
        if (videoRef.current.readyState !== 4) return;

        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        const displaySize = { width: video.videoWidth, height: video.videoHeight };

        faceapi.matchDimensions(canvas, displaySize);

        try {
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks();

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
                setFaceDetected(true);
                const resizedDetection = faceapi.resizeResults(detection, displaySize);

                // Draw face box
                const box = resizedDetection.detection.box;
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);
            } else {
                setFaceDetected(false);
            }
        } catch (err) {
            // Silently handle detection errors
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            error('Failed to access camera. Please ensure camera permissions are granted.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleQRScan = async (qrCode) => {
        setLoading(true);
        try {
            const response = await attendanceAPI.markByQR(qrCode);
            setResult({ success: true, data: response.data });
            success(response.data.message);
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.error || 'Failed to mark attendance' });
            error(err.response?.data?.error || 'Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    };

    const captureAndRecognize = async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

        setLoading(true);
        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);

            // Use face-api.js to detect face and extract descriptor
            const detection = await faceapi
                .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setResult({ success: false, message: 'No face detected. Please position your face in the frame and try again.' });
                error('No face detected');
                setLoading(false);
                return;
            }

            // Convert Float32Array to regular array for JSON serialization
            const faceDescriptor = Array.from(detection.descriptor);

            const response = await attendanceAPI.markByFace(faceDescriptor);
            setResult({ success: true, data: response.data });
            success(response.data.message);
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.error || 'Face not recognized. Please ensure you have registered your face.' });
            error(err.response?.data?.error || 'Face not recognized');
        } finally {
            setLoading(false);
        }
    };

    const resetKiosk = () => {
        setMode('select');
        setResult(null);
        setLoading(false);
    };

    return (
        <div className="kiosk-page">
            <div className="animated-bg"></div>

            <div className="kiosk-container">
                <header className="kiosk-header">
                    <Link to="/login" className="back-link">
                        <FiArrowLeft /> Back to Login
                    </Link>
                    <h1 className="kiosk-title">
                        <FiMonitor /> Attendance Kiosk
                    </h1>
                    <p className="kiosk-subtitle">Mark your attendance using QR code or face recognition</p>
                </header>

                {/* Mode Selection */}
                {mode === 'select' && (
                    <div className="mode-selection">
                        <button
                            className="mode-card"
                            onClick={() => setMode('qr')}
                        >
                            <div className="mode-icon qr">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-2 0h1v1h-1v-1zm2 2h1v1h-1v-1zm-2 0h1v1h-1v-1zm2 2h1v1h-1v-1zm-2 0h1v1h-1v-1zm2 2h1v1h-1v-1zm-4-6h1v1h-1v-1zm0 2h1v1h-1v-1zm0 2h1v1h-1v-1zm0 2h1v1h-1v-1z" />
                                </svg>
                            </div>
                            <h3>QR Code Scan</h3>
                            <p>Scan your employee QR code</p>
                        </button>

                        <button
                            className="mode-card"
                            onClick={() => setMode('face')}
                        >
                            <div className="mode-icon face">
                                <FiCamera />
                            </div>
                            <h3>Face Recognition</h3>
                            <p>Use face recognition to check in</p>
                        </button>

                        <Link
                            to="/auto-kiosk"
                            className="mode-card"
                            style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white' }}
                        >
                            <div className="mode-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <FiMaximize />
                            </div>
                            <h3>Auto-Attendance Mode</h3>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>Hands-free, continuous face recognition</p>
                        </Link>
                    </div>
                )}

                {/* QR Scanner */}
                {mode === 'qr' && !result && (
                    <div className="scanner-section">
                        <div id="qr-reader" className="qr-reader"></div>
                        <button className="btn btn-secondary mt-4" onClick={resetKiosk}>
                            <FiArrowLeft /> Go Back
                        </button>
                    </div>
                )}

                {/* Face Recognition */}
                {mode === 'face' && !result && (
                    <div className="face-section">
                        <div className="camera-container">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="camera-video"
                            />
                            <canvas ref={overlayCanvasRef} className="detection-overlay" />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <div className="camera-overlay">
                                <div className={`face-guide ${faceDetected ? 'detected' : ''}`}></div>
                            </div>
                            <div className={`face-status-indicator ${faceDetected ? 'detected' : ''}`}>
                                {!modelsLoaded ? 'Loading models...' : faceDetected ? 'Face Detected ✓' : 'Position your face'}
                            </div>
                        </div>

                        <div className="face-actions">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={captureAndRecognize}
                                disabled={loading || !modelsLoaded || !faceDetected}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner" style={{ width: 20, height: 20 }}></span>
                                        Recognizing...
                                    </>
                                ) : (
                                    <>
                                        <FiCamera /> Capture & Recognize
                                    </>
                                )}
                            </button>
                            <button className="btn btn-secondary" onClick={resetKiosk}>
                                <FiArrowLeft /> Go Back
                            </button>
                        </div>

                        <p className="face-hint">
                            {!modelsLoaded
                                ? 'Please wait while face recognition models are loading...'
                                : 'Position your face within the oval and ensure good lighting'}
                        </p>
                    </div>
                )}

                {/* Result Display */}
                {result && (
                    <div className="result-section">
                        <div className={`result-card ${result.success ? 'success' : 'error'}`}>
                            <div className="result-icon">
                                {result.success ? <FiCheckCircle /> : <FiXCircle />}
                            </div>

                            {result.success ? (
                                <>
                                    {result.data.profileImage && (
                                        <div className="result-avatar">
                                            <img src={result.data.profileImage} alt={result.data.employeeName} />
                                        </div>
                                    )}
                                    <h2 className="result-title">
                                        {result.data.type === 'CHECK_IN' ? 'Welcome!' : 'Goodbye!'}
                                    </h2>
                                    <p className="result-name">{result.data.employeeName}</p>
                                    <p className="result-message">{result.data.message}</p>
                                    <p className="result-time">
                                        {new Date(result.data.timestamp).toLocaleString()}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="result-title">Recognition Failed</h2>
                                    <p className="result-message">{result.message}</p>
                                </>
                            )}

                            <button className="btn btn-primary btn-lg mt-6" onClick={resetKiosk}>
                                <FiRefreshCw /> Try Again
                            </button>
                        </div>
                    </div>
                )}

                <footer className="kiosk-footer">
                    <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="time">{new Date().toLocaleTimeString()}</p>
                </footer>
            </div>

            <style>{`
        .kiosk-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .kiosk-container {
          width: 100%;
          max-width: 800px;
          text-align: center;
        }

        .kiosk-header {
          margin-bottom: 3rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .back-link:hover {
          color: var(--primary);
        }

        .kiosk-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .kiosk-subtitle {
          color: var(--text-secondary);
          font-size: 1.125rem;
        }

        .mode-selection {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          max-width: 600px;
          margin: 0 auto;
        }

        @media (max-width: 640px) {
          .mode-selection {
            grid-template-columns: 1fr;
          }
        }

        .mode-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: 2.5rem;
          cursor: pointer;
          transition: all var(--transition-normal);
          text-align: center;
        }

        .mode-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
          border-color: var(--primary);
        }

        .mode-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          color: white;
        }

        .mode-icon.qr {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        }

        .mode-icon.face {
          background: linear-gradient(135deg, var(--secondary), var(--secondary-dark));
        }

        .mode-icon svg {
          width: 48px;
          height: 48px;
        }

        .mode-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .mode-card p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .scanner-section, .face-section {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin: 0 auto;
          max-width: 500px;
        }

        .camera-container {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: #000;
        }

        .camera-video {
          width: 100%;
          display: block;
          transform: scaleX(-1);
        }

        .detection-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform: scaleX(-1);
          pointer-events: none;
        }

        .camera-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .face-guide {
          width: 200px;
          height: 260px;
          border: 3px dashed rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .face-guide.detected {
          border-color: var(--success);
          border-style: solid;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
        }

        .face-status-indicator {
          position: absolute;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 500;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          backdrop-filter: blur(4px);
          transition: all 0.3s ease;
        }

        .face-status-indicator.detected {
          background: rgba(34, 197, 94, 0.9);
        }

        .qr-reader {
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .face-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .face-hint {
          margin-top: 1rem;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .result-section {
          max-width: 400px;
          margin: 0 auto;
        }

        .result-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-xl);
          padding: 3rem 2rem;
          animation: scaleIn 0.5s ease;
        }

        .result-card.success {
          border: 2px solid var(--success);
        }

        .result-card.error {
          border: 2px solid var(--error);
        }

        .result-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }

        .result-card.success .result-icon {
          color: var(--success);
        }

        .result-card.error .result-icon {
          color: var(--error);
        }

        .result-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .result-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .result-message {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .result-time {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .result-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto 1rem;
          border: 3px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .result-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .kiosk-footer {
          margin-top: 3rem;
          color: var(--text-muted);
        }

        .kiosk-footer .time {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 0.5rem;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
}
