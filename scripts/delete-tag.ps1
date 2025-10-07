param(
  [Parameter(Mandatory=$true)][string]$Version
)

# Normalize version (allow v1.2.3 or 1.2.3)
if ($Version.StartsWith('v')) { $Version = $Version.Substring(1) }
$tag = "v$Version"

Write-Host "Preparing to delete tag $tag (local + remote)"

# Confirm action
Write-Host "This will delete the tag '$tag' locally and on origin. Continue? [y/N]"
$resp = Read-Host
if ($resp -ne 'y' -and $resp -ne 'Y') {
  Write-Host 'Aborted by user.'
  exit 0
}

# Delete local tag if exists
$localTags = git tag -l $tag
if ($localTags -ne $null -and $localTags.Trim() -ne '') {
  git tag -d $tag
  if ($LASTEXITCODE -ne 0) { Write-Error "Failed to delete local tag $tag"; exit 1 }
  else { Write-Host "Deleted local tag $tag" }
} else {
  Write-Host "Local tag $tag does not exist";
}

# Delete remote tag
git push --delete origin $tag
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to delete remote tag origin/$tag (it may not exist or you may lack permissions)";
  exit 1
} else {
  Write-Host "Deleted remote tag origin/$tag"
}

Write-Host "Done."
