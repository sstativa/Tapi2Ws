function getMyExtension() {
  chrome.runtime.sendMessage({ subject: 'getMyExtension' }, (response) => {
    console.log(response);

    document.getElementById('my-extension').innerText = response.myExtension || 'Unauthorised';
  });
}

const isTrue = key => localStorage[key] === 'true';

const showNotifications = document.getElementById('show-notifications');
const dismissInternal = document.getElementById('dismiss-internal');
const dismissExternal = document.getElementById('dismiss-external');

showNotifications.checked = !isTrue('disableNotifications');
dismissInternal.checked = isTrue('dismissInternal');
dismissExternal.checked = isTrue('dismissExternal');

showNotifications.addEventListener('change', (event) => {
  localStorage.disableNotifications = event.target.checked ? 'false' : 'true';
});

dismissInternal.addEventListener('change', (event) => {
  localStorage.dismissInternal = event.target.checked ? 'true' : 'false';
});

dismissExternal.addEventListener('change', (event) => {
  localStorage.dismissExternal = event.target.checked ? 'true' : 'false';
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mdc-switch').forEach((e) => {
    if (e.querySelector('input').checked) {
      e.classList.add('mdc-switch--checked');
    }
  });

  setTimeout(() => {
    document.querySelectorAll('.mdc-switch').forEach((e) => {
      new mdc.switch.MDCSwitch(e);
    });
  }, 0);

  getMyExtension();
});
