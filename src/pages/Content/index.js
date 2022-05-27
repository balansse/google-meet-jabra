const JABRA_PARTNER_KEY = 'fafd-0b91d5be-f026-4198-b8b4-42685884d7ca';
const JABRA_APP_ID = 'chrome-google-meet';
const JABRA_APP_NAME = 'Google Meet Chrome extension';

const JABRA_CONNECTING = 'Connecting to Jabra device...';
const JABRA_HID_CONNECTION_REQUEST = 'Click here to connect to Jabra device';
const JABRA_VENDOR_ID = 2830;

const START_CALL = {
    en: 'Join now'
}

const currentLanguage = () => document.documentElement.lang;

const getElementByIconName = (iconName, parentElement) => {
    parentElement = parentElement !== undefined ? parentElement : document;
    let element = Array.from(parentElement.querySelectorAll('i.google-material-icons')).find(el => el.textContent === iconName)
    return element;
}

const micToggleButton = () => document.querySelector('button [data-icon-type="4"]')?.closest('button');
const endCallButton = () => getElementByIconName('call_end')?.closest('button');
const startCallButton = () => Array.from(document.querySelectorAll('span')).find(el => el.textContent === START_CALL[currentLanguage()]);
    //Language-agnostic selectors for Start Call button
    //Array.from(document.querySelectorAll('i.google-material-icons')).find(el => el.textContent === "present_to_all")?.closest('div[role="button"]').previousElementSibling
    //document.querySelector('[data-is-prejoin]').parentElement.querySelector('[role="button"]')

const avButtonSpan = () => getElementByIconName('inventory')?.closest('[role="row"]');

var jabraDevice;
let jabraButton = { span: null, button: null, label: null };

(async () => {

    const jabraApi = await jabra.init({
        transport: jabra.RequestedBrowserTransport.WEB_HID,
        partnerKey: JABRA_PARTNER_KEY,
        appId: JABRA_APP_ID,
        appName: JABRA_APP_NAME,
        logger: {
            write(logEvent) {
              if (logEvent.level === 'error') {
                console.log(logEvent.message, logEvent.layer);
              }
              // Ignore messages with other log levels
            }
          }
    });

    let span = avButtonSpan();

    if (span !== undefined) {
        jabraButton.span = span.cloneNode(true);
        jabraButton.button = jabraButton.span.querySelector('button');
        ['jscontroller', 'jsaction', 'jsname'].forEach(attribute => jabraButton.button.removeAttribute(attribute));

        getElementByIconName('inventory', jabraButton.span).innerText = 'headset_mic';

        jabraButton.button.onclick = async (e) => {
            let connectedDevice = await jabra.webHidPairing();
            if (connectedDevice && jabraDevice == undefined) {
                jabraButton.label.innerText = JABRA_CONNECTING;
            }
        };

        let devices = await window.navigator.hid.getDevices();
        let jabraHID = devices.find(element => element.vendorId === JABRA_VENDOR_ID);

        jabraButton.label = jabraButton.button.lastElementChild;
        jabraButton.label.innerText = jabraHID ? JABRA_CONNECTING : JABRA_HID_CONNECTION_REQUEST;

        span.closest('div').append(jabraButton.span);
    }

    const callControlFactory = new jabra.CallControlFactory(jabraApi);

    jabraApi.deviceAdded.subscribe(async (device) => {
        if (!callControlFactory.supportsCallControl(device)) {
            return;
        }

        jabraDevice = await callControlFactory.createCallControl(device);

        await jabraDevice.takeCallLock();

        if (jabraButton.label !== null) jabraButton.label.innerText = device.name;

        jabraDevice.deviceSignals.subscribe(
            (signal) => {
                console.log(signal);
                switch (signal.type) {
                    case jabra.SignalType.PHONE_MUTE:
                        var button = micToggleButton();
                        button?.click();
                        break;
                    
                    case jabra.SignalType.HOOK_SWITCH:
                        var button = signal.value ? startCallButton() : endCallButton();
                        button?.click();
                        break;

                    case jabra.SignalType.GN_PSEUDO_HOOK_SWITCH:
                        startCallButton()?.click();
                        break;
                }
            }
        );

        //Instant meeting
        if (endCallButton()) {
            jabraDevice?.offHook(true);
        }
    });

    const callStartObserver = new MutationObserver(async (changes) => {
        for (const change of changes) {
            if (change.target.classList.contains('google-material-icons')) {
                for (const node of change.addedNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.data === 'call_end') {

                        if (!jabraDevice) {

                            let devices = await window.navigator.hid.getDevices();
                            let jabraHID = devices.find(element => element.vendorId === JABRA_VENDOR_ID);
                            if (!jabraHID) {
                                fetch(chrome.runtime.getURL('/hid_dialog.html'))
                                .then(r => r.text())
                                .then(html => {
                                    document.querySelector('c-wiz').insertAdjacentHTML('beforeend', html);
    
                                    document.querySelector('.jabra-hid-dialog .button').onclick = async (e) => {
                                        let connectedDevice = await jabra.webHidPairing();
                                        if (connectedDevice) {
                                            document.querySelector('.jabra-hid-dialog').remove();
                                        }
                                    };
    
                                    document.querySelector('.jabra-hid-dialog .button-close').onclick = async (e) => {
                                        document.querySelector('.jabra-hid-dialog').remove();
                                    };
                                });
                            }
                        }

                        jabraDevice?.offHook(true);
                            
                        return;
                    }
                }
            }
        }
    });
    callStartObserver.observe(document.body, {
        subtree: true,
        childList: true,
    });

    const callEndObserver = new MutationObserver((changes) => {
        for (const change of changes) {
            if (change.addedNodes.length > 0) {
                for (const node of change.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        let callEnded = node.querySelector('div[data-call-ended]')?.dataset.callEnded === 'true';
                        if (callEnded === true) {
                            jabraDevice?.offHook(false);
                            return;
                        }
                    }
                }
            }
        }
    });
    callEndObserver.observe(document.body, {
        childList: true, 
        subtree: true
    });

    const muteObserver = new MutationObserver((changes) => {
        for (const change of changes) {
            if (change.target === micToggleButton() && change.attributeName === 'data-is-muted') {
                jabraDevice?.mute(change.target.dataset.isMuted === 'true');
                return;
            }
        }
    });
    muteObserver.observe(document.body, {
        attributes: true,
        subtree: true,
    });

    window.addEventListener('beforeunload', function () {
        jabraDevice?.offHook(false);
        jabraDevice?.releaseCallLock();
    });

})();