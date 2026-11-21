# Installs Needledrop for the current user (no administrator rights needed):
#   * copies the app to %LOCALAPPDATA%\Programs\Needledrop
#   * adds Start Menu + Desktop shortcuts
#   * registers it in Settings > Apps so it can be uninstalled normally
# Run it from the unzipped folder (double-click Install.cmd).
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'Programs\Needledrop'),
  [switch]$NoShortcuts,
  [switch]$NoLaunch
)
$ErrorActionPreference = 'Stop'
$name = 'Needledrop'
$src = Join-Path $PSScriptRoot 'Needledrop-win32-x64'
if (-not (Test-Path (Join-Path $src "$name.exe"))) {
  throw "Could not find '$src'. Run the installer from the unzipped folder, next to the 'Needledrop-win32-x64' folder."
}

# close a running copy first so its files can be replaced
Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
  [void]$_.CloseMainWindow(); if (-not $_.WaitForExit(4000)) { $_.Kill() }
}

Write-Host "Installing to $InstallDir ..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $InstallDir -Recurse -Force
Copy-Item -Path (Join-Path $PSScriptRoot 'Uninstall.ps1') -Destination $InstallDir -Force

$exe = Join-Path $InstallDir "$name.exe"
if (-not $NoShortcuts) {
  $shell = New-Object -ComObject WScript.Shell
  $targets = @(
    (Join-Path ([Environment]::GetFolderPath('Programs')) "$name.lnk"),
    (Join-Path ([Environment]::GetFolderPath('Desktop')) "$name.lnk")
  )
  foreach ($lnk in $targets) {
    $s = $shell.CreateShortcut($lnk)
    $s.TargetPath = $exe; $s.WorkingDirectory = $InstallDir; $s.IconLocation = "$exe,0"
    $s.Description = 'Spinning vinyl and word-by-word lyrics for Apple Music'
    $s.Save()
  }
}

# "Apps & features" entry (per-user)
$version = (Get-Item $exe).VersionInfo.ProductVersion
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Needledrop'
New-Item -Path $key -Force | Out-Null
$props = @{
  DisplayName = $name; DisplayVersion = $version; Publisher = 'Nadav'; DisplayIcon = $exe
  InstallLocation = $InstallDir; NoModify = 1; NoRepair = 1
  UninstallString = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallDir 'Uninstall.ps1')`""
}
foreach ($k in $props.Keys) { New-ItemProperty -Path $key -Name $k -Value $props[$k] -Force | Out-Null }

Write-Host "Installed. Open Apple Music, play a song, then start '$name' from the Start Menu."
if (-not $NoLaunch) { Start-Process $exe }
