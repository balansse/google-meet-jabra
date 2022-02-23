import {
  init,
  CallControlFactory,
  RequestedBrowserTransport,
  SignalType,
  webHidPairing
} from "@gnaudio/jabra-js";

var jabraDevice;

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

const offButtonSelector = () =>
  [
    "[data-is-muted=false][aria-label*='+ d']",
    "[data-is-muted=false][data-tooltip*='+ d']",
    buttonSelector(MIC_OFF[currentLanguage()]),
    oldButtonSelector(MIC_OFF[currentLanguage()]),
  ].join(",");
const offButton = () => document.querySelector(offButtonSelector());

const onButtonSelector = () =>
  [
    "[data-is-muted=true][aria-label*='+ d']",
    "[data-is-muted=true][data-tooltip*='+ d']",
    buttonSelector(MIC_ON[currentLanguage()]),
    oldButtonSelector(MIC_ON[currentLanguage()]),
  ].join(",");
const onButton = () => document.querySelector(onButtonSelector());

const endCallSelector = () =>
  [
    buttonSelector(END_CALL[currentLanguage()]),
    oldButtonSelector(END_CALL[currentLanguage()]),
  ].join(",");
const endCallButton = () => document.querySelector(endCallSelector());

const startCallButton = () => Array.from(document.querySelectorAll('span')).find(el => el.textContent === START_CALL[currentLanguage()]);

(async () => {
  const jabraApi = await init({
    transport: RequestedBrowserTransport.WEB_HID
  });

  let avButtonSpan = Array.from(document.querySelectorAll('i.google-material-icons')).find(el => el.textContent === "inventory").closest('[role="row"]');
  let jabraButtonSpan = avButtonSpan.cloneNode(true);

  let jabraButton = jabraButtonSpan.querySelector('button');
  jabraButton.removeAttribute("jscontroller");
  jabraButton.removeAttribute("jsaction");
  jabraButton.removeAttribute("jsname");
  Array.from(jabraButtonSpan.querySelectorAll('i.google-material-icons')).find(el => el.textContent === "inventory").innerText = "headset_mic";

  let jabraButtonLabel = jabraButton.lastElementChild;
  jabraButtonLabel.innerText = "Connecting to Jabra device...";
  jabraButton.onclick = async (e) => {
    await webHidPairing();
  };

  avButtonSpan.closest('div').append(jabraButtonSpan);

  try {

    const callControlFactory = new CallControlFactory(jabraApi);

    jabraApi.deviceAdded.subscribe(async (device) => {
      if (!callControlFactory.supportsCallControl(device)) {
        return;
      }

      jabraButtonLabel.innerText = device.name;

      const deviceCallControl = await callControlFactory.createCallControl(
        device
      );

      if (await deviceCallControl.takeCallLock()) {
        jabraDevice = deviceCallControl;
      }

      deviceCallControl.deviceSignals.subscribe(
        (signal) => {

          switch (signal.type) {
            case SignalType.PHONE_MUTE:
              var button = offButton() || onButton();
              button?.click();
              break;

            case SignalType.HOOK_SWITCH:
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
  } catch (err) {
    console.log(err.message);
  }

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
      if (change.attributeName === "data-is-muted" && change.target.dataset.isMuted === "true") {
        console.log("Muted");
        jabraDevice?.mute(true);
        return;
      }
      else if (change.attributeName === "data-is-muted" && change.target.dataset.isMuted === "false") {
        console.log("Unmuted");
        jabraDevice?.mute(false);
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
  });

})();