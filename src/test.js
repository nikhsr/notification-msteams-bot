var moment = require('moment-timezone');
//2022-07-25T11:30:00.0000000
console.log(moment.utc("2022-07-25T11:30:00.0000000").tz("Asia/Calcutta").valueOf());
console.log(moment.tz("Asia/Calcutta").valueOf())