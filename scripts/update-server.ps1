$ErrorActionPreference = 'Stop'
& ssh -o ConnectTimeout=10 root@123.57.154.12 'bash /opt/deep-surge/repo/scripts/update-server.sh'
if ($LASTEXITCODE -ne 0) {
    throw 'Server update failed. Check the output; the current release is preserved on validation failure.'
}
