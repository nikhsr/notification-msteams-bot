var moment = require('moment');
var fs = require('fs');
var i18n = require('i18n');
const btoa = require("btoa");
var botsettings = require('../../config/botsettings');
var appconfig = require('../appconfig');
const SNAPSHOT = require('./snapshot');
const {
	ActionTypes,
	CardFactory,
	MessageFactory,
	TeamsActivityHandler,
	TeamsInfo,
	TurnContext,
	CardAction
} = require('botbuilder');
var s3 = require('../s3/operations');
var ON_DUPLO = process.env['ON_DUPLO'] === 'true';


//TODO: Use direct path until the SDK is published to npm
var ANALYTICS = require('kloudspot-analytics-node-sdk');

//Use this for testing only
//var ANALYTICS = require('/Users/uday/jamesonworkspace/kloudspot-analytics-node-sdk/lib/analytics');
//process.env.JAMESON_HOST = 'https://office.kloudspot.com/advanced';

//Holds handles to all the individual clients
var clientMap = {};

var settings = {};
if (ON_DUPLO) {
	console.log("Using S3 for config storage, kspotanalytics");
	s3.getConfig()
	  .then((botsetting) => {
		botsetting.bots.forEach(function(cust) {
			settings[cust.cid] = {
				'host': cust.externalhost || process.env.JAMESON_HOST,
				'externalhost': cust.externalhost,
				'id': cust.appClientId,
				'secretKey': cust.appClientSecret,
				'functions': cust.functions,
				'language': cust.language || "en",
				'baseUrl': cust.host || process.env.JAMESON_HOST,
				'jamesonPassword': cust.jamesonPassword || "teams",
				'jamesonUsername': cust.jamesonUsername || "tJc3wWxVJstn32aZ!",
			};
			console.log("Host for " + cust.name + " is set to " + settings[cust.cid]["externalhost"]);
		});
	  })
	  .catch((err) => console.log("Can't read settings", err));
  } else {
	botsettings.bots.forEach(function(cust) {
		settings[cust.cid] = {
			'host': cust.externalhost || process.env.JAMESON_HOST,
			'externalhost': cust.externalhost,
			'id': cust.appClientId,
			'secretKey': cust.appClientSecret,
			'functions': cust.functions,
			'language': cust.language || "en",
			'baseUrl': cust.host || process.env.JAMESON_HOST,
			'jamesonPassword': cust.jamesonPassword || "teams",
			'jamesonUsername': cust.jamesonUsername || "tJc3wWxVJstn32aZ!",
		};
		console.log("Host for " + cust.name + " is set to " + settings[cust.cid]["externalhost"]);
	});
}

function getClient(custid) {
	let client = null;
	if (clientMap[custid] !== undefined) {
		client = clientMap[custid];
		console.log('Re-using the client for ' + custid);
	} else if (settings[custid]) {
		client = new ANALYTICS(settings[custid]);
		console.log('Created a client for ' + custid);
	} else {
		console.error("**************************************************************");
		console.error("No connection configuration defined for customer " + custid);
		console.error("**************************************************************");
	}
	return client;
}

function search(custid, keyword) {
	return new Promise((resolve, reject) => {

		const analyticsClient = getClient(custid);

		//Set the preferred language for this bot
		i18n.setLocale(settings[custid]["language"] || 'en');

		var attachments = [], text = '', defaulttext = 'No data match your search criteria. Please try again';
		if (keyword) {
			// analyticsClient.search(keyword, function(response) {
			analyticsClient._getRequest(`/api/v1/analytics/deviceSearch?keyword=${encodeURIComponent(keyword)}`, (response) => {
				//console.log(response);
				if (response) {
					console.log(response);
					response.forEach(function(u) {
						let name = 'Unknown', mac = u.mac, lastSeen = moment(u.lastSeenHere).fromNow();
						if ((u.first || u.last) && (u.first + u.last).length > 0) {
							name = u.first + ' ';
						}
						text += '<br>' + name.padStart(20, '') + ' - ' + mac.padStart(20, '') + ' - ' + lastSeen;
					});
					if (text.length == 0) {
						text = defaulttext;
					} else {
						text = '<h5><b>' + response.length + '</b> '+ i18n.__('RESULT_FOUND')+'<br>' + text + '</h5>';
					}
					attachments.push(
						CardFactory.heroCard(
							i18n.__('SEARCH_RESULT') +"- " + text,
							["https://cdn2.iconfinder.com/data/icons/circle-icons-1/64/profle-256.png"]
						));
				}

				resolve(attachments);
			});
		} else {
			resolve(attachments);
		}
	});
}

