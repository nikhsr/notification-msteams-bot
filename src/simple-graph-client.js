const { Client } = require('@microsoft/microsoft-graph-client');
const { MarketplaceCommerceAnalytics } = require('aws-sdk');
require('isomorphic-fetch');
//var moment = require('moment');
var moment = require('moment-timezone');

/**
 * This class is a wrapper for the Microsoft Graph API.
 * See: https://developer.microsoft.com/en-us/graph for more information.
 */
class SimpleGraphClient {
    constructor(token) {
        if (!token || !token.trim()) {
            throw new Error('SimpleGraphClient: Invalid token received.');
        }

        this._token = token;

        // Get an Authenticated Microsoft Graph client using the token issued to the user.
        this.graphClient = Client.init({
            authProvider: (done) => {
                done(null, this._token); // First parameter takes an error if you can't get an access token.
            }
        });
    }

    /**
     * Collects information about the user in the bot.
     */
    async getMe() {
        return await this.graphClient
            .api('/me')
            .get().then((res) => {
                return res;
            });
    }

    async startCalenderSubscription(host, cid) {
        var expirationDateTime = new Date(Date.now() + 4230*60*1000).toISOString();
        console.log(host +"/teams/listen/"+cid, "expirationDateTime : ", expirationDateTime);
        return await this.graphClient.api('/subscriptions').version('beta').create({
            "changeType": "created,updated",
            "notificationUrl": host +"/teams/listen/"+cid,
            "resource": "me/events",
            "expirationDateTime": expirationDateTime,
            "clientState": "secretClientValuess"
         }).then(e =>{
            console.log(e, "SUCCESS: startCalenderSubscription")
         }).catch(e =>{
            console.log(e,"Error inside startCalenderSubscription")
         });
    }

    async getAllMeetings() {
        return await  this.graphClient.api("/me/calendar/events")
                                        .get().then((res) => {
                                            console.log(JSON.stringify(res));
                                            return res;
                                        })
                                        .catch((e)=>{
                                            console.log(e);
                                        })
    }

    async getUpcomingMeeting(tz) {
        return await  this.graphClient.api("/me/calendar/events?$orderby=start/dateTime DESC&$top=10")
                                        .get().then((res) => {
                                            //console.log(res,"Response")
                                            var allMeetings = JSON.parse(JSON.stringify(res)).value;
                                            allMeetings = allMeetings.filter((e)=>{
						//console.log("1 ********",e,"Meeting",Date(e.end.dateTime))
						//onsole.log("2 *******",moment(e.end.dateTime).tz(tz).valueOf(), moment().tz(tz).valueOf(),"CHECK",moment(e.end.dateTime).tz(tz).valueOf() >
								//moment().tz(tz).valueOf())
                                                if(moment(e.end.dateTime).tz(tz).valueOf() > moment().tz(tz).valueOf()){
                                                    return true;
                                                }
                                                return false;
                                            })
                                            return [allMeetings[allMeetings.length -1]];
                                        }).catch((e)=>{
                                            console.log(e);
                                        })
    }

    async getNextMeeting(tz, timeframe) {
        return await  this.graphClient.api("/me/calendar/events?$orderby=start/dateTime DESC&$top=4")
                                        .get().then((res) => {
                                            var allMeetings = JSON.parse(JSON.stringify(res)).value;
                                            var timef = timeframe;
                                            if(timeframe==null || timeframe==undefined){
                                                timef = 60*60*1000;
                                            }
                                            allMeetings = allMeetings.filter((e)=>{
                                                if(Math.abs(moment.utc(e.start.dateTime).tz(tz).valueOf() - moment().tz(tz).valueOf()) <= timef){
                                                    return true;
                                                }
                                                return false;
                                            })
                                            return allMeetings;
                                        }).catch((e)=>{
                                            console.log(e);
                                        })
    }
}

exports.SimpleGraphClient = SimpleGraphClient;