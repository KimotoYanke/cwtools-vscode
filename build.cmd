@echo off
cls

SET BUILD_PACKAGES=BuildPackages

IF NOT EXIST "%BUILD_PACKAGES%\fake.exe" (
  dotnet tool install fake-cli ^
    --tool-path ./%BUILD_PACKAGES% ^
    --version 5.*
)

REM Un-Rem these after changing build scripts
IF EXIST ".fake"          (RMDIR /Q /S ".fake"         )
IF EXIST "build.fsx.lock" (DEL         "build.fsx.lock")

"%BUILD_PACKAGES%/fake.exe" run build.fsx --target %*

REM .paket\paket.exe restore
if errorlevel 1 (
  exit /b %errorlevel%
)

REM packages\build\FAKE\tools\FAKE.exe build.fsx %* --nocache