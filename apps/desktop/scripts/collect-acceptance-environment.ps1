param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSha256,
  [string]$Report = ".quality-reports/acceptance-environment.json",
  [ValidateSet("development", "acceptance_candidate")][string]$EnvironmentScope = "acceptance_candidate"
)
$ErrorActionPreference = "Stop"
if ($env:OS -ne "Windows_NT") { throw "Windows environment required" }
$installerPath = (Resolve-Path -LiteralPath $Installer -ErrorAction Stop).Path
$actualHash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $ExpectedSha256.ToLowerInvariant()) { throw "Installer checksum mismatch; do not install" }
$operatingSystem = Get-CimInstance Win32_OperatingSystem
$commands = @(@("node", "npm", "python", "python3", "py", "uv") | ForEach-Object {
  $name = $_
  Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | ForEach-Object {
    [pscustomobject]@{ name = $name; path = $_.Source }
  }
})
$programs = @(@(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
) | ForEach-Object { Get-ItemProperty -Path $_ -ErrorAction SilentlyContinue } |
  Where-Object { $_.DisplayName -match '(^Node\.js|Python|Miniconda|Anaconda)' } |
  Select-Object DisplayName, DisplayVersion)
$runtimeDetected = @($commands).Count -gt 0 -or @($programs).Count -gt 0
# Absence in these two inventories cannot prove that no portable runtime exists.
# Never issue a PASS receipt from environment discovery alone.
$record = [ordered]@{
  schema_version = 1
  collected_at = [DateTime]::UtcNow.ToString("o")
  environment_scope = $EnvironmentScope
  status = $(if ($EnvironmentScope -eq "development" -or $runtimeDetected) { "NOT_READY" } else { "NEEDS_MANUAL_REVIEW" })
  os = [ordered]@{ caption = $operatingSystem.Caption; version = $operatingSystem.Version; build = $operatingSystem.BuildNumber; architecture = $operatingSystem.OSArchitecture; process_architecture = $env:PROCESSOR_ARCHITECTURE }
  installer = [ordered]@{ name = [IO.Path]::GetFileName($installerPath); sha256 = $actualHash; bytes = (Get-Item -LiteralPath $installerPath).Length; signature = (Get-AuthenticodeSignature -LiteralPath $installerPath).Status.ToString() }
  development_runtime_detected = $runtimeDetected
  commands = @($commands)
  registered_runtimes = @($programs)
  manual_review_required = $true
  clean_machine_verified = $false
  application_test_executed = $false
  limitation = "Read-only inventory; inspect portable runtimes and confirm a dedicated clean Windows host before product acceptance. Does not install, launch or modify the application."
}
$reportPath = [IO.Path]::GetFullPath($Report)
if (Test-Path -LiteralPath $reportPath) { throw "Environment report already exists; preserve previous evidence and choose a new report path" }
$parent = Split-Path -Parent $reportPath
if (!(Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$json = $record | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($reportPath, $json + [Environment]::NewLine, (New-Object Text.UTF8Encoding($false)))
Write-Output ($record.status + ": environment inventory saved; clean acceptance requires separate actual application evidence")
if ($record.status -eq "NOT_READY") { exit 2 }
