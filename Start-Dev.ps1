$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$packageManager = Get-Command pnpm -ErrorAction SilentlyContinue
if ($packageManager) {
    & $packageManager.Source dev
} else {
    $bundledPnpm = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
    if (-not (Test-Path -LiteralPath $bundledPnpm)) {
        throw 'Instala Node.js 22.18+ y pnpm 11; después ejecuta pnpm install y pnpm dev.'
    }
    & $bundledPnpm dev
}
