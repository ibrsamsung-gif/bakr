param(
  [int]$SlideDurationMs = 0,
  [string]$PriceFile = ''
)

$ErrorActionPreference = 'Stop'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Ffmpeg = 'C:\Program Files\VoiceStudio\ffmpeg.exe'
$Resvg = Join-Path $ProjectDir 'tools\resvg.exe'
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
$OutputDir = $ProjectDir
$WorkDir = Join-Path $ProjectDir 'work'
if ($PriceFile) {
  $PriceFile = (Resolve-Path -LiteralPath $PriceFile).Path
  $Revision = [IO.Path]::GetFileNameWithoutExtension($PriceFile)
  if ($Revision -notmatch '[^.\s]') { throw 'Invalid price backup filename' }
  $OutputDir = Join-Path (Join-Path $ProjectDir 'exports') $Revision
  $WorkDir = Join-Path (Join-Path $WorkDir 'price-exports') $Revision
}
$PreviewDir = Join-Path $OutputDir 'previews'
$VideoDir = Join-Path $OutputDir 'videos'
$FrameDir = Join-Path $WorkDir 'frames'
$SvgDir = Join-Path $WorkDir 'svg'
$FontDir = Join-Path $ProjectDir 'assets\fonts'

foreach ($path in @($PreviewDir, $VideoDir, $FrameDir, $SvgDir)) {
  New-Item -ItemType Directory -Force -Path $path | Out-Null
}
if (-not (Test-Path $Ffmpeg)) { throw "FFmpeg not found: $Ffmpeg" }
if (-not (Test-Path $Resvg)) { throw "resvg not found: $Resvg" }
if (-not $Node) { throw 'Node.js was not found in PATH' }

$DataPath = Join-Path $ProjectDir 'data\menu-data.js'
$DataText = Get-Content -Raw -Encoding UTF8 $DataPath
if ($SlideDurationMs -le 0) {
  $match = [regex]::Match($DataText, 'slideDurationMs:\s*(\d+)')
  if (-not $match.Success) { throw 'slideDurationMs not found in data/menu-data.js' }
  $SlideDurationMs = [int]$match.Groups[1].Value
}
$SlideSeconds = $SlideDurationMs / 1000.0

$RenderScript = Join-Path $ProjectDir 'tools\render-frames.js'
$RenderArgs = @($RenderScript, $SvgDir)
if ($PriceFile) { $RenderArgs += $PriceFile }
& $Node @RenderArgs | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Frame generation failed' }

function Render-Svg([string]$SvgFile, [string]$OutFile) {
  & $Resvg --quiet --skip-system-fonts --use-fonts-dir $FontDir --languages ar $SvgFile $OutFile
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $OutFile)) { throw "SVG render failed: $OutFile" }
}

Render-Svg (Join-Path $SvgDir 'menu-full.svg') (Join-Path $PreviewDir 'menu-full.png')
Render-Svg (Join-Path $SvgDir 'menu-base.svg') (Join-Path $FrameDir 'menu-base.png')
for ($i = 0; $i -lt 15; $i++) {
  Render-Svg (Join-Path $SvgDir ("item-{0:D2}.svg" -f $i)) (Join-Path $FrameDir ("item-{0:D2}.png" -f $i))
}
Copy-Item (Join-Path $FrameDir 'item-00.png') (Join-Path $PreviewDir 'showcase.png') -Force

$MenuVideo = Join-Path $VideoDir 'shawarma-bakr-menu-full.mp4'
$MenuBase = Join-Path $FrameDir 'menu-base.png'
$Skewer = Join-Path $ProjectDir 'assets\images\chicken-skewer.jpg'
$MenuFilter = "[1:v]scale=850:850,crop=360:850:245:0,format=rgba,rotate='0.012*sin(2*PI*t/12)':ow=iw:oh=ih:c=none,fade=t=in:st=0:d=1,fade=t=out:st=11:d=1[s];[0:v][s]overlay=40:180:shortest=1,fps=30,format=yuv420p[outv]"
& $Ffmpeg -loglevel error -y -loop 1 -t 12 -i $MenuBase -loop 1 -t 12 -i $Skewer -filter_complex $MenuFilter -map '[outv]' -an -c:v libx264 -preset veryfast -crf 18 -profile:v high -level 4.1 -movflags +faststart $MenuVideo
if ($LASTEXITCODE -ne 0) { throw 'Full menu video export failed' }

$args = @('-loglevel','error','-y')
for ($i = 0; $i -lt 15; $i++) {
  $args += @('-loop','1','-t',([string]$SlideSeconds),'-i',(Join-Path $FrameDir ("item-{0:D2}.png" -f $i)))
}
$filters = @()
for ($i = 0; $i -lt 15; $i++) {
  $fadeOutAt = [math]::Max(0, $SlideSeconds - 0.35).ToString('0.###', [cultureinfo]::InvariantCulture)
  $filters += "[$i`:v]scale=1920:1080,fade=t=in:st=0:d=0.35,fade=t=out:st=$fadeOutAt`:d=0.35,setsar=1[v$i]"
}
$concatInputs = (0..14 | ForEach-Object { "[v$_]" }) -join ''
$filters += "$concatInputs`concat=n=15:v=1:a=0,fps=30,format=yuv420p[outv]"
$ShowcaseVideo = Join-Path $VideoDir 'shawarma-bakr-showcase-cycle.mp4'
$args += @('-filter_complex',($filters -join ';'),'-map','[outv]','-an','-c:v','libx264','-preset','veryfast','-crf','18','-profile:v','high','-level','4.1','-movflags','+faststart',$ShowcaseVideo)
& $Ffmpeg @args
if ($LASTEXITCODE -ne 0) { throw 'Showcase video export failed' }

Write-Host "Created previews in $PreviewDir"
Write-Host "Created videos in $VideoDir"
