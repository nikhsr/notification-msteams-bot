module.exports = {
	"basiccommands": [
		{
			"command": "help",
			"description": ""
		},
		{
			"command": "who",
			"description": ""
		},
		{
			"command": "hello",
			"description": ""
		},
		{
			"command": "hi",
			"description": ""
		},
		{
			"command": "hey",
			"description": ""
		},
		{
			"command": "bye",
			"description": ""
		},
		{
			"command": "login",
			"description": ""
		}
	],
	"privilegedcommands": [
		{
			"command": "find",
			"description": "Find Devices on GeoMap"
		},
		{
			"command": "locate",
			"description": "Locate Devices on Floormap"
		},
		{
			"command": "search",
			"description": "Device Search"
		},
		{
			"command": "apstatus",
			"description": "Network Device Status"
		},
		{
			"command": "location",
			"description": "Location Services"
		},
		{
			"command": "contacttracing",
			"description": "Contact Tracing"
		}		
	],
	"widgetcommands": {
		"heatmap": {
			"command": "liveheatmap",
			"description": "Live Heatmap",
			"type": "live"
		},
		"userchart": {
			"command": "usercount",
			"description": "Users Chart",
			"type": "static"
		},
		"footfallcalendar": {
			"command": "userfootfall",
			"description": "Footfall Calendar",
			"type": "static"
		},
		"pathdistribution": {
			"command": "pathdistribution",
			"description": "Path Distribution",
			"type": "static"
		},
		"outboundtraffic": {
			"command": "trafficflow2",
			"description": "Outbound Traffic",
			"type": "static",
			"widgetsettings": {
				"timeframe": 12,
				"interval": "hour"
			}
		},
		"inboundtraffic": {
			"command": "trafficinflow2",
			"description": "Inbound Traffic",
			"type": "static",
			"widgetsettings": {
				"timeframe": 12,
				"interval": "hour"
			}
		},
		"dwelltimechart": {
			"command": "dwelltime",
			"description": "Dwell Time Chart",
			"type": "static"
		},
		"repeatuserchart": {
			"command": "repeatusers",
			"description": "Repeat Users Chart",
			"type": "static"
		},
		"camerademographicschart": {
			"command": "camerademographicstrend",
			"description": "Camera Demographics Trend Chart",
			"type": "static"
		},
		"cameraoccupancychart": {
			"command": "camerausertrend",
			"description": "Camera Occupancy Trend Chart",
			"type": "static"
		},
		"livefeed": {
			"command": "camerausercount",
			"description": "Camera Live Feed",
			"type": "live"
		},
		"devicelastknownlocation": {
			"command": "devicelastknownlocation",
			"description": "Device Last Known Location",
			"type": "static",
			"widgetsettings": {}
		},
		"liveusermovementshybrid": {
			"command": "liveusermovementshybrid",
			"description": "Live User Movements Hybrid",
			"type": "static",
			"widgetsettings": {}
		},
		"liveheatmap": {
			"command": "liveuserheatmapcamera",
			"description": "Live user heatmap camera",
			"type": "static"
		},
		"trends": {
			"command": "humancharacteristicstrends",
			"description": "Human Characteristics Trends",
			"type": "static"
		},
		"demographics": {
			"command": "camerausertrend",
			"description": "Camera User Trend",
			"type": "static"
		},
		"details": {
			"command": "camerademographicstrend",
			"description": "Camera Demographics Trend",
			"type": "static"
		},

	}
};