const AVAYA_HOST = '192.168.0.221';
const AVAYA_PORT = 43001;
const CRM_HOST = 'EXAMPLE.ORG';
const CRM_ID = 'abc...';
const DISMISS_INTERNAL_SECONDS = 10;
const DISMISS_EXTERNAL_SECONDS = 60;

const GREEN = {
  path: {
    16: 'images/green32.png',
    32: 'images/green32.png',
    48: 'images/green96.png',
    96: 'images/green96.png',
    128: 'images/green128.png',
  },
};

const RED = {
  path: {
    16: 'images/red32.png',
    32: 'images/red32.png',
    48: 'images/red96.png',
    96: 'images/red96.png',
    128: 'images/red128.png',
  },
};

let connection = null;
let myExtension = null;
let statusOk = false;
let notifications = []; // our own notifications list

const isTrue = key => localStorage[key] === 'true';
const connectionReady = () => connection && connection.readyState === 1;
const now = () => (new Date()).toLocaleTimeString('en-AU', { hour12: false }).substr(0, 5);

function debug(...args) {
  if (isTrue('debug')) {
    console.log(...args);
  }
}

function loop(func, seconds) {
  (function f() {
    func();
    setTimeout(f, 1000 * seconds);
  }());
}

function fetchTimeout(url, options) {
  const { timeout, ...rest } = options;

  return new Promise((resolve) => {
    setTimeout(resolve, 1000 * timeout);

    fetch(url, rest)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        return response.json();
      })
      .then(resolve)
      .catch((error) => {
        debug(error);

        resolve();
      });
  });
}

function getMyExtension() {
  const options = {
    timeout: 10, // 10 seconds
  };

  // it the user logged in to CRM this call will return extension number assigned to the user
  return fetchTimeout(`https://${CRM_HOST}/api/v1/widget/my-extension`, options)
    .then((data) => {
      myExtension = (data && data.extension) || null;

      return myExtension;
    });
}

function lookUpNumber(number) {
  const options = {
    timeout: 2, // 2 seconds
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number }),
  };

  // this call will return a contact card assigned to the number if it exists
  return fetchTimeout(`https://${CRM_HOST}/api/v1/widget/look-up-number`, options).then(data => data || {});
}

function checkMyExtension() {
  getMyExtension();
}

function formatNumber(number) {
  if (number.length !== 10) {
    return number;
  }

  return number.startsWith('04')
    ? `${number.substr(0, 4)} ${number.substr(4, 3)} ${number.substr(7, 3)}`
    : `${number.substr(0, 2)} ${number.substr(2, 4)} ${number.substr(6, 4)}`;
}

function dial(number) {
  if (number && myExtension && connectionReady()) {
    connection.send(JSON.stringify({ cmd: 'dial', line: myExtension, number }));
  }
}

function dismissNotification(notificationId, seconds) {
  setTimeout(() => chrome.notifications.clear(notificationId), 1000 * seconds);
}

function createOutboundNotification(call) {
  const { calledId } = call;

  lookUpNumber(calledId).then((data) => {
    debug(data);

    if (data.fullName) {
      chrome.notifications.create('OUTBOUND', {
        type: 'basic',
        title: data.fullName,
        message: data.company ? `${now()} | ${data.company}` : now(),
        contextMessage: formatNumber(calledId),
        iconUrl: data.iconUrl || 'images/outbound192.png',
        requireInteraction: true,
        buttons: [
          { title: 'Hang up' },
        ],
      }, (createdId) => {
        notifications.push({
          notificationId: createdId,
          expireAt: Date.now() - (3600 * 1000), // 1 hours in milliseconds
        });
      });
    }
  });
}

function createInternalNotification(call) {
  const { callId, callerId } = call;

  lookUpNumber(callerId).then((data) => {
    debug(data);

    if (data.fullName) {
      chrome.notifications.create(callId, {
        type: 'basic',
        title: data.fullName,
        message: now(),
        contextMessage: callerId,
        iconUrl: data.iconUrl || 'images/internal192.png',
        requireInteraction: true,
      }, (createdId) => {
        notifications.push({
          notificationId: createdId,
          expireAt: Date.now() - (24 * 3600 * 1000), // 24 hours in milliseconds
        });
      });
    } else {
      chrome.notifications.create(callId, {
        type: 'basic',
        title: callerId,
        message: now(),
        iconUrl: data.iconUrl || 'images/internal192.png',
        requireInteraction: true,
      }, (createdId) => {
        notifications.push({
          notificationId: createdId,
          expireAt: Date.now() - (24 * 3600 * 1000), // 24 hours in milliseconds
        });
      });
    }

    if (isTrue('dismissInternal')) {
      dismissNotification(callId, DISMISS_INTERNAL_SECONDS);
    }
  });
}

function createPrivateNotification(call) {
  const { callId } = call;

  chrome.notifications.create(callId, {
    type: 'basic',
    title: 'Private Number',
    message: now(),
    iconUrl: 'images/private192.png',
    requireInteraction: true,
  }, (createdId) => {
    notifications.push({
      notificationId: createdId,
      expireAt: Date.now() - (24 * 3600 * 1000), // 24 hours in milliseconds
    });
  });

  if (isTrue('dismissExternal')) {
    dismissNotification(callId, DISMISS_EXTERNAL_SECONDS);
  }
}

