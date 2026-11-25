# Reads the Windows media session (SMTC) that a music player publishes (-Match picks the player) and prints one JSON line per poll.
# Run with Windows PowerShell 5.1:  powershell -NoProfile -File media-reader.ps1 [-Once]
param([switch]$Once, [switch]$Any, [int]$IntervalMs = 400, [string]$Match = 'AppleMusic|iTunes|Apple')

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
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamReference, Windows.Storage.Streams, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]

$script:AsStreamForRead = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

function Get-Session {
    $all = $mgr.GetSessions()
    foreach ($s in $all) { if ($s.SourceAppUserModelId -match $Match) { return $s } }
    # Only the chosen player is followed; -Any falls back to whatever app is playing.
    if ($Any) { return $mgr.GetCurrentSession() }
    return $null
}

function Get-Cover($props) {
    try {
        if ($null -eq $props.Thumbnail) { return $null }
        $stream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        # PowerShell hands back the WinRT stream as a bare __ComObject, so normal method binding
        # (AsStreamForRead($stream)) fails. Invoking the extension through reflection works.
        $net = $script:AsStreamForRead.Invoke($null, @($stream))
        $ms = New-Object System.IO.MemoryStream
        $net.CopyTo($ms)
        $bytes = $ms.ToArray()
        if ($bytes.Length -lt 8) { return $null }
        # ContentType is empty on this object, so detect the format from the magic bytes.
        if ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50) { $mime = 'image/png' }
        elseif ($bytes[0] -eq 0x52 -and $bytes[1] -eq 0x49) { $mime = 'image/webp' }
        elseif ($bytes[0] -eq 0x47 -and $bytes[1] -eq 0x49) { $mime = 'image/gif' }
        else { $mime = 'image/jpeg' }
        $b64 = [Convert]::ToBase64String($bytes)
        return "data:$mime;base64,$b64"
    } catch { return $null }
}

$lastKey = ''
$cover = $null
$coverSent = $false
$coverTries = 0
$sentFp = $null
$poll = 0

while ($true) {
    $out = $null
    try {
        $s = Get-Session
        if ($null -eq $s) {
            $out = @{ active = $false }
        } else {
            $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $info = $s.GetPlaybackInfo()
            $tl = $s.GetTimelineProperties()
            $playing = ($info.PlaybackStatus -eq 'Playing')
            $pos = $tl.Position.TotalSeconds
            $nowUtc = [DateTimeOffset]::UtcNow
            $posAt = $nowUtc.ToUnixTimeMilliseconds()      # the instant `$pos` below is valid for
            if ($playing -and $tl.LastUpdatedTime.Year -gt 2000) {
                $pos += ($nowUtc - $tl.LastUpdatedTime).TotalSeconds
            }
            $dur = ($tl.EndTime - $tl.StartTime).TotalSeconds
            if ($dur -gt 0 -and $pos -gt $dur) { $pos = $dur }
            if ($pos -lt 0) { $pos = 0 }
            $key = "$($props.Title)|$($props.Artist)|$($props.AlbumTitle)"
            $newTrack = ($key -ne $lastKey)
            $poll++
            if ($newTrack) {
                $lastKey = $key
                $cover = $null
                $coverSent = $false
                $coverTries = 0
                $sentFp = $null
            }
            # A player can update the title BEFORE the artwork (Apple Music does), so the first thumbnail after a track
            # change is often still the previous song's. Keep re-reading it (every ~2 s for ~25 s) and send it again
            # whenever the image actually changed, instead of trusting the first one.
            if ($coverTries -eq 0 -or (($poll % 5) -eq 0 -and $coverTries -lt 14)) {
                $c2 = Get-Cover $props
                $coverTries++
                if ($c2) {
                    $fp = '{0}:{1}:{2}' -f $c2.Length, $c2.Substring(100, [Math]::Min(300, $c2.Length - 100)), $c2.Substring([Math]::Max(0, $c2.Length - 300))
                    if ($fp -ne $sentFp) { $cover = $c2; $coverSent = $false; $sentFp = $fp }
                }
            }
            $sendCover = ($cover -and -not $coverSent)
            if ($sendCover) { $coverSent = $true }
            $out = @{
                active   = $true
                app      = $s.SourceAppUserModelId
                title    = $props.Title
                artist   = $props.Artist
                album    = $props.AlbumTitle
                playing  = $playing
                position = [math]::Round($pos, 2)
                # wall-clock time (ms since epoch) at which `position` was valid, so the window can
                # compensate for the time the line spent travelling through the pipe
                ts       = $posAt
                duration = [math]::Round($dur, 2)
                newTrack = $newTrack
                cover    = $(if ($sendCover) { $cover } else { $null })
                hasCover = [bool]$cover
                # what the player lets us do, so the UI can disable unsupported controls
                caps     = @{
                    seek  = [bool]$info.Controls.IsPlaybackPositionEnabled
                    next  = [bool]$info.Controls.IsNextEnabled
                    prev  = [bool]$info.Controls.IsPreviousEnabled
                    pause = [bool]$info.Controls.IsPauseEnabled
                    play  = [bool]$info.Controls.IsPlayEnabled
                }
            }
        }
    } catch {
        $out = @{ active = $false; error = $_.Exception.Message }
    }
    [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress -Depth 4))
    [Console]::Out.Flush()
    if ($Once) { break }
    Start-Sleep -Milliseconds $IntervalMs
}
