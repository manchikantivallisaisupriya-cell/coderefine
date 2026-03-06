# register_autostart.ps1
# Registers CodeRefine server as a Windows Task Scheduler task
# that starts automatically on every user login.
# Run this script ONCE (as the current user, no admin needed).

$taskName   = "CodeRefineServer"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$batFile    = Join-Path $scriptDir "run_server.bat"

# Remove any existing task with the same name
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "[*] Removed old task '$taskName'."
}

# Action: run the batch file minimised
$action  = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$batFile`"" `
    -WorkingDirectory $scriptDir

# Trigger: run at logon of the current user
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Settings: no time limit, restart on failure, allow multiple instances ignored
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 99 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew

# Principal: run as the current user (normal privileges — no UAC prompt)
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -Principal $principal `
    -Description "Auto-starts the CodeRefine AI server on login" | Out-Null

Write-Host ""
Write-Host "  ============================================"
Write-Host "   CodeRefine auto-start registered!"
Write-Host "   Task name : $taskName"
Write-Host "   Runs on   : Every login of '$env:USERNAME'"
Write-Host "   To remove : Run unregister_autostart.ps1"
Write-Host "  ============================================"
Write-Host ""
