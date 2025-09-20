# Bot dizini
$BotPath = "C:\Users\Shepherd\Desktop\Discord Bot\Q"

# GitHub branch
$GitBranch = "main"

# PM2 process name
$PM2Name = "discord-bot"

# Bot dizinine geç
Set-Location -Path $BotPath

Write-Host "🔄 Pulling latest changes from GitHub..." -ForegroundColor Cyan
git pull origin $GitBranch

Write-Host "⚡ Restarting bot with PM2..." -ForegroundColor Cyan

# Eğer süreç varsa restart, yoksa start et
$pm2List = pm2 list | Out-String
if ($pm2List -match $PM2Name) {
    pm2 restart $PM2Name --update-env
    Write-Host "✅ Bot restarted successfully!" -ForegroundColor Green
} else {
    pm2 start index.js --name $PM2Name --update-env
    Write-Host "✅ Bot started successfully!" -ForegroundColor Green
}

Write-Host "🎵 Bot güncelleme işlemi tamamlandı." -ForegroundColor Cyan
