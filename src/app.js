'use strict';

var s3 = require('./s3/operations');
const btoa = require("btoa");
var express = require('express');
var fs = require('fs');
var path = require('path');
//var exphbs = require("express-handlebars");
var bodyParser = require('body-parser');
var i18n = require('i18n');
var app = express();
const cron = require('node-cron');
//var zoomHandler = require("./bot/zoomHandler");
var ON_DUPLO = process.env['ON_DUPLO'] === 'true';
var botConfigurer = require('./bot/BotConfigurer');
const { TeamsConversationBot } = require('./bot/TeamsConversationBot');
const { MainDialog } = require('./dialogs/mainDialog');
const kspotDeviceEndpoints = require('./kspot/kspotDeviceManager');
const listener = require('../src/routes/listen');
const { OAuthHelpers } = require('./bot/oAuthHelpers');
const dbHelper = require('./helpers/dbHelper');
const utils = require('./helpers/utils');
var moment = require('moment');
const { listenRouter } = require('./routes/listen');
var extendSubscription = require('./helpers/webhookExtendsubscription');
var ANALYTICS = require('kloudspot-analytics-node-sdk');
const {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration,
  ConversationState,
  UserState,
  MemoryStorage,
  CardFactory,
  MessageFactory,
} = require('botbuilder');

process.env['NODE_CONFIG_DIR'] = __dirname + '/../internalconfig';

var config = require('config');
app.use('/teams', express.static(path.join(__dirname, 'pages')));
//app.use(favicon(path.join(__dirname, "static", "favicon.ico")));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb' }));

i18n.configure({
  locales: ['en', 'es', 'hi', 'ja', 'ru'],
  directory: __dirname + '/../locales',
});
//Set the default language to english (this is overwritten in each function)
i18n.setLocale('en');
app.use(i18n.init);

function ensureBotSettingsExist() {
  var botsettings = {};
  if (ON_DUPLO) {
    console.log('Using S3 for config storage');
    s3.getConfig()
      .then(config => {
        if (!config) {
          console.log('Initializing settings');
          s3.putConfig(botsettings);
        }
      })
      .catch(err => {
        console.log("Can't read settings", err);
        console.log('Initializing settings');
        s3.putConfig(botsettings)
          .then(s => console.log('Created settings on S3', s))
          .catch(err => console.log("Can't create S3 object", err));
      });
  } else {
    console.log('Using file system for config storage');
    const configdir = __dirname + '/../config';
    const settingsfile = configdir + '/botsettings.json';
    try {
      if (!fs.existsSync(settingsfile)) {
        fs.mkdirSync(configdir, { recursive: true });
        fs.writeFileSync(settingsfile, JSON.stringify(botsettings, null, '\t'));
        console.log('Created blank botsettings.json file');
      }
    } catch (err) {
      console.error(err);
    }
  }
}
ensureBotSettingsExist();

var options = {
  key: fs.readFileSync('./certs/kloudspot.key'),
  cert: fs.readFileSync('./certs/kloudspot.crt'),
};
// Deciding which port to use
var port = process.env.PORT || 3333;

//Start our nodejs app
app.listen(port, function () {
  console.log(`App started listening on port ${port}`);
});

var botConfigs;

botConfigurer.setup(app);
(async () => {
  if (ON_DUPLO) {
    console.log('Using S3 for config storage');
    s3.getConfig()
      .then(s => {
        botConfigs = s;
        initializeBotConfig();
      })
      .catch(err => console.log("Can't read settings", err));
  } else {
    let str = fs.readFileSync('config/botsettings.json');
    botConfigs = JSON.parse(str);
    initializeBotConfig()
  }
})();

