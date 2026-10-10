Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir
WshShell.Run chr(34) & strDir & "\PerMAK_Windows_App.bat" & chr(34), 0, False
Set WshShell = Nothing
