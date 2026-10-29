param([ValidateRange(1024, 65535)][int]$Port = 8095)

$ErrorActionPreference = 'Stop'
$backendDirectory = Split-Path -Parent $PSScriptRoot
$repositoryDirectory = Split-Path -Parent $backendDirectory
$socketDirectory = Join-Path $repositoryDirectory '.runtime'
New-Item -ItemType Directory -Path $socketDirectory -Force | Out-Null

Push-Location $backendDirectory
try {
    # A short socket path avoids Java AF_UNIX failures with long Windows TEMP paths.
    $socketOption = '-Djdk.net.unixdomain.tmpdir="' + $socketDirectory + '"'
    & '.\mvnw.cmd' 'spring-boot:run' "-Dspring-boot.run.arguments=--server.port=$Port" "-Dspring-boot.run.jvmArguments=$socketOption"
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE" }
} finally {
    Pop-Location
}
