const { SimpleGraphClient } = require('../simple-graph-client');
const { ActionTypes, CardFactory, MessageFactory, TeamsActivityHandler, TeamsInfo, TurnContext, CardAction } = require('botbuilder');
const dbHelper = require('../helpers/dbHelper');
var botsettings = require('../../config/botsettings');
const moment = require('moment');
var s3 = require('../s3/operations');
var ON_DUPLO = process.env['ON_DUPLO'] === 'true';


var getHost = {};
if (ON_DUPLO) {
  console.log("Using S3 for config storage, oAuthHelper.js");
  s3.getConfig()
    .then((botsetting) => {
      botsetting.bots.forEach(function (cust) {
        getHost[cust.cid] = {
          host: cust.host || process.env.JAMESON_HOST,
        };
      });
    })
    .catch((err) => console.log("Can't read settings", err));
} else {
  botsettings.bots.forEach(function (cust) {
    getHost[cust.cid] = {
      host: cust.host || process.env.JAMESON_HOST,
    };
  });
}

/**
 * These methods call the Microsoft Graph API. The following OAuth scopes are used:
 * 'openid' 'profile' 'User.Read'
 * for more information about scopes see:
 * https://developer.microsoft.com/en-us/graph/docs/concepts/permissions_reference
 */
class OAuthHelpers {
  /**
   * Send the user their Graph Display Name from the bot.
   * @param {TurnContext} context A TurnContext instance containing all the data needed for processing this conversation turn.
   * @param {TokenResponse} tokenResponse A response that includes a user token.
   */
  static async listMe(context, tokenResponse) {
    if (!context) {
      throw new Error('OAuthHelpers.listMe(): `context` cannot be undefined.');
    }
    if (!tokenResponse) {
      throw new Error('OAuthHelpers.listMe(): `tokenResponse` cannot be undefined.');
    }

    // Pull in the data from Microsoft Graph.
    const client = new SimpleGraphClient(tokenResponse.token);
    const me = await client.getMe();
    return me;
    //await context.sendActivity(`You are ${ me.displayName }.`);
  }

  static async startSubscription(adapter, id, tokenResponse, cid, appid) {
    if (!tokenResponse) {
      throw new Error('OAuthHelpers.listMe(): `tokenResponse` cannot be undefined.');
    }

    // Pull in the data from Microsoft Graph.
    const client = new SimpleGraphClient(tokenResponse.token);
    console.log(getHost[cid].host, cid, 'Inside startSubscription getHost');
    const data = await client.startCalenderSubscription(getHost[cid].host, cid);
    console.log('Subscription Data');
    console.log(data);
    dbHelper.saveSubscriptionData(data);
    await dbHelper.getUserConversationData(data.creatorId).then(async conversation => {
      await adapter.continueConversationAsync(appid, conversation, async context => {
        await context.sendActivity(`Subscription for Calender Notification Started`);
      });
    });
  }

  /**
   * Send the user their Graph Email Address from the bot.
   * @param {TurnContext} context A TurnContext instance containing all the data needed for processing this conversation turn.
   * @param {TokenResponse} tokenResponse A response that includes a user token.
   */
  static async listEmailAddress(context, tokenResponse) {
    if (!context) {
      throw new Error('OAuthHelpers.listEmailAddress(): `context` cannot be undefined.');
    }
    if (!tokenResponse) {
      throw new Error('OAuthHelpers.listEmailAddress(): `tokenResponse` cannot be undefined.');
    }

    // Pull in the data from Microsoft Graph.
    const client = new SimpleGraphClient(tokenResponse.token);
    const me = await client.getMe();

    await context.sendActivity(`Your email: ${me.mail}.`);
  }