function find(custid, keyword) {
	return new Promise((resolve, reject) => {

		const analyticsClient = getClient(custid);

		//Set the preferred language for this bot
		i18n.setLocale(settings[custid]["language"] || 'en');
		console.log(keyword)
		var attachments = [];
		if (keyword) {
			// analyticsClient.search(keyword, function(response)
			analyticsClient._getRequest(`/api/v1/analytics/deviceSearch?keyword=${encodeURIComponent(keyword)}`, (response) => {
				console.log(response);
				if (!response || response.length == 0) {
					attachments.push(
						CardFactory.heroCard(
							i18n.__('sorry') + " " + i18n.__('no_results'),
						));
					resolve(attachments);
				} else {
					response.forEach(function(u) {
						if (attachments.length >= 5 || !u.geoCoords) {
							return;
						}
						let name = 'Unknown';
						if ((u.first || u.last) && (u.first + u.last).length > 0) {
							name = u.first + ' ';
						}
						var title = name;
						var message = i18n.__('device_last_seen') + ' ' + moment(u.lastSeenHere).fromNow();

						var thumbnailurl = 'https://maps.googleapis.com/maps/api/staticmap?center=' +
							+ u.geoCoords.lat + ',' + u.geoCoords.lng
							+ '&zoom=19&size=600x300&maptype=roadmap&markers=color:red%7Clabel:C%7C'
							+ u.geoCoords.lat + ',' + u.geoCoords.lng
							+ '&key=AIzaSyAx0aCb5RuQoTwXA782Yh2DTPXNo1ytx7E';
						var buttons = [
							{
								"type": "Action.OpenUrl",
								"title": i18n.__('more_detail'),
								"url": settings[custid]["externalhost"] + "/#/admin/wayfinding/" + u.mac + "/" + ((u.bluetoothDevice) ? "bluetooth" : "probe")
								//"url" : "http://10.90.5.218:8083/video_feed/zone2?token=1c697aaaea40^*^$2a$12$usgKDkf2iNkVP0s/K2wQXOO6RZddvroG7vCRKR6SAq7zADM6pbkqC"
							}
						];
						if (settings[custid]["functions"].includes("contacttracing")) {
							buttons.push({
								"type": "Action.OpenUrl",
								"title": i18n.__('contact_tracing'),
								"url": settings[custid]["externalhost"] + "/#/admin/contacttracing/" + u.mac + "/" + ((u.bluetoothDevice) ? "bluetooth" : "probe")
								//'data': { msteams: { type: 'task/fetch' }, data: {option:'Find', url: settings[custid]["externalhost"]+"/#/admin/contacttracing/"+u.mac+"/"+((u.bluetoothDevice)?"bluetooth":"probe")}}
							})

						}
						attachments.push(
							CardFactory.adaptiveCard({
								"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
								"type": "AdaptiveCard",
								"version": "1.0",
								"body": [
									{
										"type": "TextBlock",
										"weight": "bolder",
										"text": title
									},
									{
										"type": "Image",
										"url": thumbnailurl
									},
									{
										"type": "TextBlock",
										"text": message
									}
								],
								"actions": buttons

							}));

					});

				}
				resolve(attachments);
			});
		} else {
			resolve(attachments);
		}
	});
}

