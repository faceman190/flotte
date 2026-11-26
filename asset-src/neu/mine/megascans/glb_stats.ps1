# Aufteilung eines GLB in Bilder und Geometrie (Bytes je Bild, Summe Geometrie). Aufruf: .\glb_stats.ps1 out\*.glb
param([string[]]$Files)
foreach ($f in (Get-ChildItem $Files)) {
  $b = [IO.File]::ReadAllBytes($f.FullName)
  $len = [BitConverter]::ToUInt32($b, 12)
  $j = [Text.Encoding]::UTF8.GetString($b, 20, $len) | ConvertFrom-Json
  $imgBV = @{}; $i = 0
  foreach ($im in $j.images) { $imgBV[[int]$im.bufferView] = $im.name; $i++ }
  $img = 0; $geo = 0; $list = @()
  for ($k = 0; $k -lt $j.bufferViews.Count; $k++) {
    $s = [int64]$j.bufferViews[$k].byteLength
    if ($imgBV.ContainsKey($k)) { $img += $s; $list += ('{0} {1:N1}' -f $imgBV[$k], ($s / 1MB)) } else { $geo += $s }
  }
  '{0}: gesamt {1:N1} MB, Bilder {2:N1} MB ({3}), Geometrie {4:N1} MB' -f $f.Name, ($f.Length / 1MB), ($img / 1MB), $j.images.Count, ($geo / 1MB)
  if ($env:DETAIL) { $list | % { '   ' + $_ } }
}
