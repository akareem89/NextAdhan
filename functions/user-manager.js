const cityTimezones = require('city-timezones');
const zipcode_to_timezone = require( 'zipcode-to-timezone' );

class UserManager {
    constructor(firebaseAdmin) {
        this.firebaseAdmin = firebaseAdmin;
        this.user = null;
    }


    async createUserInfo(conv, userId, parameters) {

        console.log(parameters);
        let zipcode = parameters['zip-code'];
        let city = parameters['geo-city'];
        let state = parameters['geo-state'];
        let country = parameters['geo-country'];
    
        let api_calendar_pre =  'http://api.aladhan.com/v1/calendarByCity?';
        let api_day_pre = 'https://api.aladhan.com/v1/timingsByCity?';
        let api_method = '&method=2&school=2';
        let api_school = '&school=1';
        let api_day;
        let api_calendar;
        let timezone;
    
        // let response = '';
    
        if (zipcode){
          let api_city = 'city=' + zipcode;
          let api_country = '&country=United States';
          api_day = api_day_pre + api_city + api_country + api_method + api_school;
          api_calendar = api_calendar_pre + api_city + api_country + api_method + api_school;
          timezone = zipcode_to_timezone.lookup(zipcode);
          console.log('Zipcode: ' + zipcode + ', timezone: ' + timezone);
        }else if(city && state){
          let api_city = 'city=' + city;
          let api_state = '&state=' + state;
          let api_country = '&country=United States';
          api_day = api_day_pre + api_city + api_state + api_country + api_method + api_school;
          api_calendar = api_calendar_pre + api_city + api_state + api_country + api_method + api_school;

          let cityLookup = cityTimezones.findFromCityStateProvince(city + ' ' + state)
          console.log(cityLookup);
          if (cityLookup.length > 1){
            console.log("MORE THAN ONE!");
            console.log(cityLookup);
          }else if(cityLookup.length < 0){
            console.log("EMPTY!");
          }else{
            timezone = cityLookup[0].timezone;
          }
          console.log('City, State: ' + city + ', ' + state + ', timezone: ' + timezone);
        }else if(city && country){
          let api_city = 'city=' + city;
          let api_country = '&country=' + country;
          api_day = api_day_pre + api_city + api_country + api_method + api_school;
          api_calendar = api_calendar_pre + api_city + api_country + api_method + api_school;

          let cityLookup = cityTimezones.findFromCityStateProvince(city + ' ' + country)
          console.log(cityLookup);
          if (cityLookup.length > 1){
            console.log("MORE THAN ONE!");
            console.log(cityLookup);
          }else if(cityLookup.length < 0){
            console.log("EMPTY!");
          }else{
            timezone = cityLookup[0].timezone;
          }
          console.log('City, Country: ' + city + ', ' + country + ', timezone: ' + timezone);
        }

        const userData = {
            userId: userId,
            api_day: api_day,
            api_calendar: api_calendar,
            zipcode: zipcode, 
            city: city,
            state: state, 
            country: country,
            timezone: timezone,
            timestamp: Date.now()
        };

        console.log('API DAY: ' + api_day);
        console.log('API CALENDAR: ' + api_calendar);
    
        if (api_day && api_calendar && timezone){
          console.log('Saving API...');
          
          this.dbStoreUserData(userId, userData);
          conv.ask('All ready. ');          
        }else{
          conv.ask('There is an error with the location given. Please try again');
          return conv;
        }

        // return conv
    }


    async dbGetUserData(assistantUserId) {
        let db = this.firebaseAdmin.database().ref('users/' + assistantUserId);

        let db_data = await db.once('value');

        // console.log('printing data: ' + JSON.stringify(db_data.val(), null, 2));

        return db_data.val();
    }


    async dbStoreUserData(assistantUserId, data){
        let db = this.firebaseAdmin.database().ref('users/' + assistantUserId);
        db.set(data);
    }

}
module.exports = UserManager;
