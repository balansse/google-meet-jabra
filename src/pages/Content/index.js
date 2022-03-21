const MIC_OFF = {
    de: "Mikrofon deaktivieren",
    en: "Turn off microphone",
    ja: "マイクをオフにする",
};

const MIC_ON = {
    de: "Mikrofon aktivieren",
    en: "Turn on microphone",
    ja: "マイクをオンにする",
};

const END_CALL = {
    en: "Leave call"
}

const START_CALL = {
    en: "Join now"
}

const currentLanguage = () => document.documentElement.lang;
const oldButtonSelector = (tip) => `[data-tooltip*='${tip}']`;
const buttonSelector = (tip) => `[aria-label*='${tip}']`;

const micOffButtonSelector = () =>
    [
        "[data-is-muted=false][aria-label*='+ d']",
        "[data-is-muted=false][data-tooltip*='+ d']",
        buttonSelector(MIC_OFF[currentLanguage()]),
        oldButtonSelector(MIC_OFF[currentLanguage()]),
    ].join(",");
const micOffButton = () => document.querySelector(micOffButtonSelector());

const micOnButtonSelector = () =>
    [
        "[data-is-muted=true][aria-label*='+ d']",
        "[data-is-muted=true][data-tooltip*='+ d']",
        buttonSelector(MIC_ON[currentLanguage()]),
        oldButtonSelector(MIC_ON[currentLanguage()]),
    ].join(",");
const micOnButton = () => document.querySelector(micOnButtonSelector());

const endCallSelector = () =>
    [
        buttonSelector(END_CALL[currentLanguage()]),
        oldButtonSelector(END_CALL[currentLanguage()]),
    ].join(",");
const endCallButton = () => document.querySelector(endCallSelector());

const startCallButton = () => Array.from(document.querySelectorAll('span')).find(el => el.textContent === START_CALL[currentLanguage()]);

const avButtonSpan = () => Array.from(document.querySelectorAll('i.google-material-icons')).find(el => el.textContent === "inventory")?.closest('[role="row"]');

var jabraDevice;
let jabraButton = { span: null, button: null, label: null };

(async () => {
    const jabraApi = await jabra.init({
        transport: jabra.RequestedBrowserTransport.WEB_HID,
        partnerKey: "fafd-0b91d5be-f026-4198-b8b4-42685884d7ca",
        appId: "chrome-google-meet",
        appName: "Google Meet Chrome extension",
    });

    if (avButtonSpan() !== undefined) {
        jabraButton.span = avButtonSpan().cloneNode(true);
        jabraButton.button = jabraButton.span.querySelector('button');
        ['jscontroller', 'jsaction', 'jsname'].forEach(attribute => jabraButton.button.removeAttribute(attribute));
        Array.from(jabraButton.span.querySelectorAll('i.google-material-icons')).find(el => el.textContent === "inventory").innerText = "headset_mic";
        jabraButton.button.onclick = async (e) => {
            await jabra.webHidPairing();
        };

        jabraButton.label = jabraButton.button.lastElementChild;
        jabraButton.label.innerText = "Connecting to Jabra device...";

        avButtonSpan().closest('div').append(jabraButton.span);
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
                switch (signal.type) {
                    case jabra.SignalType.PHONE_MUTE:
                        var button = micOffButton() || micOnButton();
                        button?.click();
                        break;

                    case jabra.SignalType.HOOK_SWITCH:
                        var button = signal.value ? startCallButton() : endCallButton();
                        button?.click();
                        break;
                }
            }
        );

        for (const a of document.querySelectorAll('i.google-material-icons')) {
            if (a.textContent.includes("call_end")) {
                jabraDevice?.offHook(true);
            }
        }
    });

    const callStartObserver = new MutationObserver((changes) => {
        for (const change of changes) {
            if (change.target.classList.contains('google-material-icons')) {
                for (const node of change.addedNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.data === 'call_end') {
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

            for (const node of change.addedNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.data === 'You left the meeting') {
                    jabraDevice?.offHook(false);
                    return;
                }
            }

        }
    });
    callEndObserver.observe(document.body, {
        subtree: true,
        childList: true,
    });

    const muteObserver = new MutationObserver((changes) => {
        for (const change of changes) {

            if (change.target === micOffButton() || micOnButton() && change.attributeName === "data-is-muted") {
                jabraDevice?.mute(change.target.dataset.isMuted === 'true');
                return;
            }
        }
    });
    muteObserver.observe(document.body, {
        attributes: true,
        subtree: true,
    });

    window.addEventListener("beforeunload", function () {
        jabraDevice?.offHook(false);
        jabraDevice?.releaseCallLock();
    });

})();