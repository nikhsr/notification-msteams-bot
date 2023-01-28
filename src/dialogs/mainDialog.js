const { ConfirmPrompt, DialogSet, DialogTurnStatus, OAuthPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { NullTelemetryClient } = require("botbuilder");

const { eventHandlerDialog } = require('./eventHandlerDialog');
const { OAuthHelpers } = require('../bot/oAuthHelpers');
const dbHelper = require("../helpers/dbHelper");
const moment = require("moment");
const {SimpleGraphClient} = require("../simple-graph-client");

const CONFIRM_PROMPT = 'ConfirmPrompt';
const MAIN_DIALOG = 'MainDialog';
const MAIN_WATERFALL_DIALOG = 'MainWaterfallDialog';
const OAUTH_PROMPT = 'OAuthPrompt';

class MainDialog extends eventHandlerDialog {
    constructor(cid, connectionName, appid) {
        super(MAIN_DIALOG, connectionName, cid, appid);
        this.cid = cid;
        this.addDialog(new OAuthPrompt(OAUTH_PROMPT, {
            connectionName: connectionName,
            text: 'Please Sign In',
            title: 'Sign In',
            timeout: 300000
        }));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
            this.promptStep.bind(this),
            this.loginStep.bind(this),
            this.displayTokenPhase1.bind(this),
            this.displayTokenPhase2.bind(this)
        ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} dialogContext
     */
    async run(context, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(context);
        dialogContext.dialogs.telemetryClient=new NullTelemetryClient();
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
        else{
            return;
        }
    }

    async promptStep(stepContext) {
        return await stepContext.beginDialog(OAUTH_PROMPT);
    }

    async loginStep(stepContext) {
        // Get the token from the previous step. Note that we could also have gotten the
        // token directly from the prompt itself. There is an example of this in the next method.
        const tokenResponse = stepContext.result;
        if (tokenResponse) {
           // await client.api(this.subscriptionPath).version('beta').create(subscriptionCreationInformation);
            // dbHelper.getSubscriptionDatabyId(stepContext.context._activity.from.aadObjectId).then(async data=>{
            //     var expire = new Date(data.expirationDateTime);
            //     if(data==null || (expire.getTime() - moment().unix()*1000<0)){
            //         const client = new SimpleGraphClient(tokenResponse.token);
            //         const d = await client.startCalenderSubscription(this.cid);
            //         dbHelper.saveSubscriptionData(d);
            //     } 
            // })
            dbHelper.updateTeamsUser(me.id, me.mail);
            return await stepContext.context.sendActivity(' ');
            // await OAuthHelpers.showUpcomingMeetings(stepContext.context, tokenResponse);
           // return await stepContext.prompt(CONFIRM_PROMPT, 'Would you like to view your token?');
           //await next();
        }
        await stepContext.context.sendActivity('Login was not successful please try again.');
        return await stepContext.endDialog();
    }

    async displayTokenPhase1(stepContext) {
        //await stepContext.context.sendActivity('Thank you.');

        const result = stepContext.result;
        if (result) {
            // Call the prompt again because we need the token. The reasons for this are:
            // 1. If the user is already logged in we do not need to store the token locally in the bot and worry
            // about refreshing it. We can always just call the prompt again to get the token.
            // 2. We never know how long it will take a user to respond. By the time the
            // user responds the token may have expired. The user would then be prompted to login again.
            //
            // There is no reason to store the token locally in the bot because we can always just call
            // the OAuth prompt to get the token or get a new token if needed.
            return await stepContext.beginDialog(OAUTH_PROMPT);
        }
        return await stepContext.endDialog();
    }

    async displayTokenPhase2(stepContext) {
        const tokenResponse = stepContext.result;
        if (tokenResponse) {
            //await stepContext.context.sendActivity(`Here is your token ${ JSON.stringify(tokenResponse) }`);
            await OAuthHelpers.listMe(stepContext.context, tokenResponse);
            await OAuthHelpers.listEmailAddress(stepContext.context, tokenResponse);
            await OAuthHelpers.showUpcomingMeetings(stepContext.context, tokenResponse, cid);

        }
        return await stepContext.endDialog();
    }
}

module.exports.MainDialog = MainDialog;
