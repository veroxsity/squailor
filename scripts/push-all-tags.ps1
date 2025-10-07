Write-Host "Pushing all local tags to origin..."
git push origin --tags
if ($LASTEXITCODE -ne 0) { Write-Error 'git push --tags failed'; exit 1 }
Write-Host "All tags pushed."
