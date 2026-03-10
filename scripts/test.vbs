Set script = CreateObject("MSScriptControl.ScriptControl")
script.Language = "JScript"
code = CreateObject("Scripting.FileSystemObject").OpenTextFile("c:\Users\Xande\Documents\System\scripts\centro_detalhe.js", 1).ReadAll()
On Error Resume Next
script.Eval code
If Err.Number <> 0 Then WScript.Echo "Error: "& Err.Description &' no char '& Err.Source End If
