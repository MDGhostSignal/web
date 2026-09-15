# Prefer 5GHz — robust version (no ReadKey; logs to file)
$ErrorActionPreference = "Stop"
$log = Join-Path $PSScriptRoot "wifi-fix-last-run.log"
function Log([string]$m) {
  $line = "$(Get-Date -Format 'HH:mm:ss')  $m"
  Add-Content -Path $log -Value $line
  Write-Host $line
}

Remove-Item $log -Force -ErrorAction SilentlyContinue
Log "=== GhostSignal Wi-Fi Prefer 5GHz ==="
Log "Running as: $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Log "IsAdmin: $isAdmin"
if (-not $isAdmin) {
  Log "ERROR: Not elevated. Re-run via the .bat so UAC can elevate."
  exit 1
}

Log "BEFORE:"
netsh wlan show interfaces | Out-String | ForEach-Object { Log $_.TrimEnd() }

$regKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\0000"
$ok = $false

# Method A: cmdlet
try {
  Log "Method A: Set-NetAdapterAdvancedProperty..."
  Set-NetAdapterAdvancedProperty -Name "Wi-Fi" -DisplayName "Preferred Band" -DisplayValue "3. Prefer 5GHz band"
  $val = (Get-NetAdapterAdvancedProperty -Name "Wi-Fi" | Where-Object DisplayName -eq "Preferred Band").DisplayValue
  Log "Preferred Band display value: $val"
  if ($val -match "5GHz") { $ok = $true }
} catch {
  Log "Method A failed: $($_.Exception.Message)"
}

# Method B: registry
try {
  Log "Method B: registry RoamingPreferredBandType=2..."
  Set-ItemProperty -Path $regKey -Name "RoamingPreferredBandType" -Value 2 -Type DWord
  $rv = (Get-ItemProperty -Path $regKey).RoamingPreferredBandType
  Log "Registry value now: $rv"
  if ($rv -eq 2) { $ok = $true }
} catch {
  Log "Method B failed: $($_.Exception.Message)"
}

# Method C: reg.exe (sometimes works when PowerShell provider is blocked)
try {
  Log "Method C: reg.exe add..."
  $p = Start-Process -FilePath "reg.exe" -ArgumentList @(
    "add",
    "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\0000",
    "/v", "RoamingPreferredBandType",
    "/t", "REG_DWORD",
    "/d", "2",
    "/f"
  ) -Wait -PassThru -NoNewWindow
  Log "reg.exe exit: $($p.ExitCode)"
  if ($p.ExitCode -eq 0) { $ok = $true }
} catch {
  Log "Method C failed: $($_.Exception.Message)"
}

if (-not $ok) {
  Log "ERROR: Could not write Prefer 5GHz setting by any method."
  exit 1
}

Log "Restarting Wi-Fi adapter..."
try {
  Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false
  Start-Sleep -Seconds 3
  Enable-NetAdapter -Name "Wi-Fi" -Confirm:$false
  Start-Sleep -Seconds 8
} catch {
  Log "Adapter bounce warning: $($_.Exception.Message)"
}

Log "Reconnecting to FRITZ!Box 7530 FE..."
netsh wlan connect name="FRITZ!Box 7530 FE" ssid="FRITZ!Box 7530 FE" | Out-String | ForEach-Object { Log $_.TrimEnd() }
Start-Sleep -Seconds 10

Log "AFTER:"
netsh wlan show interfaces | Out-String | ForEach-Object { Log $_.TrimEnd() }

$pref = (Get-NetAdapterAdvancedProperty -Name "Wi-Fi" -ErrorAction SilentlyContinue |
  Where-Object DisplayName -eq "Preferred Band").DisplayValue
Log "Preferred Band setting: $pref"

$iface = netsh wlan show interfaces | Out-String
if ($iface -match "5 GHz") {
  Log "SUCCESS: connected on 5 GHz."
  exit 0
}

Log "NOTE: Setting written, but still on 2.4 GHz (common if 5 GHz signal is weak)."
Log "Next: move closer, split 5 GHz SSID on FRITZ!Box, or use Ethernet."
exit 0
