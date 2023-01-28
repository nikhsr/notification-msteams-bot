"use strict";
const {
    ActionTypes,
    CardFactory,
    MessageFactory,
    TeamsActivityHandler,
    TeamsInfo,
    TurnContext,
} = require('botbuilder');
var fs = require("fs");
const i18n = require("i18n");
const btoa = require("btoa");
const TextEncoder = require('util').TextEncoder;
const ACData = require('adaptivecards-templating');
const AdaptiveCardTemplate = require('../resources/UserMentionCardTemplate.json');
var kspotanalytics = require("../kspot/kspotanalytics");
const { TaskModuleUIConstants } = require('../models/taskmoduleuiconstants');
const { TaskModuleIds } = require('../models/taskmoduleids');
const { TaskModuleResponseFactory } = require('../models/taskmoduleresponsefactory');
const WelcomeCard = require('../resources/welcomeCard');
const { OAuthHelpers } = require('./oAuthHelpers');
const dbHelper = require('../helpers/dbHelper');

const Actions = [
    TaskModuleUIConstants.AdaptiveCard,
    TaskModuleUIConstants.CustomForm,
    TaskModuleUIConstants.Find,
    TaskModuleUIConstants.Location,
    TaskModuleUIConstants.Help,
    TaskModuleUIConstants.Extras
];


class TeamsConversationBot extends TeamsActivityHandler {
    constructor(config,userState,conversationState, dialog, conversationReferences) {
        super();
        this.botconfig = config;
        const cid = this.botconfig.cid;
        this.dialog = dialog;
        this.userState = userState;
        this.conversationState = conversationState;
        this.dialogState = this.conversationState.createProperty('DialogState');
        this.profileAccessor = this.userState.createProperty('UserProfile');
        this.conversationReferences = conversationReferences;

        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);

