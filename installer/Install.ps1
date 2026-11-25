# Installs Needledrop (Apple Music or Spotify edition, whichever is in this folder) for the current user (no administrator rights needed):
#   * copies the app to %LOCALAPPDATA%\Programs\<app name>
#   * adds Start Menu + Desktop shortcuts
#   * registers it in Settings > Apps so it can be uninstalled normally
# Run it from the unzipped folder (double-click Install.cmd).
param(
  [string]$InstallDir,
  [switch]$NoShortcuts,
  [switch]$NoLaunch
)
$ErrorActionPreference = 'Stop'
$appFolder = Get-ChildItem -Path $PSScriptRoot -Directory -Filter 'Needledrop-for-*-win32-x64' | Select-Object -First 1
if (-not $appFolder) { throw 'Run the installer from the unzipped folder, next to the Needledrop-for-...-win32-x64 folder.' }
$name = $appFolder.Name -replace '-win32-x64$', ''     # file name, e.g. Needledrop-for-Spotify
$title = $name -replace '-', ' '                       # what people see, e.g. Needledrop for Spotify
$player = $title -replace '^Needledrop for ', ''
$src = $appFolder.FullName
if (-not (Test-Path (Join-Path $src "$name.exe"))) { throw "Could not find $name.exe in '$src'." }
if (-not $InstallDir) { $InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$name" }

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
    (Join-Path ([Environment]::GetFolderPath('Programs')) "$title.lnk"),
    (Join-Path ([Environment]::GetFolderPath('Desktop')) "$title.lnk")
  )
  foreach ($lnk in $targets) {
    $s = $shell.CreateShortcut($lnk)
    $s.TargetPath = $exe; $s.WorkingDirectory = $InstallDir; $s.IconLocation = "$exe,0"
    $s.Description = "Spinning vinyl and word-by-word lyrics for $player"
    $s.Save()
  }
}

# "Apps & features" entry (per-user)
$version = (Get-Item $exe).VersionInfo.ProductVersion
$key = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$name"
New-Item -Path $key -Force | Out-Null
$props = @{
  DisplayName = $title; DisplayVersion = $version; Publisher = 'Nadav'; DisplayIcon = $exe
  InstallLocation = $InstallDir; NoModify = 1; NoRepair = 1
  UninstallString = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallDir 'Uninstall.ps1')`""
}
foreach ($k in $props.Keys) { New-ItemProperty -Path $key -Name $k -Value $props[$k] -Force | Out-Null }

# versions published under the earlier names install separately; say so instead of removing anything
$oldName = if ($player -eq 'Spotify') { 'Needledrop-Spotify' } else { 'Needledrop' }
$oldLink = Join-Path ([Environment]::GetFolderPath('Programs')) "$oldName.lnk"
if ((Test-Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$oldName") -or (Test-Path $oldLink)) {
  Write-Host "Note: an older version called '$oldName' is also installed. Quit it, then remove it in Settings > Apps, or run Uninstall.ps1 from its folder under $env:LOCALAPPDATA\Programs (your settings are kept)."
}
Write-Host "Installed. Open $player, play a song, then start '$title' from the Start Menu."
if (-not $NoLaunch) { Start-Process $exe }
