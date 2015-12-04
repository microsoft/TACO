# Spawn elevatedInstaller.js in a new command prompt, as administrator by opening a UAC prompt
$pinfo = New-Object System.Diagnostics.ProcessStartInfo
$pinfo.FileName = "node.exe"
$pinfo.UseShellExecute = $true
$pinfo.WindowStyle = "Hidden"
$pinfo.Verb = "RunAs"
$pinfo.Arguments = "$args"

$p = New-Object System.Diagnostics.Process
$p.StartInfo = $pinfo
Try
{
	$p.Start() | Out-Null
	$p.WaitForExit()
}
Catch
{
	# Arbitrary exit code, defined in installerProtocol.ts, used to indicate that the elevated installer could not be launched
	Exit 33
}

# Send exit code back to dependencyInstaller.js
Exit $p.ExitCode