@echo off
rem Double-click to install the Needledrop edition in this folder for the current user (no admin rights needed).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1"
if errorlevel 1 pause
