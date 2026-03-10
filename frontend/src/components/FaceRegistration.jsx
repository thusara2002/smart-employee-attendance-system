import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { FiCamera, FiX, FiCheck, FiRotateCcw, FiUser, FiAlertCircle } from 'react-icons/fi';

const REQUIRED_CAPTURES = 5; // Number of face captures for better accuracy
const MODEL_URL = '/models'; // Face-api.js models location

export default function FaceRegistration({ employee, onComplete, onCancel }) {
    const [status, setStatus] = useState('loading'); // loading, ready, capturing, processing, complete, error
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [capturedFaces, setCapturedFaces] = useState([]);
    const [currentInstruction, setCurrentInstruction] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [faceDetected, setFaceDetected] = useState(false);
    const [detectionBox, setDetectionBox] = useState(null);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const streamRef = useRef(null);
    const detectionIntervalRef = useRef(null);

    // Handle cancel with camera cleanup
    const handleCancel = useCallback(() => {
        // Stop camera and detection
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
        onCancel();
    }, [onCancel]);

    const instructions = [
        'Look straight at the camera',
        'Slightly turn your head to the left',
        'Slightly turn your head to the right',
        'Tilt your head slightly up',
        'Tilt your head slightly down'
    ];

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            try {
                setStatus('loading');
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setStatus('ready');
            } catch (err) {
                console.error('Error loading face-api models:', err);
                setErrorMessage('Failed to load face recognition models. Please ensure model files are present in /public/models folder.');
                setStatus('error');
            }
        };

        loadModels();
    }, []);

    // Start camera when models are loaded
    useEffect(() => {
        if (modelsLoaded && (status === 'ready' || status === 'capturing' || status === 'processing')) {
            // Only start camera if not already running
            if (!streamRef.current) {
                startCamera();
            }
        }
        
        // Stop camera when status is complete or error
        if (status === 'complete' || status === 'error') {
            stopCamera();
        }

        return () => {
            // Cleanup on unmount
            stopCamera();
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [modelsLoaded, status]);

    // Real-time face detection for UI feedback
    useEffect(() => {
        if (status === 'ready' || status === 'capturing' || status === 'processing') {
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
    }, [status]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
            
            setCurrentInstruction(instructions[0]);
        } catch (err) {
            console.error('Camera error:', err);
            setErrorMessage('Failed to access camera. Please ensure camera permissions are granted.');
            setStatus('error');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const detectFaceForFeedback = async () => {
        if (!videoRef.current || !overlayCanvasRef.current) return;
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
                setDetectionBox(box);
                
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);
                
                // Draw face landmarks
                const landmarks = resizedDetection.landmarks;
                ctx.fillStyle = '#22c55e';
                landmarks.positions.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                });
            } else {
                setFaceDetected(false);
                setDetectionBox(null);
            }
        } catch (err) {
            // Silently handle detection errors during feedback loop
        }
    };

    const captureFace = async () => {
        if (!videoRef.current || !canvasRef.current || !faceDetected) return;

        setStatus('processing');
        
        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            // Detect face and get descriptor
            const detection = await faceapi
                .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setErrorMessage('No face detected. Please position your face properly.');
                setStatus('capturing');
                return;
            }

            // Get face descriptor (128-dimensional Float32Array)
            const descriptor = Array.from(detection.descriptor);
            
            // Create thumbnail for preview
            const thumbnailCanvas = document.createElement('canvas');
            const thumbSize = 80;
            thumbnailCanvas.width = thumbSize;
            thumbnailCanvas.height = thumbSize;
            const thumbCtx = thumbnailCanvas.getContext('2d');
            
            // Crop face area for thumbnail
            const box = detection.detection.box;
            const padding = 20;
            thumbCtx.drawImage(
                canvas,
                Math.max(0, box.x - padding),
                Math.max(0, box.y - padding),
                box.width + padding * 2,
                box.height + padding * 2,
                0, 0,
                thumbSize, thumbSize
            );
            
            const thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.8);

            const newCapture = {
                descriptor,
                thumbnail,
                instruction: instructions[capturedFaces.length]
            };

            const updatedCaptures = [...capturedFaces, newCapture];
            setCapturedFaces(updatedCaptures);

            if (updatedCaptures.length >= REQUIRED_CAPTURES) {
                setStatus('complete');
                setCurrentInstruction('All captures complete!');
            } else {
                setCurrentInstruction(instructions[updatedCaptures.length]);
                setStatus('capturing');
            }
        } catch (err) {
            console.error('Face capture error:', err);
            setErrorMessage('Failed to capture face. Please try again.');
            setStatus('capturing');
        }
    };

    const startCapturing = () => {
        setCapturedFaces([]);
        setCurrentInstruction(instructions[0]);
        setStatus('capturing');
        setErrorMessage('');
    };

    const resetCaptures = () => {
        setCapturedFaces([]);
        setCurrentInstruction(instructions[0]);
        setStatus('ready');
        setErrorMessage('');
    };

    const handleComplete = () => {
        // Stop camera before completing
        stopCamera();
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
        
        // Calculate average descriptor for better matching
        // Also send all individual descriptors for comprehensive storage
        const allDescriptors = capturedFaces.map(c => c.descriptor);
        
        // Compute average descriptor
        const avgDescriptor = new Array(128).fill(0);
        allDescriptors.forEach(desc => {
            desc.forEach((val, idx) => {
                avgDescriptor[idx] += val;
            });
        });
        avgDescriptor.forEach((val, idx) => {
            avgDescriptor[idx] = val / allDescriptors.length;
        });

        onComplete({
            primaryDescriptor: avgDescriptor,
            allDescriptors: allDescriptors,
            captureCount: capturedFaces.length,
            thumbnails: capturedFaces.map(c => c.thumbnail)
        });
    };

    const renderProgressIndicators = () => {
        return (
            <div className="capture-progress">
                {instructions.map((instruction, idx) => (
                    <div 
                        key={idx}
                        className={`progress-dot ${idx < capturedFaces.length ? 'completed' : idx === capturedFaces.length ? 'current' : ''}`}
                        title={instruction}
                    >
                        {idx < capturedFaces.length ? (
                            <img src={capturedFaces[idx].thumbnail} alt={`Capture ${idx + 1}`} />
                        ) : (
                            <span>{idx + 1}</span>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    if (status === 'loading') {
        return (
            <div className="face-registration">
                <div className="face-reg-loading">
                    <div className="spinner"></div>
                    <p>Loading face recognition models...</p>
                    <p className="text-sm text-muted">This may take a moment on first load</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="face-registration">
                <div className="face-reg-error">
                    <FiAlertCircle className="error-icon" />
                    <h3>Error</h3>
                    <p>{errorMessage}</p>
                    <button className="btn btn-secondary" onClick={handleCancel}>
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="face-registration">
            <div className="face-reg-header">
                <div className="employee-info">
                    <div className="avatar-lg">
                        <FiUser />
                    </div>
                    <div>
                        <h3>{employee.firstName} {employee.lastName}</h3>
                        <p className="text-muted">{employee.employeeId}</p>
                    </div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={handleCancel}>
                    <FiX />
                </button>
            </div>

            <div className="face-reg-content">
                <div className="camera-section">
                    <div className="camera-wrapper">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="camera-feed"
                        />
                        <canvas ref={overlayCanvasRef} className="detection-overlay" />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        
                        {/* Face guide overlay */}
                        <div className="face-guide-overlay">
                            <div className={`face-oval ${faceDetected ? 'detected' : ''}`}></div>
                        </div>

                        {/* Status indicator */}
                        <div className={`face-status ${faceDetected ? 'detected' : 'not-detected'}`}>
                            {faceDetected ? 'Face Detected ✓' : 'Position your face in the oval'}
                        </div>
                    </div>

                    <div className="instruction-panel">
                        <p className="current-instruction">{currentInstruction}</p>
                        {errorMessage && (
                            <p className="error-message">{errorMessage}</p>
                        )}
                    </div>
                </div>

                <div className="controls-section">
                    {renderProgressIndicators()}

                    <div className="capture-info">
                        <p>{capturedFaces.length} of {REQUIRED_CAPTURES} captures completed</p>
                    </div>

                    <div className="action-buttons">
                        {(status === 'ready' || status === 'capturing') && (
                            <>
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={captureFace}
                                    disabled={!faceDetected || status === 'processing'}
                                >
                                    <FiCamera /> Capture ({capturedFaces.length + 1}/{REQUIRED_CAPTURES})
                                </button>
                                {capturedFaces.length > 0 && (
                                    <button className="btn btn-secondary" onClick={resetCaptures}>
                                        <FiRotateCcw /> Reset
                                    </button>
                                )}
                            </>
                        )}

                        {status === 'processing' && (
                            <button className="btn btn-primary btn-lg" disabled>
                                <span className="spinner" style={{ width: 20, height: 20 }}></span>
                                Processing...
                            </button>
                        )}

                        {status === 'complete' && (
                            <div className="complete-actions">
                                <button className="btn btn-success btn-lg" onClick={handleComplete}>
                                    <FiCheck /> Save Face Data
                                </button>
                                <button className="btn btn-secondary" onClick={resetCaptures}>
                                    <FiRotateCcw /> Recapture
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .face-registration {
                    padding: 0;
                }

                .face-reg-loading,
                .face-reg-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    text-align: center;
                    gap: 1rem;
                }

                .face-reg-error .error-icon {
                    font-size: 3rem;
                    color: var(--error);
                }

                .face-reg-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }

                .employee-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .avatar-lg {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: var(--primary-light);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }

                .face-reg-content {
                    padding: 1.5rem;
                }

                .camera-section {
                    margin-bottom: 1.5rem;
                }

                .camera-wrapper {
                    position: relative;
                    width: 100%;
                    max-width: 480px;
                    margin: 0 auto;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background: #000;
                    aspect-ratio: 4/3;
                }

                .camera-feed {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
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

                .face-guide-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                }

                .face-oval {
                    width: 200px;
                    height: 260px;
                    border: 3px dashed rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    transition: all 0.3s ease;
                }

                .face-oval.detected {
                    border-color: var(--success);
                    border-style: solid;
                    box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
                }

                .face-status {
                    position: absolute;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-full);
                    font-size: 0.875rem;
                    font-weight: 500;
                    backdrop-filter: blur(4px);
                }

                .face-status.detected {
                    background: rgba(34, 197, 94, 0.9);
                    color: white;
                }

                .face-status.not-detected {
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                }

                .instruction-panel {
                    text-align: center;
                    margin-top: 1rem;
                }

                .current-instruction {
                    font-size: 1.125rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .error-message {
                    color: var(--error);
                    margin-top: 0.5rem;
                    font-size: 0.875rem;
                }

                .controls-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .capture-progress {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: center;
                }

                .progress-dot {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: var(--surface);
                    border: 2px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 500;
                    color: var(--text-muted);
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .progress-dot.current {
                    border-color: var(--primary);
                    color: var(--primary);
                    transform: scale(1.1);
                }

                .progress-dot.completed {
                    border-color: var(--success);
                    padding: 0;
                }

                .progress-dot.completed img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .capture-info {
                    color: var(--text-muted);
                    font-size: 0.875rem;
                }

                .action-buttons {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .complete-actions {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .btn-success {
                    background: var(--success);
                    color: white;
                }

                .btn-success:hover {
                    background: #16a34a;
                }
            `}</style>
        </div>
    );
}
