var secret = process.env["AWS_KEY"] || "duploservices-sj-test-kloudspot-setup-t9Dt59";

exports.encrypt = (strToEncrypt)=> {
     if(secret==null || secret==undefined) {
         return;
     }
    return (CryptoJS.AES.encrypt(strToEncrypt, secret, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }).toString());

}

exports.decrypt = (strToDecrypt) =>{
    return CryptoJS.AES.decrypt(strToDecrypt, secret, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
}
