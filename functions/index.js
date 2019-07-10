// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

const {
  BasicCard,
  BrowseCarousel,
  BrowseCarouselItem,
  Button,
  Carousel,
  LinkOutSuggestion,
  List,
  Image,
  MediaObject,
  Suggestions,
  SimpleResponse,
  RegisterUpdate,
  UpdatePermission,
 } = require('actions-on-google');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements\

var firebaseAdmin = require("firebase-admin");

const requestAPI = require('request-promise');

const Str = require('./strings');
const util = require('util');
const uuidv4 = require('uuid/v4');

// const Actions = require('./assistant-actions');
const UserManager = require('./user-manager.js');
const AdhanTiming = require('./adhan-timing.js');
// const Conversation = require('./conversation.js');


var serviceAccount = require("./config/my-adhan-app-firebase-adminsdk-tp1ep-1d0997f020.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://my-adhan-app.firebaseio.com"
});
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    //Initialize app dependencies
  const agent = new WebhookClient({ request, response });
  const conv = agent.conv(); // Get Actions on Google library conv instance
  const userManager = new UserManager(firebaseAdmin);
  const adhanTiming = new AdhanTiming(firebaseAdmin, userManager);
  const currentUserId = agent.conv().user.raw.userId;

  function checkIfGoogle(agent) {
    let isGoogle = true; 
    if ( conv === null ) {
        agent.add(`Only requests from Google Assistant are supported.
        Find the XXX action on Google Assistant directory!`);
        isGoogle = false;
    }
    return isGoogle;
}

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  //Intent input.welcome
  async function actionWelcomeUser(agent) {
    let userInfo = await userManager.dbGetUserData(currentUserId);
    let response;

    if (userInfo == null) {
      response = await _greetNewUser(conv);
    } else {
      // response = await userManager.greetNewUser(conv);
      response = await _greetExistingUser(conv, currentUserId);
    }
  
    agent.add(response);
  }

  function _greetNewUser(conv) {
    conv.ask('Welcome to the Adhan App, please provide your United States zipcode, city and state, or city and country');
    return conv;
  }

  async function _greetExistingUser(conv, userInfo) {
    let nextAdhan = await adhanTiming.getNext(userInfo);
    conv.ask('Hi! ' + nextAdhan + ". Is there anything else I can help with?");
    return conv;
  }


  //Intent user_provides_location
  async function actionGetUserLocation(agent) {
    console.log("IN actionGetUserLocation");

    let response = await userManager.createUserInfo(conv, currentUserId, agent.parameters);

    if (response){
      agent.add(response);
      return;
    }

    let nextAdhan = await adhanTiming.getNext(currentUserId);
    console.log("nextAdhan: " + nextAdhan);
    // conv.ask(nextAdhan);
    conv.ask(nextAdhan + ' To learn about more features say "Help", "more info", or ask "What can you do?" ')
    agent.add(conv);
  }

  //Intent get_info
  async function actionGetInfo(agent) {
    console.log("IN actionGetInfo");

    let response = 'EMPTY FOR NOW...';
  
    agent.add(response);
  }

  //Intent get_time
  async function actionGetTime(agent) {
    let salat = agent.parameters['Salat'];
    let whenAdhan = await adhanTiming.getWhen(currentUserId, salat);
    conv.ask(whenAdhan);
    agent.add(conv);
  }
 
  //Intent play_adhan
  async function actionPlayAdhan(agent) {
    if ( checkIfGoogle(agent) ) {
      console.log("IN actionPlayAdhan");

      conv.ask(new SimpleResponse("It is Maghrib time"));
      conv.close(new MediaObject({
        name: 'Adhan Madinah',
        url: 'http://praytimes.org/audio/adhan/Sunni/Adhan%20Madina.mp3',
        description: 'Madinah Adhan',
        icon: new Image({
          url: 'https://storage.googleapis.com/automotive-media/album_art.jpg',
          alt: 'Media icon',
        }),
      }));

      agent.add(conv);
    }
  }

  let Actions={
    ACTION_WELCOME: 'welcome_user',
    ACTION_GET_LOCATION: 'user_provides_location',
    ACTION_INCORRECT_LOCATION: 'incorrect_user_location',
    ACTION_NEXT_ADHAN: 'next_adhan',
    ACTION_GET_TIME: 'get_time',
    ACTION_GET_INFO: 'get_info',
    ACTION_PLAY_ADHAN: 'play_adhan',
    // ACTION_DEFAULT_FALLBACK: 'input.unknown'
  };


  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  // intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  // intentMap.set('welcome_user', welcome);
  
  intentMap.set(Actions.ACTION_WELCOME, actionWelcomeUser);
  intentMap.set(Actions.ACTION_GET_LOCATION, actionGetUserLocation);
  intentMap.set(Actions.ACTION_GET_TIME, actionGetTime);
  intentMap.set(Actions.ACTION_GET_INFO, actionGetInfo);
  intentMap.set(Actions.ACTION_PLAY_ADHAN, actionPlayAdhan);

  agent.handleRequest(intentMap);
});
