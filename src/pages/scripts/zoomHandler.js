
'use strict';
importScripts("");
var botsettings = require ('../../../config/botsettings.json');
const KJUR = require('jsrsasign');
module.exports.setup = function (id,pass,cid) {
    var settings;
    botsettings.bots.forEach(function(cust) {
        if(cust.id = cid){
            settings = {
                "zoomID": cust.zoomID,
                "zoomSecret": cust.zoomSecret
            };
        }
    });
    const client = ZoomMtgEmbedded.createClient();


    function generateSignature(settings) {
        const iat = Math.round((new Date().getTime() - 30000) / 1000)
        const exp = iat + 60 * 60 * 2

        const oHeader = { alg: 'HS256', typ: 'JWT' }

        const oPayload = {
            sdkKey: settings.zoomID,
            mn: id,
            role: 0,
            iat: iat,
            exp: exp,
            appKey: settings.zoomID,
            tokenExp: iat + 60 * 60 * 2
        }

        const sHeader = JSON.stringify(oHeader)
        const sPayload = JSON.stringify(oPayload)
        return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, settings.zoomSecret)
    }

    let meetingSDKElement = document.getElementById('meetingSDKElement');

    client.init({
    debug: true,
    zoomAppRoot: meetingSDKElement,
    language: 'en-US',
    customize: {
        meetingInfo: ['topic', 'host', 'mn', 'pwd', 'telPwd', 'invite', 'participant', 'dc', 'enctype'],
        toolbar: {
        buttons: [
            {
            text: 'Custom Button',
            className: 'CustomButton',
            onClick: () => {
                console.log('custom button');
            }
            }
        ]
        }
    }
    });

    client.join({
        apiKey: settings.zoomID,
        signature: generateSignature(settings),
        meetingNumber: id,
        password: pass,
        userName: "KloudDisplay"
    })

    return true;
  };

//   function websdkready() {
//     // tool.js
//     var testTool = window.testTool;
//     // get meeting args from url
//     var tmpArgs = testTool.parseQuery();
//     var meetingConfig = {
//       apiKey: tmpArgs.apiKey,
//       meetingNumber: tmpArgs.mn,
//       userName: (function () {
//         if (tmpArgs.name) {
//           try {
//             return testTool.b64DecodeUnicode(tmpArgs.name);
//           } catch (e) {
//             return tmpArgs.name;
//           }
//         }
//         return (
//           "CDN#" +
//           tmpArgs.version +
//           "#" +
//           testTool.detectOS() +
//           "#" +
//           testTool.getBrowserInfo()
//         );
//       })(),
//       passWord: tmpArgs.pwd,
//       leaveUrl: "/index.html",
//       role: parseInt(tmpArgs.role, 10),
//       userEmail: (function () {
//         try {
//           return testTool.b64DecodeUnicode(tmpArgs.email);
//         } catch (e) {
//           return tmpArgs.email;
//         }
//       })(),
//       lang: tmpArgs.lang,
//       signature: tmpArgs.signature || "",
//       location: true,
//     };
  
//     // a tool use debug mobile device
//     // if (testTool.isMobileDevice()) {
//     //   // vconsole.min.js
//     //   vConsole = new VConsole();
//     // }
//     console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));
  
//     // it's option if you want to change the WebSDK dependency link resources. setZoomJSLib must be run at first
//     // ZoomMtg.setZoomJSLib("https://source.zoom.us/1.9.6/lib", "/av"); // CDN version defaul
//     if (meetingConfig.location)
//     ZoomMtg.setZoomJSLib("https://jssdk.zoomus.cn/1.9.6/lib", "/av"); // china cdn option
//     ZoomMtg.preLoadWasm();
//     ZoomMtg.prepareWebSDK();
//     function beginJoin(signature) {
//       ZoomMtg.init({
//         leaveUrl: meetingConfig.leaveUrl,
//         webEndpoint: meetingConfig.webEndpoint,
//         success: function () {
//           console.log(meetingConfig);
//           console.log("signature", signature);
//           ZoomMtg.i18n.load(meetingConfig.lang);
//           ZoomMtg.i18n.reload(meetingConfig.lang);
//           ZoomMtg.join({
//             meetingNumber: meetingConfig.meetingNumber,
//             userName: meetingConfig.userName,
//             signature: signature,
//             apiKey: meetingConfig.apiKey,
//             userEmail: meetingConfig.userEmail,
//             passWord: meetingConfig.passWord,
//             success: function (res) {
//               console.log("join meeting success");
//               console.log("get attendeelist");
//               ZoomMtg.getAttendeeslist({});
//               ZoomMtg.getCurrentUser({
//                 success: function (res) {
//                   console.log("success getCurrentUser", res.result.currentUser);
//                 },
//               });
//             },
//             error: function (res) {
//               console.log(res);
//             },
//           });
//         },
//         error: function (res) {
//           console.log(res);
//         },
//       });
//     }
  
//     beginJoin(meetingConfig.signature);
//   };
this.setup("71981668573","8UQqpT","nikhilBot");