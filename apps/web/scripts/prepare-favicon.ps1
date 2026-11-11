# Deterministic favicon export from the supplied standalone logo artwork.
# The full production navbar logo remains the byte-for-byte original PNG.
# This extracts its mark for an icon; it does not crop the landing-page reference.
Add-Type -AssemblyName System.Drawing
$brandDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/brand'))
$sourcePath = Join-Path $brandDirectory 'cipherquiz-approved.png'
$sourceImage = [Drawing.Image]::FromFile($sourcePath)
try {
  if ($sourceImage.Width -ne 2172 -or $sourceImage.Height -ne 724) {
    throw 'This export is defined for the supplied 2172 x 724 approved logo.'
  }
  $markBounds = [Drawing.RectangleF]::new(270, 160, 380, 410)
  foreach ($iconSize in @(32, 64, 180)) {
    $iconImage = [Drawing.Bitmap]::new($iconSize, $iconSize)
    $drawing = [Drawing.Graphics]::FromImage($iconImage)
    try {
      $drawing.Clear([Drawing.Color]::FromArgb(8, 8, 13))
      $drawing.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $drawing.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $targetWidth = $iconSize * $markBounds.Width / $markBounds.Height
      $targetBounds = [Drawing.RectangleF]::new(($iconSize - $targetWidth) / 2, 0, $targetWidth, $iconSize)
      $drawing.DrawImage($sourceImage, $targetBounds, $markBounds, [Drawing.GraphicsUnit]::Pixel)
      $iconImage.Save((Join-Path $brandDirectory "favicon-$iconSize.png"), [Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $drawing.Dispose()
      $iconImage.Dispose()
    }
  }
} finally { $sourceImage.Dispose() }
