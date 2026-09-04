# =========================================================================
#  AIRFAIR — Register Windows Task Scheduler Job for Daily Accumulation
# =========================================================================

$TaskName = "AIRFAIR_Daily_Airfare_Accumulation"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BatPath = Join-Path $ScriptDir "run_daily_accumulation.bat"

Write-Host "Registering Windows Scheduled Task: $TaskName"
Write-Host "Target Script: $BatPath"
Write-Host "Project Root: $ProjectRoot"

# Command to create daily scheduled task at 06:00 AM daily
$Action = New-ScheduledTaskAction -Execute $BatPath -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -Daily -At 6:00AM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "AIRFAIR Daily Real Airfare Data Accumulation from SerpApi"
    Write-Host "Successfully registered scheduled task: $TaskName (Daily at 06:00 AM)" -ForegroundColor Green
} catch {
    Write-Host "Notice: Run PowerShell as Administrator to register the system Task Scheduler job, or execute manually via run_daily_accumulation.bat." -ForegroundColor Yellow
}
