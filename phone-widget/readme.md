# Chrome extension
Example of integration of Tapi2Ws with internal CRM:
- Creates notification cards on incoming calls.
- Sends a request to another chrome extension if the user clicks on the notification card.
- Listens for call request from another chrome extension and dial the number.

It was made primarily for macOS ecosystem because macOS native notifications support `onClicked` events. For other operating systems the native Chrome notifications have to be used.

## Build
1. Edit `manifest.json` according to your needs.
2. Adjust API call to CRM in `background.js`

```
npm install
gulp build
```

## Requirements
Two API calls should be implemented in CRM:
1. To get user's extension number (check `getMyExtension` of `background.js`).  
Should return `{ extension: "XXX" }`.

2. To lookup for phone number (check `lookUpNumber` of `background.js`).  
Should return `{ fullName: "John Doe", company: "Lego", role: 0, iconUrl: "http://..." }`.