function initializeBotConfig(){
  console.log("Inside initializeBotConfig");
  kspotDeviceEndpoints.setup(botConfigs.bots, app);
  listener.setup(botConfigs.bots);

  botConfigs.bots.forEach(botConfig => {
    if (botConfig.enabled) {

      let jameson_client = new ANALYTICS({
        id:botConfigs.appClientId,
        secretKey: botConfigs.appClientSecret,
        host: botConfigs.externalhost || process.env.JAMESON_HOST
    })

      const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
        MicrosoftAppId: botConfig.appid,
        MicrosoftAppPassword: botConfig.passwd,
      });

      const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

      const adapter = new CloudAdapter(botFrameworkAuthentication);

      adapter.onTurnError = async (context, error) => {
        console.error(`\n [onTurnError] unhandled error: ${error}`);
        // Send a trace activity, which will be displayed in Bot Framework Emulator
        await context.sendTraceActivity('OnTurnError Trace ', `${error}`, 'https://www.botframework.com/schemas/error', 'TurnError');
        // Send a message to the user
        //await context.sendActivity('The bot encountered an error or bug.');
        //await context.sendActivity('To continue to run this bot, please fix the bot source code.');
      };

      const dialog = new MainDialog(botConfig.cid, botConfig.connectionName, botConfig.appid);
      const memoryStorage = new MemoryStorage();
      // Create conversation and user state with in-memory storage provider.
      const conversationState = new ConversationState(memoryStorage);
      const userState = new UserState(memoryStorage);
      const conversationReferences = {};
      const bot = new TeamsConversationBot(botConfig, userState, conversationState, dialog, conversationReferences, adapter);
      //zoomHandler.setup(app,botConfig);
      console.log('teams/api/' + botConfig.cid + '/messages');

      app.post('/teams/api/' + botConfig.cid + '/messages', async (req, res) => {
        // Route received a request to adapter for processing
        await adapter.process(req, res, context => bot.run(context));
      });

      //Get Video URL
      function generateVideoURL(cameraId){
        jameson_client._getRequest('/api/v1/networkElements',(resp)=>{
          return resp;
      })
      }

      app.post('/teams/api/pushnotification/' + botConfig.cid, async (req, res) => {
        console.log(req.body, 'REQUEST BODY', JSON.parse(req.body));
        var parsedBody = JSON.parse(req.body);
        var numberOfPeople = '';
        var cameraId = '';
        var dsId = '';
        var locationId = '';
        var token = '';
        if (parsedBody.payload != null || parsedBody.payload != '');
        {
          numberOfPeople = parsedBody.payload.match('numOfPeople=[0-9]*');
          if (numberOfPeople) {
            numberOfPeople = numberOfPeople[0].split('=')[1];
          }
          cameraId = parsedBody.payload.match('cameraId=[0-9a-zA-Z-.]*');
          if (cameraId) {
            cameraId = cameraId[0].split('=')[1];
            var videoUrl = generateVideoURL(cameraId);
            console.log(videoUrl);
          }
          dsId = parsedBody.payload.match('dsId=[0-9a-zA-Z-:.]*');
          if(dsId){
            dsId = dsId[0].split("=")[1];
            dsId.split(":").join('');
          }
          locationId = parsedBody.payload.match('locationId=[0-9a-zA-Z-.]*')[0].split("=")[1];
          // if(locationId){
          //   dsId = dsId[0].split("=")[1];
          //   dsId.split(":").join('');
          // }


          var videoUrl = `http://${dsId}.natyas.co.in:8083/static/video_feed.html`;
          console.log("==============> Video URL",videoUrl);
          var emails = parsedBody.emails;

          var sent; // use later
          
          for (var email in emails) {
            await dbHelper
              .getUserByEmail(emails[email])
              .then(async conversation => {
                console.log(conversation.bot.id.split(':')[1]);
                var timestamp = moment.tz(conversation.localTimezone).format('DD/MM/YYYY HH:mm');
                
                
                if (conversation.bot.id.split(':')[1]) {
                  //TODO: add control statement

                  await adapter.continueConversationAsync(conversation.bot.id.split(':')[1], conversation, async context => {
                    console.log('@@@@@@', context.adapter.UserTokenClientKey);
                    var locationName = parsedBody.locationName + '';
                    locationName = locationName.split('&gt;')[locationName.split('&gt;').length - 1 ];
                    var notificationData = parsedBody.ruleName;
                    console.log(notificationData, 'NOTIFICATION DATA');
                    //Make an api call to jameson to get VideoUrl,
                    var cardd = CardFactory.adaptiveCard({
                      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                      type: 'AdaptiveCard',
                      version: '1.0',
                      body: [
                        {
                          type: 'TextBlock',
                          weight: 'bolder',
                          text: notificationData, // define 1
                        },
                        {
                          type: 'Image',
                          url: 'https://img.icons8.com/fluency-systems-regular/48/5c8fdc/rules.png',
                          size: 'medium',
                        },
                        {
                          type: 'TextBlock',
                          weight: 'bolder',
                          text: `${timestamp}`,
                          wrap: true,
                        },
                        {
                          type: 'TextBlock',
                          weight: 'bolder',
                          text: `People count : ${numberOfPeople} , Camera : ${cameraId}`,
                          wrap: true,
                        },
                        {
                          type: 'TextBlock',
                          text: `Location : ${locationName}`,
                          // "text":"Pawan"
                          wrap: true,
                        },
                      ],
                      actions: [
                        {
                          type: 'Action.OpenUrl',
                          title: 'Video Feed',
                          url: `${botConfig.host}/teams/proxy.html?contentPath=${videoUrl}&cid=${botConfig.cid}&locationId=${locationId}&cameraId=${cameraId}`,
                        },
                      ],
                    });

                    await context.sendActivity(MessageFactory.attachment(cardd));
                  });
                }
              })
              .catch(e => {
                console.log(e);
              });
          }
        }
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.write('<html><body><h1>Proactive messages have been sent.</h1></body></html>');
        res.end();
      });

      cron.schedule('0 0 * * *', function () {
        console.log('renew calender subscription cron started ' + moment());
        extendSubscription.renewSubscription(adapter, botConfig);
      });

      app.get('/teams/api/' + botConfig.cid + '/notifyuser/:id', async (req, res) => {
        // Route received a request to adapter for processing
        //console.log(JSON.stringify(conversationReferences));
        //  for (const conversationReference of Object.values(conversationReferences)) {
        await dbHelper
          .getUserConversationData(req.params.id)
          .then(async conversation => {
            console.log(conversation.bot.id.split(':')[1]);
            if (true) {
              //TODO: add control statement
              await adapter.continueConversationAsync(conversation.bot.id.split(':')[1], conversation, async context => {
                console.log('@@@@@@', context.adapter.UserTokenClientKey);
                const userTokenClient = context.turnState.get(context.adapter.UserTokenClientKey);
                if (userTokenClient) {
                  console.log('got token');
                  const { activity } = context;
                  console.log(activity.from.id, botConfig.connectionName, activity.channelId);
                  userTokenClient.getUserToken(activity.from.id, botConfig.connectionName, activity.channelId).then(async e => {
                    if (e != undefined) {
                      await OAuthHelpers.sendNextMeeting(adapter, req.params.id, botConfig.appid, e, conversation.user.name);
                    }
                  });
                }
                // await context.sendActivity('Testing the Notification Feature of Bot.');
              });
            }
          })
          .catch(e => {
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(400);
            res.write('<html><body><h1>Request Error ' + e + '</h1></body></html>');
            res.end();
          });

        //  }
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.write('<html><body><h1>Proactive messages have been sent.</h1></body></html>');
        res.end();
      });
    }
  });
}

app.use('/teams/listen', listenRouter);

cron.schedule('0 * * * *', function () {
  fs.readdir(__dirname + '/pages/tmpResources', (err, filenames) => {
    if (err) {
      console.log(err);
      return;
    }
    filenames = filenames.sort();
    filenames.forEach(function (filename, index) {
      if (filenames.length - index >= 50) {
        var file = filename.split('-')[filename.split('-').length - 1];
        var filetime = Number(file.substring(0, file.length - 4));
        if (filetime < moment().valueOf() - 15 * 24 * 60 * 60 * 1000) {
          if (!fs.existsSync(__dirname + '/pages/tmpResources/')) {
            console.log('Making temporary resource directory');
            fs.mkdirSync(__dirname + '/pages/tmpResources/');
          }
          fs.unlink(__dirname + '/pages/tmpResources/' + filename, err => {
            if (err) {
              console.log('Error encountered deleting file' + filename);
            }
          });
        }
      }
    });
  });
});
