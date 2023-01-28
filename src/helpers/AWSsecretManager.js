'use strict'
const AWS = require('aws-sdk');

    
exports.getSecret = async (secretName, region)=>{
    return new Promise(async (resolve, reject) => {
         const config = { region : region }
         var secret, decodedBinarySecret;
         let secretsManager = new AWS.SecretsManager(config);
         console.log("@",config, secretName)
         try {
             let secretValue = await secretsManager.getSecretValue({SecretId: secretName}).promise();
             console.log("@@", JSON.stringify(secretValue));
             if ('SecretString' in secretValue) {
                 secret = secretValue.SecretString;
                 resolve(secret);
             } else {
                 let buff = new Buffer(secretValue.SecretBinary, 'base64');
                 decodedBinarySecret = buff.toString('ascii');
                 resolve(decodedBinarySecret)
             }
         } catch (err) {
            console.log(err)
             if (err.code === 'DecryptionFailureException')
                 reject(err);
             else if (err.code === 'InternalServiceErrorException')
                reject(err);
             else if (err.code === 'InvalidParameterException')
                reject(err);
             else if (err.code === 'InvalidRequestException')
                reject(err);
             else if (err.code === 'ResourceNotFoundException')
                reject(err);
         }
     });
    }
