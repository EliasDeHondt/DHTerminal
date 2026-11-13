!macro customCheckAppRunning
  DetailPrint "Closing DHTerminal before the update..."
  nsExec::Exec 'taskkill /IM "DHTerminal.exe" /T'
  Sleep 1500
  nsExec::Exec 'taskkill /F /IM "DHTerminal.exe" /T'
  Sleep 800
!macroend

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
