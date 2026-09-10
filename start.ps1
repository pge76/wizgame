<#
  Startet WizGame im Dev-Modus.
  Sorgt dafuer, dass Node.js/npm im PATH gefunden werden, auch wenn die
  System-PATH-Variable (noch) nicht aktualisiert wurde, installiert bei
  Bedarf die Dependencies und startet danach den Vite-Dev-Server.
#>

$ErrorActionPreference = "Stop"

function Resolve-NodeOnPath {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        return
    }

    $candidates = @(
        "$env:ProgramFiles\nodejs",
        "${env:ProgramFiles(x86)}\nodejs",
        "$env:LOCALAPPDATA\Programs\nodejs"
    )

    foreach ($dir in $candidates) {
        if (Test-Path (Join-Path $dir "node.exe")) {
            $env:Path = "$dir;$env:Path"
            if (Get-Command node -ErrorAction SilentlyContinue) {
                return
            }
        }
    }
}

Resolve-NodeOnPath

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue

if (-not $node -or -not $npm) {
    Write-Error "Node.js/npm wurden nicht gefunden. Bitte Node.js installieren (z.B. 'winget install -e --id OpenJS.NodeJS.LTS') und dieses Script erneut ausfuehren."
    exit 1
}

Write-Host "Node $(node -v) / npm $(npm -v) gefunden." -ForegroundColor DarkGray

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
    Write-Host "Installiere Dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "Starte WizGame (Vite Dev-Server)..." -ForegroundColor Green
npm run dev
