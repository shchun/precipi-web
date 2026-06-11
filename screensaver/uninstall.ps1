# Removes the Nebula screensaver and clears it as the active screensaver.
$ErrorActionPreference = 'SilentlyContinue'

$key = 'HKCU:\Control Panel\Desktop'
$cur = (Get-ItemProperty $key -Name 'SCRNSAVE.EXE').'SCRNSAVE.EXE'
if ($cur -like '*NebulaScreensaver*') {
    Set-ItemProperty $key -Name 'SCRNSAVE.EXE' -Value ''
    Set-ItemProperty $key -Name 'ScreenSaveActive' -Value '0'
    Write-Host "Cleared Nebula as the active screensaver."
}

$target = Join-Path $env:LOCALAPPDATA 'NebulaScreensaver'
if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
    Write-Host "Removed $target"
}
Write-Host "Done."