function locate(custid, keyword, context) {
	return new Promise((resolve, reject) => {

		const analyticsClient = getClient(custid);

		//Set the preferred language for this bot
		i18n.setLocale(settings[custid]["language"] || 'en');

		var attachments = [], text = '', defaulttext = 'No data match your search criteria. Please try again';
		if (keyword) {
			//analyticsClient.search(keyword, function(response) {
			analyticsClient._getRequest(`/api/v1/analytics/deviceSearch?keyword=${encodeURIComponent(keyword)}`, (response) => {
				console.log(response);
				if (!response || response.length == 0) {
					attachments.push(
						CardFactory.heroCard(
							i18n.__('sorry') + " " + i18n.__('no_results'),
						));
					resolve(attachments);
				} else {
					//console.log(response);
					response.sort(function(a, b) { return a.lastSeenHere - b.lastSeenHere }).reverse();
					console.log("##", response[0])
					var mac = response[0]["mac"];

					//Load the widget for the mac address
					const text = "Device last seen at " + response[0].siteName + "->" + response[0].floorName + "->" + response[0].zoneName;
					const arg2 = "devicelastknownlocation";
					const snapshot = new SNAPSHOT({
						"custid": custid,
						"widget": appconfig.widgetcommands[arg2].command,
						"type": appconfig.widgetcommands[arg2].type,
						"widgetsettings": { "keyword": mac },
					});

					var waitcounter = 0;
					snapshot.generateSnapshot().then(function(data) {
						console.log('ready to read generated snapshot');
						console.log(settings[custid].baseUrl + '/teams/tmpResources/' + data.path);
						//const file = "/Users/uday/Downloads/Uday-Full.jpg";
						//const image64 = fs.readFileSync(data.path, 'base64');
						//var image64 = new Buffer(fs.readFileSync(file).toString("base64"));
						var Url = data.url;
						attachments.push(
							CardFactory.adaptiveCard({
								"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
								"type": "AdaptiveCard",
								"version": "1.0",
								"body": [
									{
										"type": "TextBlock",
										"weight": "bolder",
										"text": appconfig.widgetcommands[arg2].description + ' for ' + keyword
									},
									{
										"type": "TextBlock",
										"text": text,
										"wrap": true
									},
									{
										"type": "TextBlock",
										"text": moment(response[0].lastSeenHere).fromNow(),
										"wrap": true
									},
									{
										"type": "Image",
										"url": settings[custid].baseUrl + '/teams/tmpResources/' + data.path
									}
								],
								"actions": [
									{
										"type": "Action.Submit",
										"title": i18n.__('more_detail'),
										// "url": data.url,
										'data': { msteams: { type: 'task/fetch' }, data: { option: 'Location', url: Url, zoneId: response[0].location, caller: context.activity.from.name.split(" ")[0], contentPath: data.path } }
									}
								]
							}));

						clearInterval(waitinterval);

						resolve(attachments);

					}).catch(function(e) {
						console.log(e);

						clearInterval(waitinterval);

						attachments.push(
							CardFactory.heroCard(
								i18n.__('sorry') + " " + i18n.__('no_results'),
							));

						resolve({ attachments: attachments, url: "null" });
					});

					var waitinterval = setInterval(async function() {
						console.log(moment().format());
						waitcounter++;
						if (waitcounter == 1) {
							msg = i18n.__('WAIT_MSG_1');
						} else if (waitcounter == 2) {
							msg = i18n.__('WAIR_MSG_2');
						} else if (waitcounter == 7) {
							msg = i18n.__('WAIT_MSG_3');
						} else {
							msg = i18n.__("WAIT_MSG_4");
							clearInterval(waitinterval);
						}
						await context.sendActivity(msg);
					}, 180000);

				}
			});
		} else {
			resolve(attachments);
		}
	});
}

function apstatus(custid, state) {
	return new Promise((resolve, reject) => {

		const analyticsClient = getClient(custid);


		//Set the preferred language for this bot
		i18n.setLocale(settings[custid]["language"] || 'en');

		var attachments = [];
		if (!state) {
			state = 'all';
		}
		console.log(state);

		if (state) {
			var patt = new RegExp("^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$");
			var isMac = patt.test(state);
			var uplist = [], downlist = [];
			analyticsClient.apstatus(function(response) {
				// console.log(JSON.stringify(response));
				if (response && response.apStatii && Array.isArray(response.apStatii)) {
					response.apStatii.forEach((ap) => {
						var apDown = true;
						if (ap.history && ap.history.lastSeen) {
							if (moment(ap.history.lastSeen).isAfter(moment().subtract(3, 'minutes'))) {
								apDown = false;
							}
						}
						if (!state || state.length == 0 || state == 'all' || (state == 'up' && !apDown) || (state == 'down' && apDown) || (state == 'active' && !apDown) || (state == 'inactive' && apDown) || (state == ap.apMac && isMac)) {


							if (apDown) {

								downlist.push(ap);


							} else {

								uplist.push(ap);
							}


							/*
							var text = apDown?'This device is currently down':'This device is up and running';
							var thumbnailurl = apDown?'https://cdn3.iconfinder.com/data/icons/virtual-notebook/16/button_close-32.png':'https://cdn4.iconfinder.com/data/icons/free-ui/64/v-10-32.png';
							if(attachments.length<10) {
								attachments.push(
										new builder.ThumbnailCard()
											.title(ap.apMac)
											.images([new builder.CardImage().url(thumbnailurl)])
											.text(text)
											.toAttachment());
							}
							*/
						}

					});

				}
				// var upbodyJson = [{
				// 	"type": "Image",
				// 	"url": "https://cdn4.iconfinder.com/data/icons/free-ui/64/v-10-32.png"
				// },
				// {
				//    "type": "TextBlock",
				//    "weight": "bolder",
				//    "text": title
				// }];

				//Construct an attachments list with the uplist and downlist
				if (uplist.length > 0) {
					// var title = i18n.__('devices_up');
					var uplistData = uplist.map((ap) => {
						return ap.apMac + ' - Active ' + moment(ap.history.lastSeen).fromNow();
					});


					var upText = "Found " + uplist.length + " Devices";

					var encodedUpListData = btoa(uplistData);

					attachments.push(
						CardFactory.adaptiveCard({
							"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
							"type": "AdaptiveCard",
							"version": "1.0",
							"body": [{
								"type": "ColumnSet",
								"columns": [
									{
										"type": "Column",
										"width": "auto",
										"items": [
											{
												"type": "Image",
												"url": "https://img.icons8.com/material/48/26e07f/checked-checkbox--v2.png",
												"size": "Large"
											}
										]
									},
									{
										"type": "Column",
										"width": 4,
										"style": "emphasis",
										"items": [
											{
												"type": "TextBlock",
												"text": "Ap Status Up",
												"weight": "bolder"
											},
											{
												"type": "TextBlock",
												"text": upText,
												"isSubtle": true,
												"wrap": true,
												"spacing": "None"

											}
										]
									}
								],
								"selectAction": {
									"type": "Action.Submit",
									"title": i18n.__('more_detail'),
									"data": { "msteams": { "type": "task/fetch" }, "data": { "option": "apstatusUpList", "apstatusUpData": encodedUpListData } }
								}

							}]
						}
						));

				}

				if (downlist.length > 0) {

					var downText = "Found " + downlist.length + " Devices";

					var title = i18n.__('devices_down');
					var downlistData = downlist.map((ap) => {
						var s = ap.apMac + ' ';
						if (ap.history && ap.history.lastSeen) {
							s += ' - Down ' + moment(ap.history.lastSeen).fromNow();
						} else {
							s += ' - Status unknown';
						}
						return s;
					});
					console.log(downlistData, "DOWNLISTDATA");
					var encodedDownListData = btoa(downlistData);

					attachments.push(
						CardFactory.adaptiveCard({
							"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
							"type": "AdaptiveCard",
							"version": "1.0",
							"body": [{
								"type": "ColumnSet",
								"columns": [
									{
										"type": "Column",
										"width": "auto",
										"items": [
											{
												"type": "Image",
												"url": "https://img.icons8.com/emoji/48/000000/cross-mark-button-emoji.png",
												"size": "Large"
											}
										]
									},
									{
										"type": "Column",
										"width": 4,
										"style": "emphasis",
										"items": [
											{
												"type": "TextBlock",
												"text": "Ap Status Down",
												"weight": "bolder"
											},
											{
												"type": "TextBlock",
												"text": downText,
												"isSubtle": true,
												"wrap": true,
												"spacing": "None"

											}
										]
									}
								],
								"selectAction": {
									"type": "Action.Submit",
									"title": "More Details",
									"data": { "msteams": { "type": "task/fetch" }, "data": { "option": "apstatusDownList", "apstatusDownData": encodedDownListData } }
								}
							}]
						}
						));
				}

				resolve(attachments);
			});
		} else {
			resolve(attachments);
		}
	});
}

