#include <stdio.h>
#include "mgos.h"
#include "mgos_wifi.h"

/* Add ESP8266 RTC memory access and reset info functions
*/

#include <user_interface.h>
// Read RTC memory into int (32 bits) value
int readRtcInt( int ix) {
	int rtcStore;
	system_rtc_mem_read(64+ix, &rtcStore, sizeof(rtcStore));
	return rtcStore;
}

// Write int (32 bits) into RTC memory
int writeRtcInt( int ix, int val) {
	system_rtc_mem_write(64+ix, &val, sizeof(val));
	return sizeof(val);
}

// must do Cfg.set({wifi: {sta: {enable: true}}}, false);
// before calling this function
int doWifiConnect( void) {
	return ((mgos_wifi_init()) ? 1 : 0);
}

// Get Reset reason
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

int getResetReason(void) {
	struct rst_info *rtc_info_ptr = system_get_rst_info();
	return rtc_info_ptr->reason;
}

enum mgos_app_init_result mgos_app_init(void) {
  return MGOS_APP_INIT_SUCCESS;
}
