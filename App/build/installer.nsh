; Updates without questions or errors: a running DHTerminal is closed first, so the installer can
; replace its files. Your settings live in %APPDATA%\DHTerminal and stay untouched.
!macro customCheckAppRunning
  DetailPrint "Closing DHTerminal before the update..."
  nsExec::Exec 'taskkill /IM "DHTerminal.exe" /T'
  Sleep 1500
  nsExec::Exec 'taskkill /F /IM "DHTerminal.exe" /T'
  Sleep 800
!macroend

; "Open in DHTerminal" when you right-click a folder or the empty space inside a folder in Explorer
!macro customInstall
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\DHTerminal" "" "Open in DHTerminal"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\DHTerminal" "Icon" '"$INSTDIR\DHTerminal.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\DHTerminal\command" "" '"$INSTDIR\DHTerminal.exe" --cwd "%V"'
  WriteRegStr HKCU "Software\Classes\Directory\shell\DHTerminal" "" "Open in DHTerminal"
  WriteRegStr HKCU "Software\Classes\Directory\shell\DHTerminal" "Icon" '"$INSTDIR\DHTerminal.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\shell\DHTerminal\command" "" '"$INSTDIR\DHTerminal.exe" --cwd "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\DHTerminal"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\DHTerminal"
!macroend
