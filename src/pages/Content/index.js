import { init, SignalType, CallControlFactory, RequestedBrowserTransport, webHidPairing, ErrorType, LogLevel }  from '@gnaudio/jabra-js'

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

const micToggleButton = () => document.querySelector('button[aria-label*="+ d)"]');
const endCallButton = () => getElementByIconName('call_end')?.closest('button');
const startCallButton = () => Array.from(document.querySelectorAll('span')).find(el => el.textContent === START_CALL[currentLanguage()]);
    //Language-agnostic selectors for Start Call button
    //Array.from(document.querySelectorAll('i.google-material-icons')).find(el => el.textContent === "present_to_all")?.closest('div[role="button"]').previousElementSibling
    //document.querySelector('[data-is-prejoin]').parentElement.querySelector('[role="button"]')

var deviceCallControlList = [];

(async () => {

    chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
        if (request && request.type === 'consent') {
            var consent = document.createElement("div");
            consent.id = 'jabraConsentID';
            fetch(chrome.runtime.getURL('/hid_dialog.html'))
                .then(r => r.text())
                .then(html => {
                    consent.innerHTML = html;
                    
                    if (!document.body.classList.contains('modal-open')) {

                        let ulConnetedDevices = consent.querySelector('#ulJabraConnectedDevices');
                        if (deviceCallControlList.length > 0) {
                            ulConnetedDevices.innerHTML = '';
                            deviceCallControlList.forEach(deviceCallControl => {
                                ulConnetedDevices.innerHTML += '<li>' + deviceCallControl.device.name + '</li>';
                            });
                        }

                        document.body.appendChild(consent);
                        document.body.classList.add('modal-open');

                        document.getElementById('btnJabraDialogHIDRequest').onclick = async (e) => {
                            let connectedDevice = await webHidPairing();
                            if (connectedDevice) {
                                document.body.removeChild(consent);
                                document.body.classList.remove('modal-open');
                            }
                        };
            
                        document.getElementById('btnJabraDialogClose').onclick = (e) => {
                            document.body.removeChild(consent);
                            document.body.classList.remove('modal-open');
                        };
                    }
                });
        }
        sendResponse(true);
    });

    const jabraSdk = await init({
        transport: RequestedBrowserTransport.WEB_HID,
        partnerKey: JABRA_PARTNER_KEY,
        appId: JABRA_APP_ID,
        appName: JABRA_APP_NAME,
        logger: {
            write(logEvent) {
                if (logEvent.level === LogLevel.ERROR) {
                    console.log(logEvent.message, logEvent.layer);
                }
                // Ignore messages with other log levels
            }
        }
    });

    const callControlFactory = new CallControlFactory(jabraSdk);

    jabraSdk.deviceAdded.subscribe(async (device) => {

        //Ignore devices that do not support call control
        if (!callControlFactory.supportsCallControl(device)) {
            return;
        }
        
        const deviceCallControl = await callControlFactory.createCallControl(device);

        await addDeviceCallControl(deviceCallControl);
    });

    async function addDeviceCallControl(deviceCallControl) {
        //Try to get a call lock on the device, retry if failed, if retry limit reached do not connect
        const maxRetryCount = 5;
        let retryCount = 0
        let callLockStatus = false;
        while (!callLockStatus && retryCount < maxRetryCount) {
            callLockStatus = await deviceCallControl.takeCallLock();
            retryCount++;
        }
        if (!callLockStatus) return;

        deviceCallControl.deviceSignals.subscribe(
            (signal) => {
                switch (signal.type) {
                    case SignalType.PHONE_MUTE:
                        var button = micToggleButton();
                        button?.click();
                        break;
                    
                    case SignalType.HOOK_SWITCH:
                        var button = signal.value ? startCallButton() : endCallButton();
                        button?.click();
                        break;

                    case SignalType.GN_PSEUDO_HOOK_SWITCH:
                        startCallButton()?.click();
                        break;
                }
            }
        );

        deviceCallControl.onDisconnect.subscribe(async () => {
            let device = deviceCallControl.device;
            
            // Whenever the connection disconnects, see if there is another connection which
            // is capable of call control.
            if (!callControlFactory.supportsCallControl(device)) {
                removeDeviceCallControl(device);
                return;
            }

            // There is an available connection, create a new ICallControl
            deviceCallControl = await callControlFactory.createCallControl(device);

            // Restore the state of the device.
            await addDeviceCallControl(deviceCallControl);
        });

        //Set status if already in a call (Instant meeting)
        if (endCallButton()) {
            try {
                deviceCallControl.offHook(true);
            }
            catch (err) {
                console.error(err);
            }
        }

        deviceCallControlList.push(deviceCallControl);

        updateConnectedDevicesCount();
    }

    function removeDeviceCallControl(removedDevice) {
        let removedDeviceIndex = deviceCallControlList.findIndex(deviceCallControl => deviceCallControl.device.serialNumber === removedDevice.serialNumber)
        if (removedDeviceIndex !== -1)
            deviceCallControlList.splice(removedDeviceIndex, 1);

        updateConnectedDevicesCount();
    }

    function updateConnectedDevicesCount() {
        let connectedDevicesCountString = deviceCallControlList.length === 0 ? '' : deviceCallControlList.length.toString();
        chrome.runtime.sendMessage({badgeText: connectedDevicesCountString});
    }

    const callStartObserver = new MutationObserver(async (changes) => {
        for (const change of changes) {
            if (change.target.classList.contains('google-material-icons')) {
                for (const node of change.addedNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.data === 'call_end') {    
                        deviceCallControlList.forEach(async deviceCallControl => {
                            try {
                                deviceCallControl.offHook(true);
                            }
                            catch (err) {
                                console.error(err);
                            }
                        });
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

                            deviceCallControlList.forEach(async deviceCallControl => {
                                try {
                                    deviceCallControl.offHook(false);
                                }
                                catch (err) {
                                    console.error(err);
                                }
                            });

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

                deviceCallControlList.forEach(deviceCallControl => {
                    try {
                        deviceCallControl.mute(change.target.dataset.isMuted === 'true');
                    }
                    catch (err) {
                        console.error(err);
                    }
                });

                return;
            }
        }
    });
    muteObserver.observe(document.body, {
        attributes: true,
        subtree: true,
    });

    window.addEventListener('beforeunload', function () {
        deviceCallControlList.forEach(deviceCallControl => {
            try {
                deviceCallControl.offHook(false);
                deviceCallControl.releaseCallLock();
            }
            catch (err) {
                console.error(err);
            }
        });
    });

})();