function location(custid, keyword, context) {
	return new Promise(async (resolve, reject) => {

		const analyticsClient = getClient(custid);

		//Set the preferred language for this bot
		i18n.setLocale(settings[custid]["language"] || 'en');
		var adaptiveBody = [];
		var attachments = [];
		if (true) {
			//console.log(keyword);

			let arg1, arg2, arg3;
			if (keyword.length == 0) {
				keyword = "list";
			}
			var splits = keyword.toString().split(" ");
			//console.log(splits);
			if (splits.length > 0) {
				arg1 = splits[0];
			}
			if (splits.length > 1) {
				arg2 = splits[1];
			}
			if (splits.length > 2) {
				arg3 = splits[2];
			}

			//console.log(arg1+' '+arg2+' '+arg3);

			//Get the entire hierarchy and cache it for further use
			const hierarchy = await analyticsClient.hierarchy();
			//console.log(hierarchy.length+' sites');
			console.log(hierarchy);
			const list = [];
			function processChildren(arr) {
				arr.forEach(function(obj, index) {
					//console.log('Adding '+obj.fullName);
					var entry = (({ id, fullName, name, timeZoneId, type, lastModifiedTimestamp }) => ({ id, fullName, name, timeZoneId, type, lastModifiedTimestamp }))(obj);
					if (entry.type != 'region') {
						list.push(entry);
					}
					if (obj.children && obj.children.length > 0) {
						processChildren(obj.children);
					}
				});
			}
			processChildren(hierarchy);


			//console.log('arg1: '+arg1);

			if (splits.length === 1) {
				adaptiveBody = [];
				if (arg1 === "list" || arg1 === "show" || arg1 === "print") {
					//Give a list of all the sites in the system
					if (list.length > 0) {
						var title = i18n.__('list_locations');
						var text = list.map((loc, index) => {
							var s = (index + 1) + ' - ' + loc.fullName;
							return s;
						});
						text.push(" ", " ", i18n.__('location_help'), "location 1 " + i18n.__('1st_location_info'), 'location 1 footfall ' + i18n.__('1st_location_footfall'), 'location 1 dwelltime ' + i18n.__('1st_location_dwelltime'));
						adaptiveBody.push({
							"type": "Image",
							"url": "https://cdn4.iconfinder.com/data/icons/twitter-28/512/157_Twitter_Location_Map-32.png"
						}, {
							"type": "TextBlock",
							"weight": "bolder",
							"text": title
						});
						text.forEach(d => adaptiveBody.push(
							{
								"type": "TextBlock",
								"text": d,
								"wrap": true
							}))
						attachments.push(
							CardFactory.adaptiveCard({
								"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
								"type": "AdaptiveCard",
								"version": "1.0",
								"body": adaptiveBody
							}));

					}
				} else if (!isNaN(arg1)) {
					adaptiveBody = [];
					const locationObj = list[parseInt(arg1, 10) - 1];
					adaptiveBody.push({
						"type": "Image",
						"url": "https://cdn4.iconfinder.com/data/icons/twitter-28/512/157_Twitter_Location_Map-32.png"
					},
						{
							"type": "TextBlock",
							"weight": "bolder",
							"text": locationObj.name
						})

					var text = ['Hierarchy : ' + locationObj.fullName,
					'Timezone : ' + locationObj.timeZoneId,
					'Type : ' + locationObj.type,
					'Last Updated : ' + moment(locationObj.lastModifiedTimestamp).fromNow()];
					text.push(' ' + i18n.__('this_location_help'), 'location ' + arg1 + ' footfall ' + i18n.__('this_location_footfall'), 'location ' + arg1 + ' dwelltime ' + i18n.__('this_location_dwelltime'));
					text.forEach(d => adaptiveBody.push({
						"type": "TextBlock",
						"text": d,
						"wrap": true
					}));
					attachments.push(
						CardFactory.adaptiveCard({
							"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
							"type": "AdaptiveCard",
							"version": "1.0",
							"body": adaptiveBody
						}));
				}

				resolve(attachments);

			} else if (arg2) {
				//console.log('arg2: '+arg2);
				adaptiveBody = [];
				const locationObj = list[parseInt(arg1, 10) - 1];
				const locationid = locationObj.id;
				//console.log(locationid);
				if (arg2 === "footfall") {
					let footfallresp = await analyticsClient.footfall(locationid);
					if (footfallresp && footfallresp.length > 0) {
						footfallresp = footfallresp.filter((d) => { return d.distributionCounts; });
					}
					if (footfallresp.length > 0) {
						footfallresp.sort((a, b) => { return a.timestamp - b.timestamp });
						const footfall5min = footfallresp[footfallresp.length - 1];
						//console.log('Time: '+moment(footfall5min.timestamp).format());
						if (footfall5min && footfall5min.distributionCounts) {
							const text = footfall5min.distributionCounts.map((obj, i) => {
								return obj.count + ' ' + obj.characteristic;
							}).join(' and ') + ' devices seen at ' + locationObj.name
								//+' in the last 5 minutes';
								+ ' as of ' + moment(footfall5min.timestamp).fromNow();

							attachments.push(
								CardFactory.adaptiveCard({
									"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
									"type": "AdaptiveCard",
									"version": "1.0",
									"body": [
										{
											"type": "Image",
											"url": "https://cdn1.iconfinder.com/data/icons/all_google_icons_symbols_by_carlosjj-du/32/people-y.png"
										}, {
											"type": "TextBlock",
											"weight": "bolder",
											"text": 'Footfall for ' + locationObj.name
										},
										{
											"type": "TextBlock",
											"text": text,
											"wrap": true
										}
									]
								}));
						}
					}

					resolve(attachments);

				} else if (arg2 === "dwelltime") {
					let dwelltimeresp = await analyticsClient.dwelltime(locationid);
					if (dwelltimeresp && dwelltimeresp.length > 0) {
						dwelltimeresp = dwelltimeresp.filter((d) => { return d.avg; });
					}
					//console.log(dwelltimeresp);
					if (dwelltimeresp.length > 0) {
						dwelltimeresp.sort((a, b) => { return a.timestamp - b.timestamp });
						const dwelltime5min = dwelltimeresp[dwelltimeresp.length - 1];
						//console.log('Time: '+moment(dwelltime5min.timestamp).format());
						const text = 'The average dwell time today at ' + locationObj.name + ' is ' + dwelltime5min.avg + ' minutes'

						attachments.push(
							CardFactory.adaptiveCard({
								"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
								"type": "AdaptiveCard",
								"version": "1.0",
								"body": [
									{
										"type": "TextBlock",
										"weight": "bolder",
										"text": 'Dwell Time for ' + locationObj.name
									},
									{
										"type": "TextBlock",
										"text": text
									},
									{
										"type": "Image",
										"url": "https://cdn2.iconfinder.com/data/icons/Siena/32/clock%20red.png"
									}
								]
							}));
					}

					resolve(attachments);

				} else if (arg2 === "options") {
					let title = "Here is a list of available options";
					let text = Object.keys(appconfig.widgetcommands).map((k, i) => {
						return (i + 1) + ") " + k;
					}).join("<br>");
					attachments.push(
						CardFactory.adaptiveCard({
							"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
							"type": "AdaptiveCard",
							"version": "1.0",
							"body": [
								{
									"type": "TextBlock",
									"weight": "bolder",
									"text": title
								},
								{
									"type": "TextBlock",
									"text": text,
									"wrap": true
								},
								{
									"type": "Image",
									"url": "https://cdn4.iconfinder.com/data/icons/twitter-28/512/157_Twitter_Location_Map-32.png"
								}
							]
						}));
					resolve(attachments);

				} else if (Object.keys(appconfig.widgetcommands).includes(arg2)) {
					//const text = 'Here is the '+appconfig.widgetcommands[arg2].description+' at '+locationObj.name;
					const text = null;
					console.log(arg2)
					const snapshot = new SNAPSHOT({
						"custid": custid,
						"location": locationid,
						"widget": appconfig.widgetcommands[arg2].command,
						"type": appconfig.widgetcommands[arg2].type,
						"widgetsettings": appconfig.widgetcommands[arg2].widgetsettings,
					});

					var waitcounter = 0;
					snapshot.generateSnapshot().then(function(data) {
						console.log('ready to read generated snapshot');

						//const file = "/Users/uday/Downloads/Uday-Full.jpg";
						//var image64 = new Buffer(fs.readFileSync(file).toString("base64"));

						attachments.push(
							CardFactory.adaptiveCard({
								"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
								"type": "AdaptiveCard",
								"version": "1.0",
								"body": [
									{
										"type": "TextBlock",
										"weight": "bolder",
										"text": appconfig.widgetcommands[arg2].description + ' for ' + locationObj.name
									},
									{
										"type": "TextBlock",
										"text": text
									},
									{
										"type": "Image",
										"url": settings[custid].baseUrl + '/teams/tmpResources/' + data.path
									}
								],
								"actions": [
									{
										"type": "Action.Submit",
										"title": i18n.__('more_detail'),
										// "url": data.url,
										'data': { msteams: { type: 'task/fetch' }, data: { option: 'Location', url: data.url, caller: context.activity.from.name, contentPath: data.path } }
									}
								]
							}));
						clearInterval(waitinterval);

						resolve(attachments);

					}).catch(function(e) {
						console.log(e);

						clearInterval(waitinterval);

						attachments.push(
							CardFactory.heroCard(
								i18n.__('sorry') + " " + i18n.__('no_results'),
							));

						resolve(attachments);
					});
					/*
					//https://stackoverflow.com/questions/45041317/using-locally-stored-images-in-hero-card
					var image64 = new Buffer(fs.readFileSync(<image path>).toString("base64"));
					var card = new builder.HeroCard(session)
						.images([builder.CardImage.create(session, "data:image/jpeg;base64,"+image64)]);
					 */

					var waitinterval = setInterval(async function() {
						console.log(moment().format());
						waitcounter++;
						if (waitcounter == 1) {
							msg = i18n.__('WAIT_MSG_1');
						} else if (waitcounter == 2 || waitcounter == 4 || waitcounter == 5 || waitcounter == 7 || waitcounter == 8) {
							return;
						} else if (waitcounter == 3) {
							msg = i18n.__('WAIR_MSG_2');
						} else if (waitcounter == 6) {
							msg = i18n.__('WAIT_MSG_3');
						} else {
							msg = i18n.__("WAIT_MSG_4");
							clearInterval(waitinterval);
						}
						await context.sendActivity(msg);
					}, 8000);
				}
			}
			//resolve(attachments);
		} else {
			resolve(attachments);
		}
	});
}

