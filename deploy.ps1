# deploy.ps1 — run this in PowerShell from the cosmic-reader folder
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue
git add index.html safe_zone.html
git commit -m "Robot head for AI & Tech planet (shifted up); Starship rendering for Space Frontier"
git push
