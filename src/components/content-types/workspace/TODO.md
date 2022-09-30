TODO:
-----

next
---
creation of workspace with recursive doc creation
access to repo outside of hooks



Disabled stuff
---
Storage -- restore the localforage root thing
PresenceHooks
  useHeartbeat, useConnectionStatus, useDeviceOnlineStatus
D&D stuff
  importFileList, importPlainText, importFromText, DataUrl
Missing libraries
  Swatch, CustomPicker (react-color both)
base64 encoding in WebStreamLogic.ts
Titlebar
  openDoc / onContent <- what are these even?
encryption stuff! -> secretKey on workspace is a good entry
importClip && the webclipper!
import './ibm-plex.css'
import 'line-awesome/css/line-awesome.min.css'
useHyperfileHeader

To Replace
---
no clipboard library: gonna need a plan here
useSystem -> gonna need a new approach
hyperfiles -> use a serviceworker
pretty much all of workspace!

To improve
----
create() functions would benefit from better typing for DocHandle
weird stuff around getRepo/setRepo
workspace initialization <- calling create weirdly