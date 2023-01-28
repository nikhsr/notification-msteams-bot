
const { ActivityTypes } = require('botbuilder');
const { ComponentDialog } = require('botbuilder-dialogs');
const { OAuthHelpers } = require('../bot/oAuthHelpers');

class eventHandlerDialog extends ComponentDialog {
    constructor(id, connectionName,cid, appid) {
        super(id);
        this.connectionName = connectionName;
        this.cid = cid;
        this.appid = appid;
    }

    async onBeginDialog(innerDc, options) {
        const result = await this.interrupt(innerDc);
        if (result) {
            return result;
        }

        return await super.onBeginDialog(innerDc, options);
    }

    async onContinueDialog(innerDc) {
        const result = await this.interrupt(innerDc);
        if (result) {
            return result;
        }

        return await super.onContinueDialog(innerDc);
    }

    async interrupt(innerDc) {
        if (innerDc.context.activity.type === ActivityTypes.Message) {
            const text = innerDc.context.activity.text.toLowerCase();
            if (text.trim().toLocaleLowerCase() === 'logout') {
                const userTokenClient = innerDc.context.turnState.get(innerDc.context.adapter.UserTokenClientKey);
                const { activity } = innerDc.context;
                await userTokenClient.signOutUser(activity.from.id, this.connectionName, activity.channelId);

                await innerDc.context.sendActivity('You have been signed out.');
                return await innerDc.cancelAllDialogs();
            }
            if(text.trim().toLocaleLowerCase() === 'notify me') {
                  const userTokenClient = innerDc.context.turnState.get(innerDc.context.adapter.UserTokenClientKey);
                  const { activity, adapter} = innerDc.context;
                  console.log("inside UM dialog reached");
                  userTokenClient.getUserToken(activity.from.id, this.connectionName, activity.channelId).then(async e=>{
                      console.log("Inside OAuthHelpers.startSubscription Um dialog");
                      await OAuthHelpers.startSubscription(adapter, activity.from.id, e, this.cid, this.appid);
                  }).catch((e) =>{
                    console.log("Error inside UM dialog");
                  })
            }
            if (text.trim().toLocaleLowerCase() === 'upcoming meeting') {
                const userTokenClient = innerDc.context.turnState.get(innerDc.context.adapter.UserTokenClientKey);
                const { activity, adapter } = innerDc.context;
                console.log("inside UM dialog reached");
                userTokenClient.getUserToken(activity.from.id, this.connectionName, activity.channelId).then(async e=>{
                    await OAuthHelpers.showUpcomingMeetings(adapter,activity.from.aadObjectId, activity.from.name , e);
                })
                
               

                // const userTokenClient = innerDc.context.turnState.get(innerDc.context.adapter.UserTokenClientKey);
                // const { activity } = innerDc.context;
                // await userTokenClient.signOutUser(activity.from.id, this.connectionName, activity.channelId);
                // await innerDc.context.sendActivity('You have been signed out.');
                // return await innerDc.cancelAllDialogs();
            }
        }
    }
}

module.exports.eventHandlerDialog = eventHandlerDialog;
