load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_timer.js');
load('api_rpc.js');
load("api_config.js");
load('api_esp8266.js');

let getResetReason = ffi('int getResetReason(void)');
let doWifiConnect = ffi('int doWifiConnect(void)');
let rtcRdInt = ffi('int readRtcInt(int)');
let rtcWrInt = ffi('int writeRtcInt(int, int)');
let memIdx = 60;

// from user_interface.h (expressif)
// enum rst_reason {
//	REASON_DEFAULT_RST		= 0,	/* normal startup by power on */
//	REASON_WDT_RST			= 1,	/* hardware watch dog reset */
//	REASON_EXCEPTION_RST	= 2,	/* exception reset, GPIO status won’t change */
//	REASON_SOFT_WDT_RST   	= 3,	/* software watch dog reset, GPIO status won’t change */
//	REASON_SOFT_RESTART 	= 4,	/* software restart ,system_restart , GPIO status won’t change */
//	REASON_DEEP_SLEEP_AWAKE	= 5,	/* wake up from deep-sleep */
//	REASON_EXT_SYS_RST      = 6		/* external system reset */
//};


// GPIO15 => D8 
let pirPin = 4;		// GPIO4 => D2
let ledPin = 2;		// GPIO2 => D4 		Blue LED

//let btnPin = 0;		// GPIO0 => D3 builtin button (flash)

//GPIO.set_mode(pirPin, GPIO.MODE_INPUT);
let pirLevel = GPIO.read(pirPin);
let heartBeat = 0;

// check pwr on condition
let rsCode = getResetReason();
if ((rsCode === 6) || (rsCode === 5)) {
	rsCode = 0;
} else {
	rsCode = 10;
	pirLevel = 0;	// ignore PIR at pwr on reset
	rtcWrInt( memIdx, 15);
}

if (!pirLevel) {
	let hbCycle = Cfg.get('pir.hbCycle');
	if (hbCycle) {
		// check heartBeat counter stored in RTC Memory
		let rc = rtcRdInt(memIdx);
		// at 12 cycle and 5 min sleep, counter reset every 12*5 = 60min
		// also reset random value at pwr on
		if ((rc < 0) || (rc > hbCycle)) {
			if ((rc > 0) && (rc < hbCycle + 2)) {
				heartBeat = 1;
			}
			rc = 0;
		} else {
			rc++;
			// save count in RTC memory 
			rtcWrInt( memIdx, rc);
		}
		print( "**heartBeat rc:", JSON.stringify(rc));
	}
}

GPIO.set_mode(ledPin, GPIO.MODE_OUTPUT);

print( "**pirLevel:", JSON.stringify(pirLevel));

let netReady = 0;
// see app_mqtt.js for event code
let mqttReady = false;
MQTT.setEventHandler(function(conn, ev, edata) {
  if (ev !== 0) {
	  if (ev === MQTT.EV_CLOSE) {
		  mqttReady = false;
	  } else if (ev === MQTT.EV_CONNACK) {
		  mqttReady = true;
	  }
	  // 203 = EV_PUBLISH
	  print('**MQTT ev:', ev, ((mqttReady) ? "ready" : "wait"));
  }
}, null);


if ((pirLevel) || (heartBeat)) {
	if (Cfg.get('wifi.sta.enable')) {
		print("**Wifi enabled");
	} else {
		print("**Turn on Wifi");
		Cfg.set({wifi: {sta: {enable: true}}}, false);
		doWifiConnect();
	}
}

let dsTimeout = Cfg.get('pir.dsTimeout') * 1E6;
let mqttPubCnt = 0;
Timer.set( 1000, true, function() {
	// wait for PIR warm-up at pwr on
	if (rsCode) {
		GPIO.write(ledPin,0);
		print("**rsCode", JSON.stringify(rsCode));
		rsCode--;
		GPIO.write(ledPin,1);
		return;
	}

	if ((pirLevel) || (heartBeat)) {
		GPIO.write(ledPin,0);
		if (pirLevel) print("**pir ON");
		if (heartBeat) print("**heartBeat");
		if (mqttReady) {
			if (mqttPubCnt < 1) {
				let devName = Cfg.get('pir.devName');
				// only pub once
				let topic = 'PIR/' + devName + '/' + ((heartBeat) ? 'heartBeat' : 'trig');
				let msg = JSON.stringify({'Device' : devName});
				let ok = MQTT.pub(topic, msg);
				print('**Published: ok=', JSON.stringify(ok), ' topic:', topic, 'msg:', msg);
				if (ok) {
					mqttPubCnt++;
					heartBeat = 0;
					rtcWrInt( memIdx, 0);
				}
			} else {
				pirLevel = GPIO.read(pirPin);	// wait for PIR turn off
			}
		}
	} else {
		// go to sleep if PIR is off
		GPIO.write(ledPin,1);
		print('** PIR off deep sleep', + JSON.stringify(dsTimeout));
		ESP8266.deepSleep(dsTimeout);
	}
}, null);


// Monitor network connectivity.
Net.setStatusEventHandler(function(ev, arg) {
  let evs = "???";
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = "DISCONNECTED";
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = "CONNECTING";
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = "CONNECTED";
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = "GOT_IP";
	netReady = 1;
  }
  print("** Net event:", ev, evs);
}, null);


GPIO.write(ledPin,1); // turn off LED (active low) to indicate init complete

