# Installs the Nebula screensaver for the current user and makes it active.
#
# Nebula.scr is self-contained (DLLs/html/p5 embedded), so we just drop the one
# file in %LOCALAPPDATA% and register its full path. (Most users can instead just
# right-click the downloaded .scr -> Install.)
#
#   pwsh ./install.ps1          # build if needed, copy, set as active screensaver
#   pwsh ./install.ps1 -Activate:$false   # install only, don't change current saver

param([bool]$Activate = $true, [int]$TimeoutMinutes = 5)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$scr  = Join-Path $root 'dist\Nebula.scr'

if (-not (Test-Path $scr)) {
    Write-Host "Nebula.scr not found — building..."
    & (Join-Path $root 'build.ps1')
}

$target = Join-Path $env:LOCALAPPDATA 'NebulaScreensaver'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$installedScr = Join-Path $target 'Nebula.scr'
Copy-Item $scr $installedScr -Force
Write-Host "Installed to: $target"

if ($Activate) {
    $key = 'HKCU:\Control Panel\Desktop'
    Set-ItemProperty $key -Name 'SCRNSAVE.EXE'     -Value $installedScr
    Set-ItemProperty $key -Name 'ScreenSaveActive' -Value '1'
    Set-ItemProperty $key -Name 'ScreenSaveTimeOut' -Value ([string]($TimeoutMinutes * 60))
    Write-Host "Set as active screensaver (idle $TimeoutMinutes min)." -ForegroundColor Green
    Write-Host "Preview now:  & '$installedScr' /s"
} else {
    Write-Host "Installed (not activated). To preview:  & '$installedScr' /s"
}
