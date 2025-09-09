Write-Host "🚀 Discord Bot Güncelleme Başlıyor..." -ForegroundColor Cyan

# Proje klasörüne git
Set-Location "C:\Users\Shepherd\Desktop\Discord Bot\Q"

# Git add
git add .

# Commit (otomatik mesaj ile)
$commitMessage = "Otomatik commit - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m "$commitMessage"

# Push
git push origin main

Write-Host "✅ Güncelleme tamamlandı, GitHub Actions otomatik deploy edecek!" -ForegroundColor Green
