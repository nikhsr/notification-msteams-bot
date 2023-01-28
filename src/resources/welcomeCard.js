"use strict";

const { I18n } = require("i18n");

module.exports.setup = function(name,functions){
    const i18n = require("i18n");

    var find =  {
        "type": "ColumnSet",
        "columns": [
            {
                "type": "Column",
                "width": "auto",
                "items": [
                    {
                        "type": "Image",
                        "url":  "https://img.icons8.com/external-kiranshastry-solid-kiranshastry/64/4a90e2/external-find-hotel-kiranshastry-solid-kiranshastry.png",
                        "size": "Large"
                    }
                ]
            },
            {
                "type": "Column",
                "width": 4,
                "style": "emphasis",
                "items": [
                    {
                        "type": "TextBlock",
                        "text": i18n.__('find'),
                        "weight": "bolder"
                    },
                    {
                        "type": "TextBlock",
                        "text": i18n.__('locate_desc_1'),
                        "isSubtle": true,
                        "wrap": true,
                        "spacing":"None"
        
                    }
                ]
            }
        ],
        "selectAction": {
          "type": "Action.Submit",			
          "title": "More Details",				
          "data": { "msteams": { "type": "task/fetch" }, "data": {"option":"findInfo"}}
      }
    };
    var apstatus = {
        "type": "ColumnSet",
        "columns": [
            {
                "type": "Column",
                "width": "auto",
                "items": [
                    {
                        "type": "Image",
                        "url": "https://img.icons8.com/external-vitaliy-gorbachev-fill-vitaly-gorbachev/60/4a90e2/external-router-5g-vitaliy-gorbachev-fill-vitaly-gorbachev-1.png",
                        "size": "Large"
                    }
                ]
            },
            {
                "type": "Column",
                "width": 4,
                "style": "emphasis",
                "items": [
                    {
                        "type": "TextBlock",
                        "text": i18n.__('apstatus'),
                        "weight": "bolder"
                    },
                    {
                        "type": "TextBlock",
                        "text": i18n.__('apstatus_desc_2'),
                        "isSubtle": true,
                        "wrap":true,
                        "spacing": "None"
                    }
                ]
            }
        ],
        "selectAction": {
          "type": "Action.Submit",			
          "title": "More Details",				
          "data": { "msteams": { "type": "task/fetch" }, "data": {"option":"apstatusInfo"}}
      }
    };
    var location = {
        "type": "ColumnSet",
        "columns": [
            {
                "type": "Column",
                "width": "auto",
                "items": [
                    {
                        "type": "Image",
                        "url": "https://img.icons8.com/ios-filled/100/4a90e2/marker.png",
                        "size": "Large"
                    }
                ]
            },
            {
                "type": "Column",
                "width": 4,
                "style": "emphasis",
                "items": [
                    {
                        "type": "TextBlock",
                        "text": i18n.__('location'),
                        "weight": "bolder"
                    },
                    {
                        "type": "TextBlock",
                        "text": i18n.__('location_desc_7'),
                        "isSubtle": true,
                        "wrap": true,
                        "spacing":"None"
        
                    }
                ]
            }
        ],
        "selectAction": {
          "type": "Action.Submit",			
          "title": "More Details",				
          "data": { "msteams": { "type": "task/fetch" }, "data": {"option":"locationInfo"}}
      }
    };
    var meetings = {
        "type": "ColumnSet",
        "columns": [
            {
                "type": "Column",
                "width": "auto",
                "items": [
                    {
                        "type": "Image",
                        "url": "https://img.icons8.com/ios-filled/100/4a90e2/meeting-room.png",
                        "size": "Large"
                    }
                ]
            },
            {
                "type": "Column",
                "width": 4,
                "style": "emphasis",
                "items": [
                    {
                        "type": "TextBlock",
                        "text": i18n.__('UPCOMING_MEETING'),
                        "weight": "bolder"
                    },
                    {
                        "type": "TextBlock",
                        "text": i18n.__('UM_DESDC'),
                        "isSubtle": true,
                        "wrap": true,
                        "spacing":"None"
        
                    }
                ]
            }
        ]
    }
    var emptyFlag = true;
    var functionHelp = [];
    functionHelp.push({
        "type": "TextBlock",
        "spacing": "medium",
        "size": "default",
        "weight": "bolder",
        "text": i18n.__('hello')+name+", \r "+ i18n.__('hello_wait'),
        "wrap": true,
        "maxLines": 0
      })
    if(functions.includes("find")){
        emptyFlag = false;
        functionHelp.push(find);
    }
    if(functions.includes("apstatus")){
        emptyFlag = false;
        functionHelp.push(apstatus);
    }
    if(functions.includes("location")){
        emptyFlag = false;
        functionHelp.push(location);
    }
    if(true){ // TODO: add a condition
        functionHelp.push(meetings);
    }
    if(emptyFlag){
        functionHelp = [{
            "type": "TextBlock",
            "spacing": "medium",
            "size": "default",
            "weight": "bolder",
            "text": i18n.__('hello')+name+", \r "+i18n.__('bot_access_desc'),
            "wrap": true,
            "maxLines": 0
          }]
    }
    return {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.0",
        "body": functionHelp
      }
} 
