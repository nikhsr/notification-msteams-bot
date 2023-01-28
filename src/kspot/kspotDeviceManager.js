'use strict';

module.exports.setup = function (botConfigs, app) {
  var ANALYTICS = require('kloudspot-analytics-node-sdk');
  const axios = require('axios');
  const SNAPSHOT = require('./snapshot');
  var appconfig = require('../appconfig');
  var i18n = require('i18n');


  botConfigs.forEach((config, index) => {
    app.get('/teams/fetchcamera/' + config.cid, (req, res) => {
      var locationId = req.query.locationId;
      let jameson_client = new ANALYTICS({
        id: config.appClientId,
        secretKey: config.appClientSecret,
        host: config.externalhost || process.env.JAMESON_HOST,
      });
      jameson_client._getRequest('/api/v1/networkElements/location/' + locationId, resp => {
        res.status(200).json({
          data: resp,
        });
      });
    });

    app.post('/teams/display/publish/' + config.cid, (req, res) => {
      if (!config.functions.includes('displayaccess')) {
        res.status(400).json({
          data: 'Display Publish Restricted on this Bot!!',
        });
        return;
      }
      let jameson_client = new ANALYTICS({
        id: config.appClientId,
        secretKey: config.appClientSecret,
        host: config.externalhost || process.env.JAMESON_HOST,
      });
      var reqbody = req.body;
      console.log(reqbody);
      //get settings of NMS
      //API call to Jameson
      jameson_client._getRequest('/api/v1/setting/system/kloud-display-settings', response => {
        var data = response;
        if (data != null && data.value && data.value['enabled'] == true) {
          // res.status(200).json({
          //     data:data.value
          // });
          axios
            .post(data.value['baseURL'] + '/epsilon/api/public/v1/auth/login', {
              id: data.value['accountKey'],
              secretKey: data.value['accountSecret'],
            })
            .then(function (jwtresp) {
              const jwttoken = jwtresp.data;
              const payload = {
                termninalIds: [reqbody.id],
                nvPairs: {
                  url: reqbody.content,
                  displayTime: reqbody.displayTime != undefined ? reqbody.displayTime : 10 * 60,
                },
              };
              axios
                .post(data.value['baseURL'] + '/epsilon/api/public/v2/event/teams', payload, {
                  headers: {
                    Authorization: 'Bearer ' + jwttoken,
                    'Content-Type': 'application/json',
                  },
                })
                .then(function (clientresp) {
                  res.status(200).json({
                    data: clientresp.data,
                  });
                })
                .catch(e => {
                  console.log(e);
                  res.status(200).json({
                    data: e,
                  });
                });
            })
            .catch(e => {
              res.status(400).json({
                data: e,
              });
            });
        } else {
          res.status(400).json({
            data: 'No NMS settings found or enabled',
          });
        }
      });
    });
    console.log('#######/teams/display/endEvent/' + config.cid);
    app.post('/teams/display/endEvent/' + config.cid, (req, res) => {
      let jameson_client = new ANALYTICS({
        id: config.appClientId,
        secretKey: config.appClientSecret,
        host: config.externalhost || process.env.JAMESON_HOST,
      });
      var reqbody = req.body;
      var displayId = reqbody.displayId;
      //get settings of NMS
      //API call to Jameson
      jameson_client._getRequest('/api/v1/setting/system/kloud-display-settings', response => {
        var data = response;
        if (data != null && data.value && data.value['enabled'] == true) {
          axios
            .post(data.value['baseURL'] + '/epsilon/api/public/v1/auth/login', {
              id: data.value['accountKey'],
              secretKey: data.value['accountSecret'],
            })
            .then(function (jwtresp) {
              const jwttoken = jwtresp.data;
              axios
                .post(data.value['baseURL'] + '/epsilon/api/public/v2/event/end', displayId, {
                  headers: {
                    Authorization: 'Bearer ' + jwttoken,
                    'Content-Type': 'text/html',
                  },
                })
                .then(function (clientresp) {
                  // res.status(200).json({
                  //     data: clientresp
                  // });
                })
                .catch(e => {
                  res.status(400).json({
                    data: e,
                  });
                });
            })
            .catch(e => {
              res.status(400).json({
                data: e,
              });
            });
        } else {
          console.log('#####333   ' + data);
          res.status(400).json({
            data: 'No NMS settings found or enabled',
          });
        }
      });
    });
    console.log('/teams/getdisplays/' + config.cid);
    app.get('/teams/getdisplays/' + config.cid, function (req, res) {
      if (!config.functions.includes('displayaccess')) {
        res.status(400).json({
          data: 'Display Publish Restricted on this Bot!!',
        });
        return;
      }
      let jameson_client = new ANALYTICS({
        id: config.appClientId,
        secretKey: config.appClientSecret,
        host: config.externalhost || process.env.JAMESON_HOST,
      });
      //var zoneid = req.query.zoneid; //remove later
      var caller = req.query.caller.split('%20')[0];
      console.log('caller = ' + caller.split(' ')[0]);
      // jameson_client._getRequest('/api/v1/networkElements/location/'+"6131e63d13a476034c3ab039?type=display_terminal",(resp)=>{
      //     res.status(200).json({
      //         data: resp
      //     });
      // })
      //jameson_client._getRequest(`/api/v1/`)
      jameson_client.search(caller.split(' ')[0], response => {
        if (response != null && response.length != 0) {
          var location = response[0].location;
          console.log(location, 'LOCATION');
          jameson_client._getRequest('/api/v1/networkElements/location/' + location + '?type=display_terminal', resp => {
            res.status(200).json({
              data: resp,
            });
          });
        } else {
          res.status(400).json({
            data: 'Your device is not registered in ' + config.externalhost,
          });
        }
      });
    });
    app.get('/teams/getdevices/'+config.cid+'/:id', function (req, res) {
      
      let jameson_client = new ANALYTICS({
        id: config.appClientId,
        secretKey: config.appClientSecret,
        host: config.externalhost || process.env.JAMESON_HOST,
      });

      
      jameson_client._getRequest(`/api/v1/analytics/deviceSearch?keyword=${encodeURIComponent(req.params.id)}&page=0&size=1`, response => {
        if (response != null && response.length != 0) {
            res.status(200).json({
                data: response[0],
                message: i18n.__('WAIT_FOR_FLOOR_MAP')
            });
        } else {
            res.status(400).json({
                data: i18n.__('SNAPSHOT_ERROR'),
            });
        }
      });
    });

    app.get('/teams/getwidgetsnapshot/'+config.cid+'/:locationId/:keyword', function (req, res) {

        let widgetsettings = { "keyword": req.params.keyword}
        const snapshot = new SNAPSHOT({
            "custid": config.cid,
            "location": req.params.locationId,
            "widget": appconfig.widgetcommands['devicelastknownlocation'].command,
            "type": appconfig.widgetcommands['devicelastknownlocation'].type,
            "widgetsettings": widgetsettings,
        });
        
        snapshot.generateSnapshot().then(function(data) {
            console.log('ready to read generated snapshot');
            console.log(data)
            if(data){
                res.status(200).json({
                    data: data,
                });
            }else{
                res.status(400).json({
                    data: i18n.__('SNAPSHOT_ERROR'),
                });
            }
        }).catch(function(e) {
            console.log(e);
            res.status(400).json({
                data: i18n.__('SNAPSHOT_ERROR'),
            });
        });
        
        
      });

    app.get('/teams/getUserImage/'+config.cid+'/:userIconId', async function (req, response) {
        
        let jameson_client = new ANALYTICS({
            id: config.appClientId,
            secretKey: config.appClientSecret,
            host: config.externalhost || process.env.JAMESON_HOST,
        });
          
        console.log("User Image get URL ==========>",`/api/v1/images/image/${req.params.userIconId}`)
        await jameson_client._getImage(`/api/v1/images/image/${req.params.userIconId}`)
        .then((res) =>{
            //console.log(res);
            response.status(200).json({
                data: res,
            });
        })
        .catch((error) =>{
            response.status(404).json({
                data: 'Image Not Found',
            });
        });
    });
  });
};
