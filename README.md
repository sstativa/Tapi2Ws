# Tapi2Ws

Tapi2Ws broadcasts all TAPI (Telephony API) events to all connected WebSockets clients.

Created for integration with Avaya IP Office 5.x but should work with other phone system having TAPI driver.

    Note: There is no access control. All events are broadcasted to all active WS clients. Event filtering and processing have to be done on the client's side.

## Install and run
1. Copy `Tapi2Ws.exe` to the server having installed and configured TAPI driver.
2. Run `Tapi2Ws.exe`.

## JavaScript integration

WebSocket Server port is `43001` and it is hardcoded.

### Connect to Tapi2Ws
```js
// suppose my extension is 201
myExtension = 201;

const connection = new WebSocket(`ws://${AVAYA_HOST}:43001`);

connection.onerror = error => console.log('Error:', error);

connection.onclose = event => console.log('Connetion closed:', event);

connection.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // if data.line equals myExtension then this is event coming for me
  if (data && data.line && data.line === myExtension) {
    processEvent(data);
  }
};
```

### Process event
```js
function processEvent(call) {       
  console.log(call);

  const {
    callId,    // callID, works for Avaya, might not work for other phone systems
    state,     // IDLE, CONNECTED, OFFERING, etc
    callerId,  
    calledId,
    origin,    // INTERNAL, EXTERNAL
    reason,    // ex. UNPARK
  } = call;
}
```

### Dial a number
```js
function dial(number) {
  if (number && myExtension && connection && connection.readyState === 1) {
    connection.send(JSON.stringify({ cmd: 'dial', line: myExtension, number: number }));
  }
}
```

### Drop the line
```js
function drop() {
  if (myExtension && connection && connection.readyState === 1) {
    connection.send(JSON.stringify({ cmd: 'drop', line: myExtension }));
  }
}
```

## Alternatives
1. [Prostie Zvnonki](https://github.com/vedisoft/js-sdk)
2. [Rander](http://randersoft.com/en/) (Note: Does not work well with Avaya IP Office, the app crashes on incoming call from a hidden number).
 