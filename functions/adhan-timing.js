// const Constants = require('./constants.js');
// const math = require('mathjs');\
const requestAPI = require('request-promise');
const moment = require('moment-timezone');
const Str = require('./strings');
const util = require('util');

class AdhanTiming {
    constructor(firebaseAdmin, userManager) {
        this.firebaseAdmin = firebaseAdmin;
        this.userManager = userManager;
    }


    async getNext(userId){
        let timings = await this.getTimingData(userId);
        let nextAdhan = timings.upcoming[0][0];
        let time = timings.upcoming[0][1];

        let response = util.format(Str.NEXT_ADHAN_IS, nextAdhan, time)

        return response;
    }

    async getWhen(userId, salat){
        let timings = await this.getTimingData(userId);

        
        let time = '';
        timings.today.forEach(function (item){
            console.log("item: " + item);

            if (item[0] === salat){
                time = item[1];
            }
        });
        
        if (!time){
            return "There has been an error. Please repeat the query.";
        }
        
        let response = util.format(Str.WHEN_IS, salat, time)

        return response;
    }

    async getTimingData(userId){
        let db_data = await this.userManager.dbGetUserData(userId);

        
        let api_day = db_data['api_day'];
        let api_day_data = await requestAPI(api_day);
        api_day_data = JSON.parse(api_day_data);   
        let timings = api_day_data.data.timings;
        console.log(timings);

        let timezone = db_data['timezone'];
        let api_time = 'http://api.aladhan.com/v1/currentTime?zone=' + timezone;
        let api_time_data = await requestAPI(api_time);
        api_time_data = JSON.parse(api_time_data); 
        let current_time = api_time_data.data;

        // console.log("current_time: " + current_time);

        let interested_in = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        let upcoming_timings = [];

        let today_timings = [];

        interested_in.forEach(function(item){
            today_timings.push([item, timings[item]])

            if (current_time < timings[item]){
                upcoming_timings.push([item, timings[item]]);
            }
        });

        let result = {
            today : today_timings,
            upcoming : upcoming_timings
        }

        return result;
    }


    
}

module.exports = AdhanTiming;
