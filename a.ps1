function Show-CsTree {
    param (
        [string]$Path = ".",
        [int]$Indent = 0
    )

    $hasCs = Get-ChildItem -Path $Path -Recurse -Filter *.cs -File -ErrorAction SilentlyContinue | Select-Object -First 1

    if (-not $hasCs) {
        return
    }

    $prefix = ("│   " * ($Indent - 1)) + ($(if ($Indent -gt 0) { "├── " } else { "" }))
    Write-Output "$prefix$(Split-Path $Path -Leaf)"

    Get-ChildItem -Path $Path -Directory | ForEach-Object {
        Show-CsTree -Path $_.FullName -Indent ($Indent + 1)
    }
}

Show-CsTree -Path .
