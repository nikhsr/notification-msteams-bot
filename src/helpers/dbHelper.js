var ON_DUPLO = process.env["ON_DUPLO"] === "true";
var PROD_ONPREMISE_DB = process.env["PROD_ONPREMISE_DB"] === "true";
var PROD_PASSWORD_DB = process.env["PROD_PASSWORD_DB"];
var PROD_USERNAME_DB = process.env["PROD_USERNAME_DB"];
const { MongoClient } = require('mongodb');
const secretManager = require("../helpers/AWSsecretManager");
const databaseName = process.env["SPRING_DATA_MONGODB_DATABASE"]  ||"teamsbot";

var client;
let connection;

async function init() {
	
	if(!ON_DUPLO){
	  let mongoURI = "mongodb://" + (PROD_ONPREMISE_DB ? "mongo":"localhost") +":27017";
	  let optionMongo =  { useUnifiedTopology: true} 
	  if(PROD_PASSWORD_DB && PROD_USERNAME_DB){
	    optionMongo.auth = {username : PROD_USERNAME_DB, password : PROD_PASSWORD_DB}
	    optionMongo.directConnection = true
	  }
	  client = new MongoClient(mongoURI,optionMongo);
	 console.log("Local Mongo Initiated");
	
	} else {
	  const secretName = process.env["JAMESONS_INITALIZATION_AWS_SECRET"] || "duploservices-sj-test-kloudspot-setup-t9Dt59";
	  const region = process.env["JAMESONS_INITALIZATION_AWS_REGION"] || "us-west-2";
	  const mongoURI = process.env["SPRING_DATA_MONGODB_URI"];
	  var credentials;
	  let secrets = await secretManager.getSecret(secretName, region);
	  console.log('>>> secrets: ', secrets);
    if (typeof secrets === 'string' || secrets instanceof String) {
      secrets = JSON.parse(secrets);
    }
	  credentials = secrets.mongoCertificate;
	  console.log(">>>>> credentials  >>>>>>", credentials);

	   client = new MongoClient(mongoURI, {
	    sslKey: credentials,
	    sslCert: credentials,
      sslValidate: false,
	    useUnifiedTopology: true,
	    connectTimeoutMS: 30000,
	    authMechanism:'MONGODB-X509',
	    keepAlive: 1
	  });
	}
	
	connection = await client.connect();

}

exports.saveTeamsUser = async (obj) => {
  var object = JSON.parse(JSON.stringify(obj));
  connection.then(async ()=>{
      const database = client.db(databaseName);
      const collection = database.collection("teamsUser");
      await collection.findOne({
        '_id' : object._id
      },(async (err,data)=>{
        console.log(data);
        if(data!= undefined || data!=null){
           console.log("User Present Updating it")
           database.collection("teamsUser").updateOne({ _id: object._id }, {
              $set: obj
            }, (err,res)=>{
              if (err) throw err;
                   console.log("1 document updated");
            })
        } else {
          await database.collection("teamsUser").insertOne(object, function(err, res) {      
            console.log("1 document inserted");
          });
          console.log("Making New User Entry For User")
        }
      }));
  });

}

exports.saveSubscriptionData = async (obj) => {
  var object = JSON.parse(JSON.stringify(obj));

  connection.then(async ()=>{
    const database = client.db(databaseName);
    const collection = database.collection("teamsSubscriptionData");
    await collection.findOne({
      '_id' : object._id
    },(async (err,data)=>{
      if(data== undefined || data.length!=0){
         console.log("User Present Updating it")
         database.collection("teamsSubscriptionData").updateOne({ _id: object._id }, {
            $set: obj
          }, (err,res)=>{
            if (err) throw err;
                 console.log("1 document updated");
          })
      } else {
        await database.collection("teamsSubscriptionData").insertOne(object, function(err, res) {      
          console.log("1 Subscription document inserted");
        });
      }
    }));
  });

}

exports.getSubscriptionDatabyId = async(id) =>{
  return new Promise(async (resolve, reject) => {
    connection.then(async ()=>{
      const database = client.db(databaseName);
      const collection = database.collection("teamsSubscriptionData");
      await collection.find({
        '_id' : id
      },(async (err,data)=>{
        if(data==null){
          reject(null);
        }
        resolve(data);
      }));
    });
  });
}

exports.getAllSubscription = ()=>{
  return new Promise(async (resolve, reject) => {
    connection.then(async ()=>{
      const database = client.db(databaseName);
      const collection = database.collection("teamsSubscriptionData");
      await collection.find({},(async (err,data)=>{
        if(data==null){
          reject(null);
        }
        resolve(data);
      }));
    });
  });
}

exports.getUserConversationData = async(id) => {
  id = id.trim();
  console.log(id)
  return new Promise(async (resolve, reject) => {
    connection.then(async ()=>{
      const database = client.db(databaseName);
      const collection = database.collection("teamsUser");
      await collection.findOne({
        '_id' : id
      },(async (err,data)=>{
        if(data==null){
          reject(null);
        }
        var userData = JSON.parse(JSON.stringify(data));
        console.log(userData);
        var payload = {
            user: {
              id: userData.fromId,
              name: userData.fromName,
              aadObjectId: userData._id
            },
            bot: {
              id: userData.recipientId,
              name: userData.recipientName
            },
            conversation: userData.conversation,
            channelId: userData.channelId,
            locale: userData.locale,
            localTimezone: userData.localTimezone,
            serviceUrl: userData.serviceUrl
          }
        resolve(payload);
      }));
    });
  });
}

exports.getUserByEmail = async(email) =>{
  email = email.trim();
  console.log(email,"EMAIL")
  return new Promise(async (resolve, reject) => {
    connection.then(async ()=>{
      const database = client.db(databaseName);
      const collection = database.collection("teamsUser");
      await collection.findOne({
        'email' : email
      },(async (err,data)=>{
        if(data==null){
          reject(null);
        }
        var userData = JSON.parse(JSON.stringify(data));
        console.log(userData);
        var payload = {
            user: {
              id: userData.fromId,
              name: userData.fromName,
              aadObjectId: userData._id
            },
            bot: {
              id: userData.recipientId,
              name: userData.recipientName
            },
            conversation: userData.conversation,
            channelId: userData.channelId,
            locale: userData.locale,
            localTimezone: userData.localTimezone,
            serviceUrl: userData.serviceUrl
          }
        resolve(payload);
      }));
    });
  });
}

exports.updateTeamsUser = async(id, email) =>{
  email = email.trim();
  console.log(email,"EMAIL")
  return new Promise(async (resolve, reject) => {
    connection.then(async ()=>{
      const database = client.db(databaseName);
      const collection = database.collection("teamsUser");
      await collection.findOne({
        '_id' : id
      },(async (err,data)=>{
        if(data==null){
          reject(null);
        }
        var userData = JSON.parse(JSON.stringify(data));
        console.log(userData,"GET USER DATA");
        userData.email = email;
        await collection.updateOne({ _id: id },
        { $set: userData },
        { upsert: true },(err, data)=>{
          console.log(data,"DATA USER SAVED");
        })
        
      }));
    });
  });
}

//Init the process
init();