function help(custid) {

	//Set the preferred language for this bot
	i18n.setLocale(settings[custid]["language"] || 'en');

	let attachments = [];
	var capabilities = [{
		"title": i18n.__('help'),
		"description": i18n.__('help_desc')
	}];

	//Add capabilities conditionally
	if (settings[custid]["functions"].includes("search")) {
		capabilities.push({
			"title": i18n.__('search'),
			"description": i18n.__('search_desc_1') +
				"<br>Eg: <b>search john</b>: " + i18n.__('search_desc_2')
		});
	}
	if (settings[custid]["functions"].includes("find")) {
		capabilities.push({
			"title": i18n.__('find'),
			"description": i18n.__('find_desc_1') +
				"<br>Eg: <b>find john</b>: " + i18n.__('find_desc_2')
		});
	}
	if (settings[custid]["functions"].includes("locate")) {
		capabilities.push({
			"title": i18n.__('locate'),
			"description": i18n.__('locate_desc_1') +
				"<br>Eg: <b>locate john</b>: " + i18n.__('locate_desc_2')
		});
	}
	if (settings[custid]["functions"].includes("apstatus")) {
		capabilities.push({
			"title": i18n.__('apstatus'),
			"description": i18n.__('apstatus_desc_1') +
				"<br><b>apstatus</b>: " + i18n.__('apstatus_desc_2') +
				"<br><b>apstatus up</b>: " + i18n.__('apstatus_desc_3') +
				"<br><b>apstatus down</b>: " + i18n.__('apstatus_desc_4') +
				"<br><b>apstatus <MAC></b>: " + i18n.__('apstatus_desc_5')
		});
	}
	if (settings[custid]["functions"].includes("location")) {
		capabilities.push({
			"title": i18n.__('location'),
			"description": i18n.__('location_desc_1') +
				"<br><b>location list</b> : " + i18n.__('location_desc_2') +
				"<br><b>location show</b> : " + i18n.__('location_desc_2') +
				"<br><b>location print</b> : " + i18n.__('location_desc_2') +
				"<br><b>location 1</b> : " + i18n.__('location_desc_4') +
				"<br><b>location 1 footfall</b> : " + i18n.__('location_desc_5') +
				"<br><b>location 3 dwelltime</b> : " + i18n.__('location_desc_6') +
				"<br><b>location 3 heatmap</b> : " + i18n.__('location_heatmap') +
				"<br><b>location 3 userchart</b> : " + i18n.__('location_userchart') +
				"<br><b>location 3 footfallcalendar</b> : " + i18n.__('location_footfallcalendar') +
				"<br><b>location 3 pathdistribution</b> : " + i18n.__('location_pathdistribution') +
				"<br><b>location 3 outboundtraffic</b> : " + i18n.__('location_outboundtraffic') +
				"<br><b>location 3 inboundtraffic</b> : " + i18n.__('location_inboundtraffic') +
				"<br><b>location 3 dwelltimechart</b> : " + i18n.__('location_dwelltimechart') +
				"<br><b>location 3 repeatuserchart</b> : " + i18n.__('location_repeatuserchart') +
				"<br><b>location 3 camerademographicschart</b> : " + i18n.__('location_camerademographicschart') +
				"<br><b>location 3 cameraoccupancychart</b> : " + i18n.__('location_cameraoccupancychart') +
				"<br><b>location 3 livefeed</b> : " + i18n.__('location_livefeed')

		});
	}

	capabilities.forEach((d) => {
		attachments.push(
			CardFactory.adaptiveCard({
				"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
				"type": "AdaptiveCard",
				"version": "1.0",
				"body": [
					{
						"type": "TextBlock",
						"weight": "bolder",
						"text": d.title
					},
					{
						"type": "TextBlock",
						"text": d.description,
						"wrap": true
					}
				]
			}));
	});
	return attachments;
}

