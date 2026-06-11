# Builds Nebula.scr — a Windows screensaver that renders ../nebula.html in WebView2.
# Requires: Windows .NET Framework C# compiler (built in) + WebView2 Runtime (preinstalled on Win10/11).
# No .NET SDK / Visual Studio needed.
#
#   pwsh ./build.ps1            # build (downloads deps on first run)
#   pwsh ./build.ps1 -Clean     # remove generated/downloaded files first

param([switch]$Clean)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
$deps = Join-Path $root '_deps'

if ($Clean) {
    Remove-Item $dist, $deps -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $dist, $deps | Out-Null

# --- 1. Dependencies (WebView2 managed DLLs + native loader + p5.js) ---
$wv2Ver = '1.0.4022.49'
$needWv2 = -not (Test-Path (Join-Path $dist 'Microsoft.Web.WebView2.Core.dll')) `
        -or -not (Test-Path (Join-Path $dist 'WebView2Loader.dll'))
if ($needWv2) {
    Write-Host "Downloading WebView2 SDK $wv2Ver ..."
    $nupkg = Join-Path $deps 'webview2.zip'
    Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$wv2Ver/microsoft.web.webview2.$wv2Ver.nupkg" -OutFile $nupkg -TimeoutSec 180
    $extract = Join-Path $deps 'webview2'
    Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue
    Expand-Archive $nupkg -DestinationPath $extract -Force
    Copy-Item "$extract\lib\net462\Microsoft.Web.WebView2.Core.dll"     $dist -Force
    Copy-Item "$extract\lib\net462\Microsoft.Web.WebView2.WinForms.dll" $dist -Force
    Copy-Item "$extract\runtimes\win-x64\native\WebView2Loader.dll"     $dist -Force
}
if (-not (Test-Path (Join-Path $dist 'p5.min.js'))) {
    Write-Host "Downloading p5.js ..."
    Invoke-WebRequest 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js' -OutFile (Join-Path $dist 'p5.min.js') -TimeoutSec 180
}

# --- 2. Generate the bundled, screensaver-tuned nebula.html ---
Write-Host "Bundling nebula.html ..."
$srcHtml = Resolve-Path (Join-Path $root '..\nebula.html')
$html = Get-Content $srcHtml -Raw

# p5 from local file instead of CDN (works offline)
$html = $html -replace [regex]::Escape('https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.js'), 'p5.min.js'
# hide the on-screen UI (fullscreen/gear buttons + settings) and the cursor
$inject = '<style id="saverStyle">.fab,#settingsOverlay{display:none!important}html,body{cursor:none!important}</style>'
$html = $html -replace '</head>', ($inject + "`r`n</head>")
# default to the fun mixed source (news fetch fails gracefully -> 아재개그/속마음/일본어 offline)
$html = $html -replace "source:\s*'local'", "source: 'mixed'"

Set-Content (Join-Path $dist 'nebula.html') $html -NoNewline

# --- 3. Compile a single self-contained Nebula.scr ---
# Managed WebView2 DLLs are referenced for compile AND embedded for runtime
# resolution; the native loader + html + p5 are embedded and extracted at launch.
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { throw "C# compiler not found: $csc" }

$core = Join-Path $dist 'Microsoft.Web.WebView2.Core.dll'
$wf   = Join-Path $dist 'Microsoft.Web.WebView2.WinForms.dll'
$loader = Join-Path $dist 'WebView2Loader.dll'
$p5   = Join-Path $dist 'p5.min.js'
$page = Join-Path $dist 'nebula.html'

Write-Host "Compiling self-contained Nebula.scr ..."
$out = Join-Path $dist 'Nebula.scr'
& $csc /nologo /target:winexe /platform:x64 `
    "/out:$out" `
    "/win32manifest:$(Join-Path $root 'app.manifest')" `
    /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
    "/r:$core" "/r:$wf" `
    "/resource:$core,Microsoft.Web.WebView2.Core.dll" `
    "/resource:$wf,Microsoft.Web.WebView2.WinForms.dll" `
    "/resource:$loader,WebView2Loader.dll" `
    "/resource:$page,nebula.html" `
    "/resource:$p5,p5.min.js" `
    "$(Join-Path $root 'Program.cs')" `
    "$(Join-Path $root 'SaverForm.cs')"

if ($LASTEXITCODE -ne 0) { throw "Compilation failed (exit $LASTEXITCODE)" }

# --- 4. Publish the single file for the website download button ---
$pub = Join-Path $root '..\downloads'
New-Item -ItemType Directory -Force -Path $pub | Out-Null
$published = Join-Path $pub 'NebulaThoughts.scr'
Copy-Item $out $published -Force

Write-Host "`nBuilt:     $out" -ForegroundColor Green
Write-Host "Published: $(Resolve-Path $published)" -ForegroundColor Green
"{0:N0} KB (self-contained)" -f ((Get-Item $out).Length / 1KB)
