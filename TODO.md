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
review all the File types
the react-contextmenu doesn't work in react 18 and is dead -> that's gonna be a project

HyperFiles
 -> replace the existing hyperfile stuff with a service worker implementation
 -> find the places we reference hyperfiles (now FileIds) and call a function to make them useful URLs
 -> find the various import & ingestion places and fix those too
"Module "path" has been externalized for browser compatibility. Cannot access "path.extname" in client code."

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
we had a custom ColorPicker but the exports changed. I just replaced it with GithubPicker
we had a Swatch used in the ContactEditor to show your color and it needs replacing
from alex: I notice that ContentTypes.create creates a new handle, ignoring the one passed in to createWorkSpace