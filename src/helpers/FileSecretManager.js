'use strict'
const fs = require("fs");


exports.getSecret = async (secretPath)=>{
    return new Promise(async (resolve, reject) => {
        fs.readFile(secretPath, (err, data) => {
            if (err) {
                reject({msg: "Error reading secret file", path: secretPath, error: err})
            } else {
                resolve(JSON.parse(data.toString()));
            }
        });
     });
    }
