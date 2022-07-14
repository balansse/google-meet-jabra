<SPAN ALIGN="CENTER">

[![Google Meet - Jabra Call Control support](media/Logo-cropped.png)](https://github.com/balansse/google-meet-jabra)

## Adds Jabra call control support to [Google Meet](https://meet.google.com).
[![Chrome Extension Version](https://img.shields.io/chrome-web-store/v/jjnlhhhmaidobmeghnnmkbhkebpjhohp?label=version&logo=google-chrome&logoColor=fff)
![Chrome Extension Users](https://img.shields.io/chrome-web-store/users/jjnlhhhmaidobmeghnnmkbhkebpjhohp?&logo=google-chrome&logoColor=fff)
![Chrome Extension Rating](https://img.shields.io/chrome-web-store/stars/jjnlhhhmaidobmeghnnmkbhkebpjhohp?logo=google-chrome&logoColor=fff)](https://chrome.google.com/webstore/detail/google-meet-jabra-call-co/jjnlhhhmaidobmeghnnmkbhkebpjhohp) 

</SPAN>

## Overview

Main features:
- Auto busy light on during meetings
- Sync device mute status with Google Meet mute button
- Mute Google Meet from the device

Supports devices working through Jabra Link dongle or USB; controlling devices connected directly to Bluetooth is not yet supported.

**IMPORTANT NOTE**: You'll need to provide HID permissions to allow the extension to work with your Jabra device. Please click on the extension icon while being on the Google Meet page to connect.

Tested with |
--- |
Jabra Evolve2 85 / Jabra Link 380
Jabra Evolve2 75 / Jabra Link 380
Jabra Elite 85h / Jabra Link 370
Jabra Evolve 40
Jabra Evolve2 30
Jabra Speak 510
Jabra Speak 750
Jabra Engage 75
...


Please feel free to submit issues and suggestions to 
https://github.com/balansse/google-meet-jabra/issues

## Installing and Running

### Procedures:

1. Check if your [Node.js](https://nodejs.org/) version is >= **14**.
2. Clone this repository.
3. Run `npm install` to install the dependencies.
4. Run `npm start`
5. Load your extension on Chrome following:
   1. Access `chrome://extensions/`
   2. Check `Developer mode`
   3. Click on `Load unpacked extension`
   4. Select the `build` folder.
