"use strict";

module.exports.setup = function (app) {
  var appconfig = require("../appconfig");
  var request = require("request-promise");
  var fs = require("fs");
  var BASE_PATH = process.env.JAMESON_HOST;
  var s3 = require("../s3/operations");
  const ON_DUPLO = process.env["ON_DUPLO"] === "true";
  var exec =  require('child_process').exec;
  var customersBot;

const resolved = new Promise((resolve, reject) => {
    if (ON_DUPLO) {
              console.log("Using S3 for config storage, BotConfigurer.js");
              s3.getConfig()
                .then((s) => {
                  customersBot = s;
                })
                .catch((err) => console.log("Can't read settings", err));
            } else {
              let str = fs.readFileSync("config/botsettings.json");
              customersBot = JSON.parse(str);
            }
  });

  //API
  function restart() {
    setTimeout(() => {
      console.log("poking nodemon to restart");
      exec("pkill -f -SIGHUP nodemon");
    }, 2000);
  }
  
  //Just keeping it Just in case ...
  async function redeemAuthCodeForAccessToken(code) {
    let params = {
      grant_type: "authorization_code",
      code: code,
      client_id: "90175597-31d5-4e37-b636-bfffc0041c1b",
      client_secret: "_/3t0dXi?A.ay75c_Aw:NHN9/1/.tlNc",
      redirect_uri: BASE_PATH + "/teams/auth/azureADv1/callback",
      resource: "https://graph.microsoft.com",
    };
  
    let responseBody = await request.post({
      url: "https://login.microsoftonline.com/312d339b-bce5-4b32-8cde-bcb67e3d8344/oauth2/token",
      form: params,
      json: true,
    });
  
    return {
      accessToken: responseBody.access_token,
      expirationTime: responseBody.expires_on * 1000,
    };
  }
  
  /* API to get all botsettings configured in the system */
  // app.get("/teams/capabilities", function (req, res) {
  //   var commands = appconfig.privilegedcommands;
  //   res.write(JSON.stringify(commands));
  //   res.end();
  // });
  
  /* API to get all botsettings configured in the system */
  app.get("/teams/admin/botsettings", function (req, res) {
    if (ON_DUPLO) {
      console.log("Using S3 for config storage");
      s3.getConfig()
        .then((botsettings) => {
          res.write(JSON.stringify(botsettings));
          res.end();
        })
        .catch((err) => console.log("Can't read settings", err));
    } else {
      let str = fs.readFileSync("config/botsettings.json");
      const botsettings = JSON.parse(str);
      res.write(JSON.stringify(botsettings));
      res.end();
    }
  });
  
  /* API to update botsettings */
  app.post("/teams/configure/bot", function (req, res) {
    //console.log(req.body);
    var reqbody = [];
    if (req.body && Array.isArray(req.body)) {
      reqbody = req.body;
    }
    var bots = reqbody.map(function (d) {
      return {
        cid: d.key,
        name: d.name,
        appid: d.botId,
        passwd: d.botSecret,
        appClientId: d.appClientId,
        appClientSecret: d.appClientSecret,
        jamesonUsername:d.jamesonUsername || 'teams',
		    jamesonPassword:d.jamesonPassword || 'tJc3wWxVJstn32aZ!',
        connectionName: d.connectionName,
        host: d.host  || process.env.JAMESON_HOST,
        externalhost: d.hostname,
        enabled: d.enabled,
        language: d.language,
        functions: d.functions
      };
    });
    bots = bots || [];
    console.log(bots);
    var botsettings = { bots: bots };
    console.log(botsettings);
    if (ON_DUPLO) {
      console.log("Saving settings to S3");
      s3.putConfig(botsettings)
        .then((s) => {
          res.write(JSON.stringify(botsettings));
          res.end();
          restart();
        })
        .catch((err) => console.log("Can't read settings", err));
    } else {
      fs.writeFileSync(
        "config/botsettings.json",
        JSON.stringify(botsettings, null, "\t")
      );
      res.write(JSON.stringify(botsettings));
      res.end();
      restart();
    }
  });
  module.exports.setup = function () {
    return customersBot;
  };
  // Export the connectors for any downstream integration - e.g. registering a messaging extension
  return resolved;
};
