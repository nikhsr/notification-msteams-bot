//Usage: node uireportpdf.js <Host URL> <username> <password> <locationid> <PathToReport>
//Eg: node uireportpdf.js https://office.kloudspot.com admin e190gpb 5e3dddd5a94bd4063928992e /Users/uday/Downloads/Office-Report.pdf

const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs')
var botsettings = require('../../config/botsettings');
var btoa = require('btoa');
var s3 = require('../s3/operations');
var ON_DUPLO = process.env['ON_DUPLO'] === 'true';

var settings = {};
var initalized = false;
var settings ={};

if (ON_DUPLO) {
	console.log("Using S3 for config storage, kspotanalytics");
	s3.getConfig()
	  .then((botsetting) => {
		botsetting.bots.forEach(function(cust) {
			settings[cust.cid] = {
				'host': cust.externalhost || process.env.JAMESON_HOST,
				'externalhost': cust.externalhost,
				'id': cust.appClientId,
				'secretKey': cust.appClientSecret,
				'functions': cust.functions,
				'language': cust.language,
				'jamesonUsername':cust.jamesonUsername,
				'jamesonPassword':cust.jamesonPassword
			};
		});
	  })
	  .catch((err) => console.log("Can't read settings", err));
  } else {
		botsettings.bots.forEach(function(cust) {
			settings[cust.cid] = {
				'host': cust.externalhost || process.env.JAMESON_HOST,
				'externalhost': cust.externalhost,
				'id': cust.appClientId,
				'secretKey': cust.appClientSecret,
				'functions': cust.functions,
				'language': cust.language,
				'jamesonUsername':cust.jamesonUsername,
				'jamesonPassword':cust.jamesonPassword
			};
		});
  }

function SNAPSHOT(options) {
    if (!(this instanceof SNAPSHOT)) { 
        return new SNAPSHOT(options); 
    }
    
    // Merge the default options with the client submitted options
    this.options = Object.assign({
		custid: null,
        location: null,
        widget: null,
        type: null,
		widgetsettings:null
    }, options);
    
    this.options.customerSettings = settings[this.options.custid];
}

SNAPSHOT.prototype.ping = function() {
    return "Snapshot here!!";
};

SNAPSHOT.prototype.generateSnapshot = function() {
	var that = this;
	var auth = btoa(that.options.customerSettings.jamesonUsername+":"+that.options.customerSettings.jamesonPassword);
	//console.log(that.options);
	
	return new Promise(async function (resolve, reject) {
		
		try {
			const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], userDataDir: '/tmp/chrome',});
			if(!initalized) { //replace true with !initalized after testing for concurrency
				console.time("Open Browser Session");
				const page = await browser.newPage();
				await page.setViewport({width : 1200, height: 800, isLandscape: false});
				await page.emulateMedia('screen');
				console.timeEnd("Open Browser Session");
				
				console.time("Go to login page");
				await page.goto(that.options.customerSettings.externalhost+'/#/login', {waitUntil: "load", timeout: 0});
				console.log(that.options.customerSettings.externalhost+'/#/login')
				console.timeEnd("Go to login page");
				console.log(that.options.customerSettings.jamesonUsername)
				console.time("Enter username");
				//console.log('Login page opened');
				await page.focus('#username');
				//await page.waitFor(1000);
				await page.type('#username', that.options.customerSettings.jamesonUsername);
				//console.log('Username entered');
				console.timeEnd("Enter username");
				const loginButton = '.btn-success';
				await page.waitForSelector(loginButton);
				await page.click(loginButton);
				//console.time("Enter password");
				await page.waitFor(4000);
				await page.focus('#password');
				
				await page.type('#password', that.options.customerSettings.jamesonPassword);
				//console.log('Password entered');
				
				await page.waitForSelector(loginButton);
				await page.click(loginButton);
				//console.log('Login Button clicked');
		
				//await page.waitForSelector(".topStat");
				await page.waitFor(5000);
				//console.log('topStat loaded');
		
				
				initalized = true;
			}

//			const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], userDataDir: '/tmp/chrome',});
			const page2 = await browser.newPage();
			await page2.setViewport({width : 1200, height: 800, isLandscape: false});
			await page2.emulateMedia('screen');
			
			let widgeturl = that.options.customerSettings.externalhost+'/#/embed/'+that.options.widget+'?settings=location%3D'+that.options.location;
			if(that.options.widget=="humancharacteristicstrends?"){
				widgeturl= widgeturl+ '&widgetInstanceId=2fc57d23-118c-4f5d-bf92-988fe3c50308';
			}
			/*
			else if(that.options.widget=="liveusermovementshybrid"){
				widgeturl= widgeturl+'&macs='+that.options.widgetsettings.keyword;
				console.log("WIDGET URL ========>", widgeturl);
			}
			*/
			if(that.options.widgetsettings) {
				var elist = Object.keys(that.options.widgetsettings).map((k) => {
					return '&'+k+'='+that.options.widgetsettings[k];
				});
				var extrasettings = elist.join('');
				if(extrasettings.length>0) {
					//console.log(extrasettings);
					widgeturl += encodeURIComponent(extrasettings);
				}
			}	
			widgeturl +="&auth="+auth;
			console.log('Opening page: '+widgeturl);
			let waitFlag = "networkidle2";
			if(that.options.type && that.options.type=="live") {
				waitFlag = "load";
			}
			console.time("Go to widget page");
			await page2.goto(widgeturl, {waitUntil: waitFlag, timeout: 0});
			console.timeEnd("Go to widget page");
			//console.log('Navigated to uireport page');
			await page2.waitFor(5000);
			console.log(__dirname)
			if (!fs.existsSync(__dirname.substring(0,__dirname.length-6)+'/pages/tmpResources/')){
				console.log("Making TMP directory")
				fs.mkdirSync(__dirname.substring(0,__dirname.length-6)+'/pages/tmpResources/');
			}
			var imgfilepath = __dirname.substring(0,__dirname.length-6)+'/pages/tmpResources/'+'Kloudspot-Report-'+moment().valueOf()+'.png';
			const hrefElement = await page2.$('#widget-content');
			await hrefElement.screenshot({
				path: imgfilepath
			});
			//console.log("PNG generated for the selected widget");

			await browser.close();

			var newPath = imgfilepath.split("/")[imgfilepath.split("/").length-1];
			console.log("--------------");
			resolve({url: widgeturl,path: newPath});
			
		} catch(e) {
			reject('Error '+e);
		}
	
	});
	  
};

module.exports = SNAPSHOT;