param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$Repo = "vijayk1989/TheStoryNexusTauriApp",
    [string]$NotesFile = "",
    [string]$Npm = "npm.cmd",

    [switch]$Draft,
    [switch]$Prerelease,
    [switch]$DryRun,
    [switch]$SkipVerification,
    [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "Set VERSION, for example: make -f Makefile release VERSION=1.2.9"
}

function Resolve-Gh {
    $command = Get-Command gh -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $defaultPath = "C:\Program Files\GitHub CLI\gh.exe"
    if (Test-Path -LiteralPath $defaultPath) {
        return $defaultPath
    }

    throw "GitHub CLI was not found. Install it, restart your terminal, and run 'gh auth login'."
}

function Invoke-Step {
    param(
        [string]$Label,
        [string]$File,
        [string[]]$Arguments
    )

    Write-Host ""
    Write-Host "==> $Label"
    if ($DryRun) {
        Write-Host "DRY RUN: $File $($Arguments -join ' ')"
        return
    }

    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "'$Label' failed with exit code $LASTEXITCODE."
    }
}

function Read-ReleaseBody {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Release notes file not found: $Path"
    }

    $lines = Get-Content -LiteralPath $Path
    $start = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -eq "## GitHub Release Body") {
            $start = $i
            break
        }
    }

    if ($start -lt 0) {
        throw "Release notes must contain a '## GitHub Release Body' section."
    }

    $end = $lines.Count
    for ($i = $start + 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^##\s+") {
            $end = $i
            break
        }
    }

    $bodyLines = @($lines[($start + 1)..($end - 1)])
    return ($bodyLines -join "`n").Trim()
}

function Write-Utf8NoBomFile {
    param(
        [string]$Path,
        [string]$Value
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($Path, $Value, $utf8NoBom)
}

function Assert-NoUtf8Bom {
    param([string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if (
        $bytes.Length -ge 3 -and
        $bytes[0] -eq 0xEF -and
        $bytes[1] -eq 0xBB -and
        $bytes[2] -eq 0xBF
    ) {
        throw "$Path must be UTF-8 without a BOM. Tauri updater metadata with a BOM fails to decode."
    }
}

function Assert-Version {
    $packageVersion = (Get-Content package.json | ConvertFrom-Json).version
    if ($packageVersion -ne $Version) {
        throw "package.json version is '$packageVersion', expected '$Version'."
    }

    $tauriConfigVersion = (Get-Content src-tauri\tauri.conf.json | ConvertFrom-Json).version
    if ($tauriConfigVersion -ne $Version) {
        throw "src-tauri\tauri.conf.json version is '$tauriConfigVersion', expected '$Version'."
    }

    $cargoToml = Get-Content src-tauri\Cargo.toml -Raw
    if ($cargoToml -notmatch "version\s*=\s*`"$([regex]::Escape($Version))`"") {
        throw "src-tauri\Cargo.toml does not contain version '$Version'."
    }
}

function Assert-CleanTree {
    if ($AllowDirty) {
        return
    }

    $status = git status --porcelain
    if ($status) {
        throw "Working tree is not clean. Commit or stash changes before creating a release, or pass -AllowDirty for a dry run."
    }
}

$gh = Resolve-Gh
if ([string]::IsNullOrWhiteSpace($NotesFile)) {
    $NotesFile = "docs\releases\$Version.md"
}

$msiName = "thestorynexus_${Version}_x64_en-US.msi"
$msiPath = "src-tauri\target\release\bundle\msi\$msiName"
$sigPath = "$msiPath.sig"
$latestJsonPath = "dist\updater\latest.json"
$releaseTitle = "The Story Nexus $Version"
$releaseNotesPath = "dist\updater\release-notes-$Version.md"
$msiUrl = "https://github.com/$Repo/releases/download/$Version/$msiName"

Assert-Version
Assert-CleanTree

Invoke-Step "Check GitHub CLI auth" $gh @("auth", "status")

if (-not $SkipVerification) {
    Invoke-Step "Audit dependencies" $Npm @("audit", "--audit-level=high")
    Invoke-Step "Build frontend" $Npm @("run", "build")
    Invoke-Step "Run unit tests" $Npm @("run", "test:unit")
    Invoke-Step "Build signed MSI and updater signature" "make" @("-f", "Makefile", "updater-build")
}

if (-not $DryRun) {
    if (-not (Test-Path -LiteralPath $msiPath)) {
        throw "MSI not found: $msiPath"
    }
    if (-not (Test-Path -LiteralPath $sigPath)) {
        throw "Updater signature not found: $sigPath"
    }
}

Invoke-Step "Generate latest.json" "make" @(
    "-f",
    "Makefile",
    "updater-json",
    "MSI_URL=$msiUrl",
    "SIG_FILE=$sigPath",
    "RELEASE_NOTES=$releaseTitle"
)

if (-not $DryRun) {
    Assert-NoUtf8Bom -Path $latestJsonPath
    Get-Content -LiteralPath $latestJsonPath -Raw | ConvertFrom-Json | Out-Null
}

$releaseBody = Read-ReleaseBody -Path $NotesFile
if ($DryRun) {
    Write-Host ""
    Write-Host "==> User-facing release body"
    Write-Host $releaseBody
} else {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $releaseNotesPath) | Out-Null
    Write-Utf8NoBomFile -Path $releaseNotesPath -Value $releaseBody
}

$localTagExists = $false
git rev-parse -q --verify "refs/tags/$Version" *> $null
if ($LASTEXITCODE -eq 0) {
    $localTagExists = $true
}

if (-not $localTagExists) {
    Invoke-Step "Create git tag $Version" "git" @("tag", $Version)
} else {
    Write-Host ""
    Write-Host "==> Git tag $Version already exists locally"
}

Invoke-Step "Push git tag $Version" "git" @("push", "origin", $Version)

$releaseArgs = @(
    "release",
    "create",
    $Version,
    $msiPath,
    $sigPath,
    $latestJsonPath,
    "--repo",
    $Repo,
    "--title",
    $releaseTitle,
    "--notes-file",
    $releaseNotesPath
)

if ($Draft) {
    $releaseArgs += "--draft"
}

if ($Prerelease) {
    $releaseArgs += "--prerelease"
}

Invoke-Step "Create GitHub release $Version" $gh $releaseArgs

Write-Host ""
Write-Host "Release automation complete for $Version."
