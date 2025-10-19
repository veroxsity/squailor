param(
  [Parameter(Position=0, Mandatory=$false)]
  [string] $Tag
)

function Get-LastTagBefore([string] $tagRef) {
  try {
    $out = git describe --tags --abbrev=0 "${tagRef}^" 2>$null
    if ($LASTEXITCODE -eq 0 -and $out) { return $out.Trim() } else { return $null }
  } catch { return $null }
}

function Get-CurrentTagOrHead() {
  if ($Tag) { return $Tag }
  try {
    $out = git describe --tags --abbrev=0 2>$null
    if ($LASTEXITCODE -eq 0 -and $out) { return $out.Trim() } else { return 'HEAD' }
  } catch { return 'HEAD' }
}

$currentRef = Get-CurrentTagOrHead
$prevTag = Get-LastTagBefore $currentRef

if ($currentRef -eq 'HEAD') {
  # Fallback: release notes for commits since last tag up to HEAD
  try {
    $prevTag = git describe --tags --abbrev=0 2>$null
  } catch { $prevTag = $null }
}

$range = if ($prevTag) { "$prevTag..$currentRef" } else { $null }

# Collect commit subjects (no merges)
$subjects = @()
if ($range) {
  $subjects = git log $range --no-merges --pretty=format:"%s" | Where-Object { $_ -and (-not $_.StartsWith('Merge')) }
} else {
  $subjects = git log --no-merges -n 50 --pretty=format:"%s" | Where-Object { $_ -and (-not $_.StartsWith('Merge')) }
}

# Prefer feature/fix first; keep it short (max 12 lines)
$prioritized = @()
$features = $subjects | Where-Object { $_ -match '^(feat|feature)\b' }
$fixes    = $subjects | Where-Object { $_ -match '^fix\b' }
$other    = $subjects | Where-Object { $_ -notmatch '^(feat|feature|fix)\b' }
$prioritized += $features
$prioritized += $fixes
$prioritized += $other
$shortList = $prioritized | Select-Object -First 12

$tagTitle = if ($currentRef -eq 'HEAD') { (Get-Date -Format 'yyyy-MM-dd') } else { $currentRef }

$lines = @()
$lines += "## What's new"
if ($prevTag) { $lines += "_Changes since $prevTag_`n" } else { $lines += "_Recent changes_`n" }

if ($shortList.Count -eq 0) {
  $lines += "- Maintenance and internal improvements"
} else {
  foreach ($s in $shortList) {
    $clean = ($s -replace '\.$','').Trim()
    $lines += "- $clean"
  }
}

$outPath = Join-Path (Get-Location) 'RELEASE_NOTES.md'
Set-Content -Path $outPath -Value ($lines -join "`n") -Encoding UTF8

Write-Host "Generated $outPath"
Write-Host "Preview:" -ForegroundColor Cyan
Write-Host "`n$($lines -join "`n")" -ForegroundColor Gray

Write-Host "`nTip: create a release with GitHub CLI:" -ForegroundColor Cyan
Write-Host "gh release create $currentRef --title $currentRef --notes-file RELEASE_NOTES.md" -ForegroundColor Yellow
