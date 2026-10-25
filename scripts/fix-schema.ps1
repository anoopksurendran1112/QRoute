$path = "D:\DemoProjects\deepak\apps\api\prisma\schema.prisma"
$content = Get-Content -Path $path -Raw
$content = $content.Replace('\"', '"')
Set-Content -Path $path -Value $content
Write-Host "done"
