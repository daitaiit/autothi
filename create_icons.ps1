Add-Type -AssemblyName System.Drawing
$sizes = @(16, 48, 128)
$dir = "d:\Tool\AutoThi\icons"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $color1 = [System.Drawing.Color]::FromArgb(79, 70, 229)
    $color2 = [System.Drawing.Color]::FromArgb(6, 182, 212)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $color1, $color2, 45.0
    $g.FillEllipse($brush, 1, 1, ($size - 2), ($size - 2))
    
    $penWidth = [Math]::Max(2, [int]($size / 8))
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $penWidth
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    
    $p1 = New-Object System.Drawing.PointF ($size * 0.28), ($size * 0.52)
    $p2 = New-Object System.Drawing.PointF ($size * 0.45), ($size * 0.70)
    $p3 = New-Object System.Drawing.PointF ($size * 0.75), ($size * 0.32)
    $g.DrawLines($pen, [System.Drawing.PointF[]]@($p1, $p2, $p3))
    
    $filePath = Join-Path $dir "icon$size.png"
    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}
Write-Host "Icons generated successfully!"