  static async showUpcomingMeetings(adapter, id, name, tokenResponse, cid) {
    if (!tokenResponse) {
      throw new Error('OAuthHelpers.listEmailAddress(): `tokenResponse` cannot be undefined.');
    }
    // Pull in the data from Microsoft Graph.

    var userName = name;
    const client = new SimpleGraphClient(tokenResponse.token);

    await dbHelper.getUserConversationData(id).then(async conversation => {
      var cards = [];
      var tz = conversation.localTimezone;
      await client
        .getUpcomingMeeting(tz)
        .then(async meetings => {
          console.log(meetings);
          meetings.forEach((meetingObject, index) => {
            var meetingObject = JSON.parse(JSON.stringify(meetingObject));
            if (meetingObject.onlineMeeting == null && meetingObject.location.displayName.includes('zoom')) {
              meetingObject.onlineMeeting = { joinUrl: meetingObject.location.displayName };
            }
            console.log(meetingObject.onlineMeeting,"ONLINE MEETING");
            if (meetingObject.onlineMeeting != null) {
              //add necessary conditions meetingObject.onlineMeeting.joinUrl.includes("zoom")
              var displayTime = (moment.utc(meetingObject.end.dateTime) - moment.utc(meetingObject.start.dateTime)) / 1000;
              console.log(displayTime);
              var card = CardFactory.adaptiveCard({
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.0',
                body: [
                  {
                    type: 'TextBlock',
                    weight: 'bolder',
                    text: meetingObject.subject,
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    weight: 'bolder',
                    text: 'Start: ' + moment.utc(meetingObject.start.dateTime).tz(tz).format('LLLL'),
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    weight: 'bolder',
                    text: 'End: ' + moment.utc(meetingObject.end.dateTime).tz(tz).format('LLLL'),
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    text: meetingObject.onlineMeeting.joinUrl.includes('zoom')
                      ? meetingObject.bodyPreview
                      : 'Join Teams Meeting Directly from KloudBot.',
                    wrap: true,
                  },
                  {
                    type: 'Image',
                    url: meetingObject.onlineMeeting.joinUrl.includes('zoom')
                      ? 'https://logos-world.net/wp-content/uploads/2021/02/Zoom-Emblem.png'
                      : 'https://download.logo.wine/logo/Microsoft_Teams/Microsoft_Teams-Logo.wine.png',
                    size: 'medium',
                  },
                ],
                actions: meetingObject.onlineMeeting.joinUrl.includes('zoom')
                  ? [
                      {
                        type: 'Action.Submit',
                        title: 'Join Meeting on Display',
                        // "url": meetingObject.onlineMeeting.joinUrl+"&anon=true",
                        data: {
                          msteams: { type: 'task/fetch' },
                          data: {
                            option: 'meeting',
                            meetingid: meetingObject.onlineMeeting.joinUrl.split('?')[0].split('/').slice(-1)[0],
                            meetingpassword: meetingObject.bodyPreview.match(/Passcode: ([0-9a-zA-Z\-\.]+)/)[0].slice(10),
                            type: 'zoom',
                            caller: userName,
                            displayTime: displayTime,
                          },
                        },
                      },
                      {
                        type: 'Action.OpenUrl',
                        title: 'Join Meeting',
                        url: meetingObject.onlineMeeting.joinUrl + '&anon=true',
                        //'data': { msteams: { type: 'task/fetch' }, data: {option:'zoom', meetingid:'73552774903', meetingpassword:'6JTFxE'}}
                      },
                    ]
                  : [
                      {
                        type: 'Action.OpenUrl',
                        title: 'Join Meeting',
                        url: meetingObject.onlineMeeting.joinUrl + '&anon=true',
                        //'data': { msteams: { type: 'task/fetch' }, data: {option:'zoom', meetingid:'73552774903', meetingpassword:'6JTFxE'}}
                      },
                    ],
              });
              cards.push(card);
            }
          });
        })
        .catch(e => {
          console.log(e);
        });
      //  if(cards.length !=0){
      console.log('%$#%$#@%$#', cards);
      if (cards.length != 0) {
        await adapter.continueConversationAsync(conversation.bot.id.split(':')[1], conversation, async context => {
          await context.sendActivity(MessageFactory.attachment(cards[cards.length - 1]));
        });
      } else {
        await adapter.continueConversationAsync(conversation.bot.id.split(':')[1], conversation, async context => {
          await context.sendActivity('#### No upcoming meeting found !!');
        });
      }
    });
    //await contextHolder.sendActivity(cards.length !=0 ? MessageFactory.attachment(cards[cards.length -1]) : 'No Upcoming Zoom meeting found.' );
    // }   else {
    //     await context.sendActivity('No Upcoming Zoom meeting found.');
    // }
    //console.log(cards.length);
    //  cards.forEach((card,index) => {
    //         setTimeout(async () => {
    //             console.log("sending card  "+ index);

    //         }, index*2000);
    //         //await context.sendActivity(MessageFactory.attachment(card));
    //     });

    //await context.sendActivity(MessageFactory.attachment(cards[0]))
    // if(cards.length>1) {
    //     await context.sendActivity(MessageFactory.attachment(cards[1]))
    // }
  }

