# Removes Needledrop (app files, shortcuts, "Apps & features" entry, start-with-Windows entry).
# Your settings and lyrics cache in %APPDATA%\needledrop are kept unless you pass -RemoveData.
param(
  [switch]$RemoveData,
  [switch]$Cleanup,          # internal: second stage, runs from a temp copy so the install folder can be deleted
  [string]$InstallDir = $PSScriptRoot
)
$ErrorActionPreference = 'Continue'
$name = 'Needledrop'

if (-not $Cleanup) {
  # run from a temp copy: a script cannot delete the folder it is running from
  $tmp = Join-Path $env:TEMP 'Needledrop-Uninstall.ps1'
  Copy-Item -Path $PSCommandPath -Destination $tmp -Force
  $args2 = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tmp, '-Cleanup', '-InstallDir', $PSScriptRoot)
  if ($RemoveData) { $args2 += '-RemoveData' }
  Start-Process -FilePath 'powershell.exe' -ArgumentList $args2 -Wait
  exit
}

Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
  [void]$_.CloseMainWindow(); if (-not $_.WaitForExit(4000)) { $_.Kill() }
}
foreach ($lnk in @((Join-Path ([Environment]::GetFolderPath('Programs')) "$name.lnk"), (Join-Path ([Environment]::GetFolderPath('Desktop')) "$name.lnk"))) {
  # only remove a shortcut that points at THIS installation
  if (Test-Path $lnk) {
    $target = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk).TargetPath
    if ($target -like "$InstallDir*") { Remove-Item $lnk -Force }
  }
}
Remove-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Needledrop' -Recurse -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name $name -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
if (Test-Path $InstallDir) { Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue }
if ($RemoveData) { Remove-Item -Path (Join-Path $env:APPDATA 'needledrop') -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "$name was removed."