function createIncomingNotification(call) {
  const { callId, callerId } = call;

  lookUpNumber(callerId).then((data) => {
    debug(data);

    if (data.fullName) {
      const options = {
        type: 'basic',
        title: data.fullName,
        message: data.company ? `${now()} | ${data.company}` : now(),
        contextMessage: formatNumber(callerId),
        iconUrl: data.iconUrl || [
          'images/other192.png',
          'images/client192.png',
          'images/contractor192.png',
        ][data.role], // data.role should be 0, 1 or 2
        requireInteraction: true,
      };

      chrome.notifications.create(callId, options, (createdId) => {
        notifications.push({
          notificationId: createdId,
          callerId,
          expireAt: Date.now() + (24 * 3600 * 1000), // 24 hours in milliseconds
        });
      });
    } else {
      chrome.notifications.create(callId, {
        type: 'basic',
        title: formatNumber(callerId),
        message: now(),
        iconUrl: 'images/unknown192.png',
        requireInteraction: true,
      }, (createdId) => {
        notifications.push({
          notificationId: createdId,
          expireAt: Date.now() - (24 * 3600 * 1000), // 24 hours in milliseconds
        });
      });
    }

    if (isTrue('dismissExternal')) {
      dismissNotification(callId, DISMISS_EXTERNAL_SECONDS);
    }
  });
}

function processCall(call) {
  debug(call);

  if (isTrue('disableNotifications')) {
    return; // exit right away
  }

  if (call.callerId.length === 11 && call.callerId.startsWith('00')) {
    call.callerId = call.callerId.substr(1);
  }

  const {
    state,
    callerId,
    calledId,
    origin,
    reason,
  } = call;

  if (state === 'DIALING' && origin === 'OUTBOUND') {
    chrome.notifications.clear('OUTBOUND');

    if (calledId.length > 3) {
      createOutboundNotification(call);
    }
  } else if (state === 'PROCEEDING' && origin === 'OUTBOUND') {
    if (calledId.length > 3) {
      // create a notification if only it was not created on "DIALING" state
      chrome.notifications.getAll((all) => {
        if (!all['OUTBOUND']) {
          createOutboundNotification(call);
        }
      });
    }
  } else if (state === 'IDLE' && origin === 'OUTBOUND') {
    chrome.notifications.clear('OUTBOUND');
  } else if (state === 'OFFERING' && origin === 'INTERNAL') {
    createInternalNotification(call);
  } else if ((state === 'OFFERING' || (state === 'CONNECTED' && reason === 'UNPARK')) && origin === 'EXTERNAL') {
    // external incoming calls or unparked external incoming call
    if (!callerId) {
      createPrivateNotification(call);
    } else {
      createIncomingNotification(call);
    }
  }
}

function setStatus(status) {
  statusOk = status;

  if (statusOk) {
    chrome.browserAction.setIcon(GREEN);
  } else {
    chrome.browserAction.setIcon(RED);
  }
}

function checkStatus() {
  if (statusOk !== (myExtension && connectionReady())) {
    setStatus(myExtension && connectionReady());
  }
}

function checkConnection() {
  if (!connectionReady()) {
    connection = new WebSocket(`ws://${AVAYA_HOST}:${AVAYA_PORT}`);

    connection.onerror = error => debug('Error:', error);

    connection.onclose = event => debug('Connetion closed:', event);

    connection.onmessage = (event) => {
      if (myExtension) {
        const data = JSON.parse(event.data);

        if (data && data.line && data.line === myExtension) {
          processCall(data);
        }
      }
    };

    setTimeout(() => {
      if (!connectionReady()) {
        if (connection && connection.close) {
          connection.close();
        }
      }
    }, 1000 * 5); // run after 5 seconds
  } else {
    connection.send('{}'); // heartbeat
  }
}

// delete old notifications
function cleanUp() {
  // javascript "porn" (if expireAt > Date.now() then we keep the notification otherwise we remove it)
  notifications = notifications.filter(n => n.expireAt > Date.now() || chrome.notifications.clear(n.notificationId));
}

loop(checkConnection, 10); // every 10 seconds
loop(checkMyExtension, 60 * 5); // every 5 minutes
loop(checkStatus, 1); // every second
loop(cleanUp, 3600); // every hour

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug(message);

  if (message.subject === 'getMyExtension') {
    getMyExtension().then(() => sendResponse({ myExtension }));
  }

  return true; // DO NOT DELETE
});

// do not delete sender or sendResponse
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  debug(message);

  if (message.subject === 'dial') {
    let { number } = message;

    // clean up the number
    // this is for Australia, all +61xxxxxxxxx numbers are converted to 0xxxxxxxxx
    number = number.replace(/[^0-9]/g, '');

    if (number.length === 11 && number.startsWith('61')) {
      number = `0${number.substr(2)}`;
    }

    if (myExtension) {
      dial(number);
    } else {
      getMyExtension().then(() => dial(number));
    }
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  const notification = notifications.find(n => n.notificationId === notificationId);

  if (notification && notification.callerId) {
    chrome.runtime.sendMessage(CRM_ID, { msg_id: notification.callerId });
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    const notification = notifications.find(n => n.notificationId === notificationId);

    if (notification && myExtension && connectionReady()) {
      connection.send(JSON.stringify({ cmd: 'drop', line: myExtension }));
    }
  }
});
