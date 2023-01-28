"use strict";

const AWS = require("aws-sdk");

module.exports = {
  getConfig: getConfig,
  putConfig: putConfig,
};

const REGION = process.env["AWS_REGION"] || "us-west-1";

const s3 = new AWS.S3({ apiVersion: "2006-03-01", region: REGION });

const bucketParams = {
  Bucket: process.env["S3_TEAMS_BUCKET"] || "kloudspot-steve-test",
  Key: process.env["S3_TEAMS_KEY"] || "botsettings.json",
};

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

async function getConfig() {
  console.log("bucketParams",bucketParams);
  let response = await s3.getObject(bucketParams).promise();
  try {
    if (response.Body) {
      let str = ab2str(response.Body);
      return JSON.parse(str);
    }
  } catch (err) {
    console.log("Error", err);
  }
  return null;
}

async function putConfig(data) {
  bucketParams.Body = JSON.stringify(data);
  try {
    let response = await s3.putObject(bucketParams).promise();

    if (response.Body) {
      let str = ab2str(response.Body);
      return JSON.parse(str);
    }
  } catch (err) {
    console.log("Error", err);
  }
  return null;
}

// getObject(bucketParams)
//   .then((res) => {
//     console.log(JSON.stringify(res, null, 2));
//     if (!res.count) {
//       res.count = 1;
//     } else {
//       res.count += 1;
//     }
//     putObject(bucketParams, res).then((res1) => {
//       console.log("Resp", res1);
//     });
//   })
//   .catch((e) => {
//     console.log(
//       "There has been a problem with your fetch operation: " + e.message
//     );
//   });
