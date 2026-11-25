# Long-lived helper that performs playback commands on the player's media session (-Match picks the player).
# Reads one JSON command per stdin line and answers with one JSON line on stdout:
#   {"cmd":"seek","pos":83.5}  {"cmd":"playpause"}  {"cmd":"next"}  {"cmd":"prev"}
# Kept separate from media-reader.ps1 so the (live-verified) reader loop is never at risk.
param([string]$Match = 'AppleMusic|iTunes|Apple')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($op, [Type]$type) {
    $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
    $task.Wait(-1) | Out-Null
    $task.Result
}

[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

function Get-PlayerSession {
    foreach ($s in $mgr.GetSessions()) { if ($s.SourceAppUserModelId -match $Match) { return $s } }
    return $null
}

function Reply($obj) {
    [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress))
    [Console]::Out.Flush()
}

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }          # parent closed the pipe: exit
    if (-not $line.Trim()) { continue }
    $cmd = '?'
    try {
        $req = $line | ConvertFrom-Json
        $cmd = [string]$req.cmd
        $s = Get-PlayerSession
        if ($null -eq $s) { Reply @{ ok = $false; cmd = $cmd; error = 'no session' }; continue }
        $ok = $false
        switch ($cmd) {
            'seek' {
                $ticks = [long]([double]$req.pos * 10000000)
                $ok = [bool](Await ($s.TryChangePlaybackPositionAsync($ticks)) ([bool]))
            }
            'playpause' { $ok = [bool](Await ($s.TryTogglePlayPauseAsync()) ([bool])) }
            'next'      { $ok = [bool](Await ($s.TrySkipNextAsync()) ([bool])) }
            'prev'      { $ok = [bool](Await ($s.TrySkipPreviousAsync()) ([bool])) }
            default     { Reply @{ ok = $false; cmd = $cmd; error = 'unknown command' }; continue }
        }
        Reply @{ ok = $ok; cmd = $cmd }
    } catch {
        Reply @{ ok = $false; cmd = $cmd; error = $_.Exception.Message }
    }
}
