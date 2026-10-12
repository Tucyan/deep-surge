param([switch]$Editor)
$ErrorActionPreference = 'Stop'
$godotCommand = Get-Command Godot_v4.7.2-stable_win64.exe -ErrorAction SilentlyContinue
if (-not $godotCommand) {
    $godotCommand = Get-Command godot -ErrorAction SilentlyContinue
}
if (-not $godotCommand) {
    throw '找不到 Godot。请通过 Godot 项目管理器导入本目录 project.godot。'
}
$launchArguments = @('--path', $PSScriptRoot)
if ($Editor) { $launchArguments += '--editor' }
& $godotCommand.Source @launchArguments