function login(custid, context) {
	//var authUrl = 'https://login.microsoftonline.com/312d339b-bce5-4b32-8cde-bcb67e3d8344/oauth2/authorize?response_type=code&client_id=90175597-31d5-4e37-b636-bfffc0041c1b&scope=openid%20profile%20email%20User.Read%20Directory.AccessAsUser.All&state=9SeA8ajOYezB1OfP0ECso-p9_ZNnmv0yAjN4bfpjBO0%3D&redirect_uri='+BASE_PATH+'/auth/azureADv1/callback&resource=https://graph.microsoft.com';
	var authUrl = 'https://login.microsoftonline.com/312d339b-bce5-4b32-8cde-bcb67e3d8344/oauth2/authorize?response_type=code&client_id=90175597-31d5-4e37-b636-bfffc0041c1b&state=9SeA8ajOYezB1OfP0ECso-p9_ZNnmv0yAjN4bfpjBO0%3D&scope=User.Read&redirect_uri=' + settings[custid].baseUrl + '/auth/azureADv1/callback&resource=https://graph.microsoft.com';

	var pageurl = settings[custid].baseUrl + '/teams/auth-start.html?authorizationUrl=' + encodeURIComponent(authUrl);
	let attachments = [];
	var buttons = [];
	buttons.push(
		{
			type: ActionTypes.OpenUrl,
			title: "Sign in",
			value: pageurl,
			text: 'Kindly Click on the button to Sign in',
		}
	)
	attachments.push(
		CardFactory.heroCard(
			'Looks like you are not logged in.. Please sign-in first so I an answer your questions..', null,
			buttons
		));
	return attachments;
}

