# unregister_autostart.ps1
# Removes the CodeRefine auto-start task from Windows Task Scheduler.

$taskName = "CodeRefineServer"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "  [OK] Task '$taskName' removed. Server will no longer auto-start."
} else {
    Write-Host "  [!]  Task '$taskName' not found – nothing to remove."
}