  static async sendNextMeeting(adapter, id, appid, tokenResponse, name, cid) {
    if (!tokenResponse) {
      throw new Error('OAuthHelpers.listEmailAddress(): `tokenResponse` cannot be undefined.');
    }
    // Pull in the data from Microsoft Graph.
    var userName = name;
    const client = new SimpleGraphClient(tokenResponse.token);
    await dbHelper.getUserConversationData(id).then(async conversation => {
      var cards = [];
      var tz = conversation.localTimezone;
      var action = [];
      await client
        .getNextMeeting(tz, 60 * 60 * 1000)
        .then(async meetings => {
          meetings.forEach((meetingObject, index) => {
            var meetingObject = JSON.parse(JSON.stringify(meetingObject));
            if (meetingObject.onlineMeeting) {
              //add necessary conditions
              var displayTime = (moment.utc(meetingObject.end.dateTime) - moment.utc(meetingObject.start.dateTime)) / 1000;
              if (meetingObject.onlineMeeting.joinUrl.includes('zoom')) {
                action = [
                  {
                    type: 'Action.Submit',
                    title: 'Join Meeting on Display',
                    data: {
                      msteams: { type: 'task/fetch' },
                      data: {
                        option: 'meeting',
                        meetingid: meetingObject.onlineMeeting.joinUrl.split('?')[0].split('/').slice(-1)[0],
                        meetingpassword: meetingObject.bodyPreview.match(/Passcode: ([0-9a-zA-Z\-\.]+)/)[0].slice(10),
                        type: 'zoom',
                        caller: userName,
                        displayTime: displayTime,
                      },
                    },
                  },
                  {
                    type: 'Action.OpenUrl',
                    title: 'Join Meeting',
                    url: meetingObject.onlineMeeting.joinUrl + '&anon=true',
                  },
                ];
              } else {
                action = [
                  {
                    type: 'Action.OpenUrl',
                    title: 'Join Meeting',
                    url: meetingObject.onlineMeeting.joinUrl + '&anon=true',
                  },
                ];
              }
              var card = CardFactory.adaptiveCard({
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.0',
                body: [
                  {
                    type: 'TextBlock',
                    weight: 'bolder',
                    text: meetingObject.subject,
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    weight: 'bolder',
                    text: 'Start: ' + moment.utc(meetingObject.start.dateTime).tz(tz).format('LLLL'),
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    weight: 'bolder',
                    text: 'End: ' + moment.utc(meetingObject.end.dateTime).tz(tz).format('LLLL'),
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    text: meetingObject.bodyPreview,
                    wrap: true,
                  },
                  {
                    type: 'Image',
                    url: meetingObject.onlineMeeting.joinUrl.includes('zoom')
                      ? 'https://logos-world.net/wp-content/uploads/2021/02/Zoom-Emblem.png'
                      : 'https://download.logo.wine/logo/Microsoft_Teams/Microsoft_Teams-Logo.wine.png',
                    size: 'medium',
                  },
                ],
                actions: action,
              });
              cards.push(card);
            }
          });
        })
        .catch(e => {
          console.log(e);
        });
      if (cards.length != 0) {
        await adapter.continueConversationAsync(appid, conversation, async context => {
          await context.sendActivity(MessageFactory.attachment(cards[cards.length - 1]));
        });
      }
    });
  }
}

exports.OAuthHelpers = OAuthHelpers;
