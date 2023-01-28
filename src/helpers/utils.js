
function genSalt(){
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(12, function (err, salt) {
            if (err) {
                reject(err);
            } else {
                resolve(salt);
            }
        });
    });
}

// hash the password with the salt
function genHash (password, salt){
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, salt, function (err, hash) {
            if (err) {
                reject(err);
            } else {
                resolve(hash);
            }
        });
    });
}

exports.generateMotionJPEGurl  = (username, password, baseURL)=>{
    return new Promise((resolve, reject) => {
        genSalt().then(function (salt) {
            return genHash(password, salt);
        }).then(function (hashedpassword) {
            const finalURL = baseURL +
                (baseURL.indexOf('?') > -1 ? "&" : "?") +
                "token=" + username + "^*^" + hashedpassword;
            console.log(finalURL);
            resolve(finalURL);
        });
    });
}