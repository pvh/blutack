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
base64 encoding in WebStreamLogic.ts
Titlebar
  openDoc / onContent <- what are these even?
encryption stuff! -> secretKey on workspace is a good entry
importClip && the webclipper!
import 'line-awesome/css/line-awesome.min.css'
useHyperfileHeader
OmniboxWorkspaceListMenu -> InvitationsView { getDoc }
review all the File types a

HyperFiles
 -> replace the existing hyperfile stuff with a service worker implementation
 -> find the places we reference hyperfiles (now FileIds) and call a function to make them useful URLs
 -> find the various import & ingestion places and fix those too

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
workspace initialization <- calling create manually
dark mode!
OmniboxWorkspaceListMenu v. complicated and old

