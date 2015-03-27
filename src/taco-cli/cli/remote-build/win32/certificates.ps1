param(
    [Parameter(Mandatory=$True)][string]$Command,
    [Parameter(Mandatory=$False)][string]$CertificateName = "taco-remote"
)

# Uncaught exceptions do not correctly set the exit code in powershell scripts invoked via the -file argument!
trap
{
    write-output $_
    exit $_.Exception.HResult
}

$X509Store = [System.Security.Cryptography.X509Certificates.X509Store];
$X509FindType = [System.Security.Cryptography.X509Certificates.X509FindType];
$X509ContentType = [System.Security.Cryptography.X509Certificates.X509ContentType];
$X509StoreName = [System.Security.Cryptography.X509Certificates.StoreName];
$X509StoreLocation = [System.Security.Cryptography.X509Certificates.StoreLocation];
$X509OpenFlags = [System.Security.Cryptography.X509Certificates.OpenFlags];
$X509Certificate2Collection = [System.Security.Cryptography.X509Certificates.X509Certificate2Collection];
$X509KeyStorageFlags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags];

$Store = New-Object $X509Store($X509StoreName::My, $X509StoreLocation::CurrentUser)

if ($Command -eq "get") {
    # Find certificates with the given name and export them to stdout in base64 encoding
    $Store.Open($X509OpenFlags::ReadOnly)
    $Certs = $Store.Certificates.Find($X509FindType::FindBySubjectName, $CertificateName, $False)
    $Store.Close();
    if ($Certs.count -gt 0) {
        [System.Console]::WriteLine([System.Convert]::ToBase64String($certs.Export($X509ContentType::Pkcs12)));
        exit 0
    } else {
        exit 2
    }
} elseif ($Command -eq "set") {
    # parse stdin as a base64 encoded certificate, and add it to the certificate store
    $newCertsToAdd = new-object $X509Certificate2Collection;
    $oldCertsToRemove = new-object $X509Certificate2Collection;

    $base64Cert = [System.Console]::ReadLine()
    # no password, mark private key as exportable
    [byte[]]$CertBytes = [System.Convert]::FromBase64String($base64Cert)
    [string]$Password = ""
    [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]$KeyFlags = $X509KeyStorageFlags::UserKeySet -bor $X509KeyStorageFlags::PersistKeySet -bor $X509KeyStorageFlags::Exportable
    $newCertsToAdd.Import($CertBytes, $Password, $KeyFlags);

    $Store.Open($X509OpenFlags::ReadWrite);
    # We want to cleanup any certs already in the store with the same name (from an old cert acquisition.)
    foreach ($cert in $newCertsToAdd) {
        $oldCertsToRemove.AddRange($Store.Certificates.Find($X509FindType::FindBySubjectDistinguishedName, $cert.Subject, $False));
        # Write out the private certificate's name since we need to store it in order to retrieve the certificate later
        if ($cert.Subject -ne $cert.Issuer) {
            [System.Console]::WriteLine($cert.Subject);
        }
    }

    $Store.RemoveRange($oldCertsToRemove);
    $Store.AddRange($newCertsToAdd);
    $Store.Close();
    exit 0;
}