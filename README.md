<SPAN ALIGN="CENTER">

[![Google Meet - Jabra Call Control support](media/Logo-cropped.png)](https://github.com/balansse/google-meet-jabra)

## Adds Jabra call control support to [Google Meet](https://meet.google.com).
   
[![Chrome Web Store](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/google-meet-jabra-call-co/jjnlhhhmaidobmeghnnmkbhkebpjhohp) 

</SPAN>

## Overview

Main features:
- Auto busy light on during meetings
- Sync device mute status with Google Meet mute button
- Mute Google Meet from the device

Supports devices working through Jabra Link dongle; controlling devices connected directly to Bluetooth are not yet supported.

Tested with Jabra Evolve2 85 and Jabra Link 380. 

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