            await next();
        });

        this.onMessage(async (context, next) => {
            TurnContext.removeRecipientMention(context.activity);
            this.addConversationReference(context.activity);
            // Run the Dialog with the new message Activity.
            
            const text = context.activity.text.trim().toLocaleLowerCase();
            var query = text.split(" ");
            var arg = query.length>1 ? query.slice(1).join(" ") : '';
            console.log(query);
            if (query[0].includes('mention me')) {
                await this.mentionAdaptiveCardActivityAsync(context);
            } else if (query[0].includes('mention')) {
                await this.mentionActivityAsync(context);
            } else if (query[0].toLowerCase() == 'hello' || query[0].toLowerCase() === 'hi' || query[0].toLowerCase() === 'hey' || query[0].toLowerCase() ==='help' || query[0].toLowerCase() ==='hlw') {
                //await context.sendActivity(i18n.__("hi"));
                //var info = await TeamsInfo.getMember()
                console.log(context.activity.from.name);
                var welcomecard = WelcomeCard.setup(context.activity.from.name,this.botconfig["functions"]);
                const welcomeCard = CardFactory.adaptiveCard(welcomecard);
                await context.sendActivity({ attachments: [welcomeCard] });
            } else if (query[0].toLowerCase() == 'bye') {
                await context.sendActivity(i18n.__("bye"));
            }  else if (query[0].includes('login') || (query[0].includes('notify') && query[1].includes('me')) || (query[0].includes('upcoming') && query[1].includes('meeting'))|| query[0].includes('logout') || query[0].includes('no') || query[0].includes('yes')) {
                // await this.dialog.run(context, this.dialogState);
                // if(query[0].includes('login')){
                //     const userTokenClient = context.turnState.get(context.adapter.UserTokenClientKey);
                //     if(userTokenClient) {
                //         //const { activity } = context;
                //         await dbHelper.getUserConversationData(id).then(async (conversation)=>{
                //             await adapter.continueConversationAsync(conversation.bot.id.split(":")[1], conversation, async context => {
                //                 await context.sendActivity("You already logged in!!");
                //             });
                //         });
                //         //userTokenClient.getUserToken(activity.from.id, this.botconfig.connectionName, activity.channelId).then(async e=>{
                //         await context.sendActivity("You already logged in!!");
                //        // });
                //     }
                //     else {
                //         await this.dialog.run(context, this.dialogState);
                //     }
                // }
            
                await this.dialog.run(context, this.dialogState);
                
                
            }   else if (query[0].includes('zoom')) {
                // var attachments = await kspotanalytics.login(cid,context);
                // attachments.forEach(async card => {
                //     await context.sendActivity(MessageFactory.attachment(card));
                // });
                await this.dialog.run(context, this.dialogState);
            }  
            else {
                await context.sendActivity(i18n.__("search_wait"));
                var andQuery = query.join(" ");
                var attachments = await kspotanalytics.searchUser(cid,context, andQuery);
                attachments.forEach(async card => {
                    await context.sendActivity(MessageFactory.attachment(card));
                });
            }
           
            await next();
        });

         // Sends welcome messages to conversation members when they join the conversation.
        this.onTeamsMembersAddedEvent(async (
            membersAdded,
            teamInfo,
            context,
            next) => {
        
            context.activity.membersAdded.forEach(async (teamMember) => {
        
                if (teamMember.id !== context.activity.recipient.id) {
                    var welcomecard = WelcomeCard.setup(teamMember.name, this.botconfig["functions"]);
                    const welcomeCard = CardFactory.adaptiveCard(welcomecard);
                    await context.sendActivity({ attachments: [welcomeCard] });
                    await this.dialog.run(context, this.dialogState);  
                }
            
            });
            await next();
        });
       
        this.onTokenResponseEvent(async (context, next) => {
            console.log('Running dialog with Token Response Event Activity.');

            // Run the Dialog with the new Token Response Event Activity.
            await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
        
       
    }

    addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        console.log(this.conversationReferences);
        this.conversationReferences[conversationReference.user.aadObjectId] = conversationReference;
    }
    
    setTaskInfo(taskInfo, uiSettings) {
        taskInfo.height = uiSettings.height;
        taskInfo.width = uiSettings.width;
        taskInfo.title = uiSettings.title;
    }
    getTaskModuleHeroCardOptions() {
        return CardFactory.heroCard(
            'Task Module Invocation from Hero Card',
            '',
            null, // No images
            Actions.map((cardType) => {
                return {
                    type: 'invoke',
                    title: cardType.buttonTitle,
                    value: {
                        type: 'task/fetch',
                        data: cardType.id
                    }
                };
            })
        );
    }

    getTaskModuleAdaptiveCardOptions() {
        const adaptiveCard = {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.0',
            type: 'AdaptiveCard',
            body: [
                {
                    type: 'TextBlock',
                    text: 'Task Module Invocation from Adaptive Card',
                    weight: 'bolder',
                    size: 3
                }
            ],
            actions: Actions.map((cardType) => {
                return {
                    type: 'Action.Submit',
                    title: cardType.buttonTitle,
                    data: { msteams: { type: 'task/fetch' }, data: cardType.id }
                };
            })
        };
        return CardFactory.adaptiveCard(adaptiveCard);
    }

    async handleTeamsSigninVerifyState(context, state) {
        console.log("Handling Sign in ")
        console.log(context._activity);
        var activity = context._activity;
        var user = {
            channelId: activity.channelId,
            conversation: activity.conversation,
            fromId: activity.from.id,
            fromRole: null,
            fromName: activity.from.name,
            recipientId: activity.recipient.id,
            recipientName: activity.recipient.name,
            _id: activity.from.aadObjectId,
            locale: activity.locale,
            localTimezone: activity.localTimezone,
            serviceUrl: activity.serviceUrl,

          }
        dbHelper.saveTeamsUser(user);
        await context.sendActivity("You are successfully signed in !!");
        await this.dialog.run(context, this.dialogState);
    }

    createAdaptiveCardAttachment() {
        return CardFactory.adaptiveCard({
            version: '1.0.0',
            type: 'AdaptiveCard',
            body: [
                {
                    type: 'TextBlock',
                    text: 'Enter Text Here'
                },
                {
                    type: 'Input.Text',
                    id: 'usertext',
                    placeholder: 'add some text and submit',
                    IsMultiline: true
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Submit'
                }
            ]
        });
    }

    handleTeamsTaskModuleFetch(context, taskModuleRequest){
        // Called when the user selects an options from the displayed HeroCard or
        // AdaptiveCard.  The result is the action to perform.
        
        var baseUrl = this.botconfig.baseUrl || this.botconfig.host;
        const cardTaskFetchValue = taskModuleRequest.data.data;
        
        var taskInfo = {}; // TaskModuleTaskInfo
        console.log(cardTaskFetchValue.option,TaskModuleIds.Location)
        if (cardTaskFetchValue.option === "helpInfo") {
            console.log(baseUrl + '/teams/' + TaskModuleIds.WelcomeCard + '.html?url='+cardTaskFetchValue.option);
            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + TaskModuleIds.WelcomeCard + '.html?url='+cardTaskFetchValue.option+'&lang='+this.botconfig.language || 'en';
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.Help);
        } else if (cardTaskFetchValue.option === "apstatusInfo") {
            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + TaskModuleIds.WelcomeCard + '.html?url='+cardTaskFetchValue.option+'&lang='+this.botconfig.language || 'en';
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.Apstatus);
        } else if (cardTaskFetchValue.option === "findInfo") {
            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + TaskModuleIds.WelcomeCard + '.html?url='+cardTaskFetchValue.option+'&lang='+this.botconfig.language || 'en';
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.Find);
        } else if (cardTaskFetchValue.option === "locationInfo") {
            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + TaskModuleIds.WelcomeCard + '.html?url='+cardTaskFetchValue.option+'&lang='+this.botconfig.language || 'en';
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.Location);
        } else if (cardTaskFetchValue.option == TaskModuleIds.Location) {
            var encodedUrl = btoa(cardTaskFetchValue.url);
            var caller=btoa(cardTaskFetchValue.caller);
            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + 'Location.html?url='+ encodedUrl+'&cid='+this.botconfig.cid+'&contentPath='+cardTaskFetchValue.contentPath+'&caller='+caller+'&lang='+this.botconfig.language || 'en';
            console.log(taskInfo.url);
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.Location);
        } else if (cardTaskFetchValue.option == "meeting") {
            var displayURL;
            var caller=btoa(cardTaskFetchValue.caller);
            if(cardTaskFetchValue.type == 'zoom'){
                displayURL = baseUrl + '/teams/' + 'zoom.html?meetingid='+cardTaskFetchValue.meetingid+'&meetingpassword='+cardTaskFetchValue.meetingpassword+'&cid='+this.botconfig.cid;
                taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + 'meetingHandler.html?displayUrl='+ btoa(displayURL)+'&cid='+this.botconfig.cid+'&caller='+caller+'&displayTime='+cardTaskFetchValue.displayTime +'&lang='+this.botconfig.language || 'en';
            }
            if(cardTaskFetchValue.type == 'teams'){
                displayURL = baseUrl + '/teams/' + 'placeholder.html'; // TODO: clickable meeting link for teams is to be made.
                taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + 'placeholder.html'+'?lang='+cardTaskFetchValue.lang;
            }
            console.log(taskInfo.url);
            //taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + 'meetingHandler.html?displayUrl='+ btoa(displayURL)+'&cid='+this.botconfig.cid+'&caller='+caller;
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.Location);
        } else if (cardTaskFetchValue.option === "apstatusUpList") {
            
            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + TaskModuleIds.ApstatusDeviceList + '.html?url='+cardTaskFetchValue.option +'&data='+cardTaskFetchValue.apstatusUpData+'&lang='+this.botconfig.language || 'en';
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.ApstatusDeviceList);

        }else if (cardTaskFetchValue.option === "apstatusDownList") {

            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + TaskModuleIds.ApstatusDeviceList + '.html?url='+cardTaskFetchValue.option +'&data='+cardTaskFetchValue.apstatusDownData+'&lang='+this.botconfig.language || 'en';
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.ApstatusDeviceList);
        }else if(cardTaskFetchValue.option === "UserInfo"){
            taskInfo.url = taskInfo.fallbackUrl = baseUrl + '/teams/' + TaskModuleIds.UserInfo + '.html?data='+cardTaskFetchValue.userInfoData+'&cid='+this.botconfig.cid+'&lang='+this.botconfig.language || 'en';
            console.log("==========> task info URL",taskInfo.url)
            this.setTaskInfo(taskInfo, TaskModuleUIConstants.UserInfo);
        }
        

        return TaskModuleResponseFactory.toTaskModuleResponse(taskInfo);
    }

    async handleTeamsTaskModuleSubmit(context, taskModuleRequest) {
        // Called when data is being returned from the selected option (see `handleTeamsTaskModuleFetch').
    
        // Echo the users input back.  In a production bot, this is where you'd add behavior in
        // response to the input.
        await context.sendActivity(MessageFactory.text('handleTeamsTaskModuleSubmit: ' + JSON.stringify(taskModuleRequest.data)));
    
        // Return TaskModuleResponse
        return {
            // TaskModuleMessageResponse
            task: {
                type: 'message',
                value: 'Thanks!'
            }
        };
    }
    async SendNotificationToAllUsersAsync(context) {
        const TeamMembers = await TeamsInfo.getPagedMembers(context);
        let Sent_msg_Cout = TeamMembers.members.length;
        TeamMembers.members.map(async member => {
            const ref = TurnContext.getConversationReference(context.activity);
            ref.user = member;
            await context.adapter.createConversation(ref, async (context) => {
                const ref = TurnContext.getConversationReference(context.activity);
                await context.adapter.continueConversation(ref, async (context) => {
                   // await context.sendActivity("Proactive hello.");
                });
            });
        });
       // await context.sendActivity(MessageFactory.text("Message sent:" + Sent_msg_Cout));
    }

    async cardActivityAsync(context, isUpdate) {
        const cardActions = [
            {
                type: ActionTypes.MessageBack,
                title: 'Message all members',
                value: null,
                text: 'MessageAllMembers',
            },
            {
                type: ActionTypes.MessageBack,
                title: 'Who am I?',
                value: null,
                text: 'whoami',
            },
            {
                type: ActionTypes.MessageBack,
                title: 'Find me in Adaptive Card',
                value: null,
                text: 'mention me',
            },
            {
                type: ActionTypes.MessageBack,
                title: 'Delete card',
                value: null,
                text: 'Delete',
            }
        ];

        if (isUpdate) {
            await this.sendUpdateCard(context, cardActions);
        } else {
            await this.sendWelcomeCard(context, cardActions);
        }
    }

    async sendUpdateCard(context, cardActions) {
        const data = context.activity.value;
        data.count += 1;
        cardActions.push({
            type: ActionTypes.MessageBack,
            title: 'Update Card',
            value: data,
            text: 'UpdateCardAction',
        });
        const card = CardFactory.heroCard(
            'Updated card',
            `Update count: ${data.count}`,
            null,
            cardActions
        );
        card.id = context.activity.replyToId;
        const message = MessageFactory.attachment(card);
        message.id = context.activity.replyToId;
        await context.updateActivity(message);
    }

    async sendWelcomeCard(context, cardActions) {
        const initialValue = {
            count: 0,
        };
        cardActions.push({
            type: ActionTypes.MessageBack,
            title: 'Update Card',
            value: initialValue,
            text: 'UpdateCardAction',
        });
        const card = CardFactory.heroCard(
            'Welcome card',
            '',
            null,
            cardActions
        );
        await context.sendActivity(MessageFactory.attachment(card));
    }

    async getSingleMember(context) {
        console.log(context)
        try {
            const member = await TeamsInfo.getMember(
                context,
                context.activity.from.id
            );
            console.log("hi")
            const message = MessageFactory.text(`You are: ${member.name}`);
            await context.sendActivity(message);
        } catch (e) {
            if (e.code === 'MemberNotFoundInConversation') {
                return context.sendActivity(MessageFactory.text('Member not found.'));
            } else {
                throw e;
            }
        }
    }

    async mentionAdaptiveCardActivityAsync(context) {
        var member;
        try {
            member = await TeamsInfo.getMember(
                context,
                context.activity.from.id
            );
        } catch (e) {
            if (e.code === 'MemberNotFoundInConversation') {
                return context.sendActivity(MessageFactory.text('Member not found.'));
            } else {
                throw e;
            }
        }

        const template = new ACData.Template(AdaptiveCardTemplate);
        const memberData = {
            userName: member.name,
            userUPN: member.userPrincipalName,
            userAAD: member.aadObjectId
        };

        const adaptiveCard = template.expand({
            $root: memberData
        });

        await context.sendActivity({
            attachments: [CardFactory.adaptiveCard(adaptiveCard)]
        });
    }

    async mentionActivityAsync(context) {
        const mention = {
            mentioned: context.activity.from,
            text: `<at>${new TextEncoder().encode(
                context.activity.from.name
            )}</at>`,
            type: 'mention'
        };

        const replyActivity = MessageFactory.text(`Hi ${mention.text}`);
        replyActivity.entities = [mention];
        await context.sendActivity(replyActivity);
    }

    async deleteCardActivityAsync(context) {
        await context.deleteActivity(context.activity.replyToId);
    }

    async messageAllMembersAsync(context) {
        const members = await this.getPagedMembers(context);

        await Promise.all(members.map(async (member) => {
            const message = MessageFactory.text(
                `Hello ${member.givenName} ${member.surname}. I'm a Teams conversation bot.`
            );

            const convoParams = {
                members: [member],
                tenantId: context.activity.channelData.tenant.id,
                activity: context.activity
            };

            await context.adapter.createConversationAsync(
                process.env.MicrosoftAppId,
                context.activity.channelId,
                context.activity.serviceUrl,
                null,
                convoParams,
                async (context) => {
                    const ref = TurnContext.getConversationReference(context.activity);

                    await context.adapter.continueConversationAsync(
                        process.env.MicrosoftAppId,
                        ref,
                        async (context) => {
                            await context.sendActivity(message);
                        });
                });
        }));

        await context.sendActivity(MessageFactory.text('All messages have been sent.'));
    }

    async getPagedMembers(context) {
        let continuationToken;
        const members = [];

        do {
            const page = await TeamsInfo.getPagedMembers(
                context,
                100,
                continuationToken
            );

            continuationToken = page.continuationToken;

            members.push(...page.members);
        } while (continuationToken !== undefined);

        return members;
    }

    async onTeamsChannelCreated(context) {
        const card = CardFactory.heroCard(
            'Channel Created',
            `${context.activity.channelData.channel.name} is new the Channel created`
        );
        const message = MessageFactory.attachment(card);
        await context.sendActivity(message);
    }

    async onTeamsChannelRenamed(context) {
        const card = CardFactory.heroCard(
            'Channel Renamed',
            `${context.activity.channelData.channel.name} is the new Channel name`
        );
        const message = MessageFactory.attachment(card);
        await context.sendActivity(message);
    }

    async onTeamsChannelDeleted(context) {
        const card = CardFactory.heroCard(
            'Channel Deleted',
            `${context.activity.channelData.channel.name} is deleted`
        );
        const message = MessageFactory.attachment(card);
        await context.sendActivity(message);
    }

    async onTeamsChannelRestored(context) {
        const card = CardFactory.heroCard(
            'Channel Restored',
            `${context.activity.channelData.channel.name} is the Channel restored`
        );
        const message = MessageFactory.attachment(card);
        await context.sendActivity(message);
    }

    async onTeamsTeamRenamed(context) {
        const card = CardFactory.heroCard(
            'Team Renamed',
            `${context.activity.channelData.team.name} is the new Team name`
        );
        const message = MessageFactory.attachment(card);
        await context.sendActivity(message);
    }

    async run(context){
        await super.run(context); 
        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context,false);
        await this.userState.saveChanges(context,false);
        // await this.userState.SetPropertyValueAsync(context, "zoomAccessToken", "sample");
        // console.log(this.userState.GetPropertyValueAsync(context, "zoomAccessToken"))
        }

}

module.exports.TeamsConversationBot = TeamsConversationBot;