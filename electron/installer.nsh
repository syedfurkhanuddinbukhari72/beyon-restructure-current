; Custom NSIS Installer Script for Beyon Admin

; Modern UI
!include "MUI2.nsh"
!include "FileFunc.nsh"

; General
Name "Beyon Admin"
OutFile "..\dist\installer\BeyonAdminSetup.exe"
InstallDir "$PROGRAMFILES\Beyon Admin"
InstallDirRegKey HKCU "Software\Beyon Admin" ""

; Request application privileges
RequestExecutionLevel user

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\win.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\win.bmp"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer sections
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  
  ; Add your files here
  File /r "..\dist\win-unpacked\*.*"
  
  ; Create start menu shortcuts
  CreateDirectory "$SMPROGRAMS\Beyon Admin"
  CreateShortCut "$SMPROGRAMS\Beyon Admin\Beyon Admin.lnk" "$INSTDIR\Beyon Admin.exe"
  CreateShortCut "$SMPROGRAMS\Beyon Admin\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BeyonAdmin" \
                 "DisplayName" "Beyon Admin"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BeyonAdmin" \
                 "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BeyonAdmin" \
                 "DisplayIcon" "$\"$INSTDIR\Beyon Admin.exe$\""
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BeyonAdmin" \
                 "Publisher" "Beyon"
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BeyonAdmin" \
                 "EstimatedSize" "$0"
SectionEnd

; Uninstaller section
Section "Uninstall"
  ; Remove files and directories
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\Beyon Admin\Beyon Admin.lnk"
  Delete "$SMPROGRAMS\Beyon Admin\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Beyon Admin"
  
  ; Remove registry keys
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BeyonAdmin"
  DeleteRegKey /ifempty HKCU "Software\Beyon Admin"
SectionEnd
