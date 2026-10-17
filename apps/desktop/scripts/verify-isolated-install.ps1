param([string]$Report = "docs/verification/2026-10-17-m3-t06-installed")
$ErrorActionPreference = "Stop"
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../.."))
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$targets = @(".venv", "node_modules", "apps/desktop/src", "services/agent/src")
$moves = @()
try {
  foreach ($relative in $targets) {
    $original = [IO.Path]::GetFullPath((Join-Path $workspaceRoot $relative))
    $isolated = $original + ".packaging-verification-hidden"
    $boundary = $workspaceRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (!$original.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase) -or !$isolated.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase)) { throw "Isolation path leaves workspace" }
    if (!(Test-Path -LiteralPath $original) -or (Test-Path -LiteralPath $isolated)) { throw "Isolation source/target conflict" }
    Move-Item -LiteralPath $original -Destination $isolated
    $moves += @{ original = $original; isolated = $isolated }
  }
  & $nodeExecutable (Join-Path $PSScriptRoot "verify-installed.mjs") $Report run
  if ($LASTEXITCODE -ne 0) { throw "Installed app verification failed" }
} finally {
  $restoreErrors = @()
  for ($index = $moves.Count - 1; $index -ge 0; $index--) {
    $move = $moves[$index]
    if (Test-Path -LiteralPath $move.original) { $restoreErrors += $move.original; continue }
    try { Move-Item -LiteralPath $move.isolated -Destination $move.original }
    catch { $restoreErrors += $move.original }
  }
  if ($restoreErrors.Count -gt 0) { throw "Some original paths were recreated or could not be restored; preserve both directories for review: $($restoreErrors -join ', ')" }
}
