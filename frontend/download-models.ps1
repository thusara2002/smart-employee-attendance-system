# Face API Models Download Script
# This script downloads the required face-api.js model files

$modelsDir = "public/models"

# Model URLs from face-api.js GitHub
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

$models = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

Write-Host "Downloading face-api.js models to $modelsDir..." -ForegroundColor Cyan

foreach ($model in $models) {
    $url = "$baseUrl/$model"
    $output = "$modelsDir/$model"
    
    Write-Host "Downloading $model..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "  Downloaded: $model" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to download: $model" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

Write-Host "`nModel download complete!" -ForegroundColor Cyan
Write-Host "Models are now available in $modelsDir" -ForegroundColor Green
