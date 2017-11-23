# Mongoose OS ESP8266 PIR monitor with power saving using deep sleep and RTC memory

## Overview
This is a basic MOS project with init.js that send MQTT message from motion event detected by PIR.  Further power saving is achieved by not enabling wifi until PIR activated.  Without wifi, only 15ma is used for a few seconds before it's back to sleep again.

To enable maximum power saving, after wifi setup, disable both server and station mode as follow:
```
mos config-set wifi.sta.enable=false wifi.ap.enable=false
```

This application also send out heart beat signal after a preset cycles of deep sleep.

See [quick start guide](https://mongoose-os.com/docs/quickstart/setup.html)
on how to build and flash the firmware.
Examples build:
```
git clone https://github.com/Tommystus/pirMon.git
mos build --arch esp8266
mos flash
mos config-set pir.devName=<my device name> pir.dsTimeout=<seconds> pir.hbCycle=12
```
Set hbCycle to zero to disable heart beat mqtt message.  Maximum deep sleep timeout is about 50 minutes (? need to check).

To enable wifi, hard set PIR signal to active.  This will prevent application from going to sleep and enable wifi to allow for script or configuration update remotely.

Here is the circuit for this application:
![PIR sleep interrupt](https://github.com/Tommystus/PIR-Monitor/raw/master/ESP8266%20PIR%20Sleep%20Interrupt%20Circuit.png)

With the circuit above, please make sure PIR signal is grounded before starting flash.  Accidental PIR signal will trigger reset and stop flash.

## Current issue:
If PIR is close or next to ESP8266, signal interference from the controler may cause false trigger on the PIR sensor.  I've been able to get around this by using aluminum foil as shielding material around PIR module.