function searchUser(custid,context, keyword ) {
	return new Promise((resolve, reject) => {
		const analyticsClient = getClient(custid);

		//Set the preferred language for this bot
		i18n.setLocale(settings[custid]['language'] || 'en');

		var attachments = [];
		if (keyword) {
			let url;
			if(keyword)
				url = `/api/v1/user-info/search?page=0&size=5&q=${encodeURIComponent(keyword)}&searchType=Exact&searchScope=Full`;
			console.log("URL ================>",url);
			analyticsClient._getRequest(url, async (response) => {
				//console.log(response);
				if (!response || response.length == 0 || response.error) {
					attachments.push(CardFactory.heroCard(i18n.__('sorry') + ' ' + i18n.__('no_results')));
					resolve(attachments);
				} else {
					//console.log(response);
					for (const u of response) {
						//console.log("==============>", " => ", u.email);
						let name = (u.firstName + u.lastName).length > 0 ? (`${(u.firstName ? u.firstName : '')} ${(u.lastName ? u.lastName : '')}`) : 'NA';
						let email = u.email ? u.email : 'NA';
						let mobile = u.mobile ? u.mobile : 'NA';
						let department = u.department ? u.department : 'NA';
						let status = u.status ? u.status : 'NA';
						let profileIconId = u.profileIconId ? u.profileIconId : null;
						let user = [{name, email, department, profileIconId}];
						let image;let buttons = [];
						if((u.userMeta && u.userMeta.teams_email) || u.external){
							let teamsChatUrl = `https://teams.microsoft.com/l/chat/0/0?users=${u.external ? u.email :u.userMeta.teams_email}`
							let teamsCallUrl = `https://teams.microsoft.com/l/call/0/0?users=${u.external ? u.email :u.userMeta.teams_email}`;
							console.log("CAHT ======",teamsChatUrl);
							buttons.push(
								{
									type: 'Column',
									items: [
										{
											type: "Image",
											url: "https://cdn-icons-png.flaticon.com/512/3687/3687004.png",
											size: "Small",
											selectAction: {
												type : "Action.OpenUrl",
												url: teamsCallUrl
											}
										},
									],
									width: 'auto',
									spacing: "Medium"
								},
								{
									type: 'Column',
									items: [
										{
											type: "Image",
											url: "https://cdn-icons-png.flaticon.com/512/724/724715.png",
											size: "Small",
											selectAction: {
												type : "Action.OpenUrl",
												url: teamsChatUrl
											}
										},
									],
									width: 'auto',
									spacing: "Medium"
								}
							)
						}

						//console.log("==============> profileIconId: ", profileIconId, " for ", u.email);
						if (profileIconId) {
							image = await analyticsClient._getImage(`/api/v1/images/image/${encodeURIComponent(profileIconId)}`).catch(() => {
								//console.log('rejection from sdk/api - no image exists ', image);
							});
							//console.log("---------------> ", "Using bytes from server");
						} 
						
						if(!image) {
							image = `https://cdn2.iconfinder.com/data/icons/circle-icons-1/64/profle-256.png`;
						}

						attachments.push(
							CardFactory.adaptiveCard({
								$schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
								type: 'AdaptiveCard',
								version: '1.0',
								body: [
									{
										type: 'ColumnSet',
										columns: [
											{
												type: 'Column',
												items: [
													{
														type: 'Image',
														style: 'Person',
														url: image,
														size: 'Medium',
													},
												],
												width: 'auto',
											},
											{
												type: 'Column',
												items: [
													{
														type: 'TextBlock',
														weight: 'Bolder',
														text: name,
														wrap: true,
													},
													{
														type: 'TextBlock',
														spacing: 'Small',
														text: department,
														isSubtle: true,
														wrap: true
													},
													{
														type: 'TextBlock',
														spacing: 'None',
														text: email,
														isSubtle: true,
														wrap: true
													},
												],
												width: 'stretch',
											},
										],
									},
									{
										type: 'ColumnSet',
										columns : [
											...buttons
										],
									}
									/*{
										type: 'FactSet',
										facts: [
											{
												title: i18n.__('STATUS'),
												value: status,
											},
											{
												title: i18n.__('MOBILE'),
												value: mobile,
											},
										],
									},*/
								],
								
								actions: [
									{
										"type": "Action.Submit",			
										"title": i18n.__('more_detail'),			
										//"url": "https://www.google.com",
										"data": { msteams: { type: 'task/fetch' }, data: {option:'UserInfo', caller:context.activity.from.name,userInfoData:encodeURIComponent(JSON.stringify(user))}}
									}
								]
								
							})
						);
						console.log("Number of attachments =======>", attachments.length);

					//});
					}
					// console.log("USERS ==============>", users);
					console.log('======> ', 'Resolving attachments');
					resolve(attachments);
				}
			});


			//Still waiting...
			var waitcounter = 0;
			clearInterval(waitinterval);
			var waitinterval = setInterval(async function() {
				console.log(moment().format());
				waitcounter++;
				if (waitcounter == 1) {
					msg = i18n.__('WAIT_MSG_1');
				} else if (waitcounter == 2) {
					msg = i18n.__('WAIR_MSG_2');
				} else if (waitcounter == 7) {
					msg = i18n.__('WAIT_MSG_3');
				} else {
					msg = i18n.__("WAIT_MSG_4");
					clearInterval(waitinterval);
				}
				await context.sendActivity(msg);
			}, 180000);

		} else {
			resolve(attachments);
		}
	});
}


module.exports = {
	'search': search,
	'find': find,
	'locate': locate,
	'apstatus': apstatus,
	'location': location,
	'help': help,
	'login': login,
	'searchUser': searchUser
};