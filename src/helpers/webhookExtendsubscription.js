const dbHelper = require("./dbHelper");
const moment = require("moment");
const { SimpleGraphClient } = require('../simple-graph-client');
exports.renewSubscription= (adapter,botConfig)=> {
    dbHelper.getAllSubscription().then((subscriptions)=>{
        //console.log(subscriptions)
        subscriptions.forEach(subscription => {
            var cid = subscription.notificationUrl.split("/")[subscription.notificationUrl.split("/").length -1]
            if(cid==botConfig.cid && moment(subscription.expirationDateTime) - moment()<=0) { //cid==botConfig.cid && moment(subscription.expirationDateTime) - moment()<=0
                dbHelper.getUserConversationData(subscription._id).then(async conversation=>{
                    await adapter.continueConversationAsync(conversation.bot.id.split(":")[1], conversation, async context => {
                        const userTokenClient = context.turnState.get(context.adapter.UserTokenClientKey);
                           if(userTokenClient) {
                                const { activity } = context;
                                console.log(activity.from.id.split(":")[1], botConfig.connectionName, activity.channelId);
                               userTokenClient.getUserToken(activity.from.id, botConfig.connectionName, activity.channelId).then(async tokenResponse=>{
                                 if(tokenResponse!=undefined){
                                    const client = new SimpleGraphClient(tokenResponse.token);
                                    const data = await client.startCalenderSubscription(botConfig.host, botConfig.cid);
                                    dbHelper.saveSubscriptionData(data);
                                 } else {
                                    console.log("Token Expired ",tokenResponse);
                                 }
                                })      
                           }
                         // await context.sendActivity('Testing the Notification Feature of Bot.');
                      });
                })   
            }

            
        });
    }).catch(e=>{
        console.log(e)
    })
}
