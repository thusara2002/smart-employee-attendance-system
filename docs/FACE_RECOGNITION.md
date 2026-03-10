# Face Recognition Feature Documentation

## Overview
This attendance system includes a professional face recognition feature for employee identification. The system captures multiple face images from different angles during registration to ensure accurate recognition during attendance marking.

## How Face Registration Works

### Registration Process (5 Captures)
1. **Look Straight** - Capture front-facing image
2. **Turn Left** - Capture slight left angle
3. **Turn Right** - Capture slight right angle
4. **Tilt Up** - Capture with head tilted up
5. **Tilt Down** - Capture with head tilted down

This multi-angle approach ensures:
- Better accuracy in varying lighting conditions
- Recognition from different camera angles
- Reduced false positives and negatives

### Data Storage
The system stores:
- **Primary Descriptor**: Average of all captured face descriptors (128-dimensional vector)
- **All Descriptors**: Individual descriptors from each capture
- **Capture Count**: Number of successful captures
- **Registration Timestamp**: When the face was registered

### Face Matching Algorithm
During attendance marking, the system:
1. Extracts a 128-dimensional face descriptor from the captured image
2. Compares against all registered employees' descriptors
3. Uses Euclidean distance for similarity matching
4. Matches if distance is below 0.6 threshold (configurable)
5. Checks both primary descriptor AND all individual descriptors for best match

## Technical Implementation

### Frontend Components
- `FaceRegistration.jsx` - Reusable component for capturing face data
- Uses `face-api.js` library for face detection and descriptor extraction
- Real-time face detection with visual feedback

### Backend Services
- `EmployeeService.java` - Handles face registration
- `AttendanceService.java` - Handles face matching during attendance
- `EmployeeDTO.java` - Data transfer objects for face data

### Face API Models Required
Located in `/public/models/`:
- `ssd_mobilenetv1_model-*` - Face detection model
- `face_landmark_68_model-*` - Facial landmark detection
- `face_recognition_model-*` - Face descriptor extraction

## API Endpoints

### Register Face
```
POST /api/employees/register-face
Content-Type: application/json

{
  "employeeId": "EMP001",
  "primaryDescriptor": [0.1, 0.2, ...], // 128 values
  "allDescriptors": [[...], [...], ...], // Array of 128-value arrays
  "captureCount": 5
}
```

### Mark Attendance by Face
```
POST /api/attendance/kiosk/face
Content-Type: application/json

{
  "faceDescriptor": [0.1, 0.2, ...] // 128 values
}
```

## Best Practices for Face Registration

1. **Lighting**: Ensure good, even lighting on the face
2. **Position**: Face should be clearly visible within the guide oval
3. **Distance**: Maintain appropriate distance from camera (arm's length)
4. **Background**: Plain background preferred
5. **Accessories**: Remove glasses/hats if causing detection issues

## Troubleshooting

### "No face detected"
- Ensure proper lighting
- Position face within the oval guide
- Check camera permissions

### "Face not recognized"
- Re-register the face with better lighting
- Ensure all 5 captures were completed
- Contact admin if issues persist

### Models not loading
- Verify model files exist in `/public/models/`
- Check browser console for loading errors
- Run `download-models.ps1` to download models

## Security Considerations

- Face descriptors are stored as numerical vectors, not images
- Data is transmitted over HTTPS
- Access to face registration requires admin privileges
- Face matching threshold can be adjusted for security/convenience balance
