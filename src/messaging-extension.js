// 'use strict';

// module.exports.setup = function() {
//     //var builder = require('botbuilder');
//     var teamsBuilder = require('botbuilder-teams');
//     var bot = require('./bot');
//     var moment = require('moment');
//     var kspotanalytics = require('./kspot/kspotanalytics');
    
//     bot.customersBots().forEach(cust => {
//     	if(!cust.enabled) {
//     		return;
//     	}
//     	console.log('Messaging Extension => cust.name = '+cust.name);
//     	cust.connector.onQuery('find', async function(event, query, callback) {
	    	
// 	    	console.log(event.address.bot.id);
// 	    	console.log(query);
// 	    	console.log('------------');
	    	
// 	    	//TDODO: Get the appropriate client for the botid
	    	
// 	    	var title = query.parameters && query.parameters[0].name === 'param1'
// 	    	    ? query.parameters[0].value
// 	    	    : null;
	    	
// 	    	const attachments = await kspotanalytics.search(cust.cid, title);
	    	
// 	    	// Build the response to be sent
// 	    	var resp = teamsBuilder.ComposeExtensionResponse
// 		        .result('list')
// 		        .attachments(attachments)
// 		        .toResponse();
// 	    	callback(null, resp, 200);
// 	    });
    
//     });
// };
