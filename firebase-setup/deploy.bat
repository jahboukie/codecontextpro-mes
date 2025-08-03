@echo off
REM Firebase Functions Deployment Script for Windows
REM Bypasses Git Bash path issues

echo Deploying Firebase Functions to codecontextpro-mes...

REM Set minimal PATH to avoid Git Bash conflicts
set PATH=C:\Program Files\nodejs;C:\Users\scorp\AppData\Roaming\npm;C:\Windows\system32;C:\Windows

REM Change to firebase-setup directory
cd /d "C:\Users\scorp\dbil\codecontextpro-mes\firebase-setup"

REM Deploy functions
firebase deploy --only functions

echo Deployment complete!
pause