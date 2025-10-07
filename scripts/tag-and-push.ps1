param(
  [Parameter(Mandatory=$true)][string]$Version
)

# Normalize version (allow v1.2.3 or 1.2.3)
if ($Version.StartsWith('v')) { $Version = $Version.Substring(1) }
$tag = "v$Version"

Write-Host "Tagging and pushing $tag..."

# Ensure we're on main and up-to-date
git checkout main
if ($LASTEXITCODE -ne 0) { Write-Error 'git checkout main failed'; exit 1 }

git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Error 'git pull origin main failed'; exit 1 }

# Create annotated tag
git tag -a $tag -m "Release $tag"
if ($LASTEXITCODE -ne 0) { Write-Error 'git tag failed (maybe tag exists)'; exit 1 }

# Push tag
git push origin $tag
if ($LASTEXITCODE -ne 0) { Write-Error 'git push tag failed'; exit 1 }

Write-Host "Successfully pushed tag $tag"
