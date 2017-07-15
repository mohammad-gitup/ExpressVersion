var express = require('express');
var router = express.Router();
var SpotifyWebApi = require('spotify-web-api-node'); //added
var socket_io = require('socket.io'); //added
var models=require('../models/models');
var User=models.User;
var Room=models.Room;

module.exports=function(io){

  //check how this works //checked

  router.use('/',function(req,res,next){
    if(req.user){
       next();
    }else{
      console.log("here");
      res.redirect('/login');
    }
  })

  //home which renders two buttons

  router.get('/', function(req, res, next) {
    res.render('main',{
      spotifyId:req.user.spotifyId,
      imageURL: req.user.image,
      username: req.user.username
    });
  });

  // displays list of available rooms

  router.get('/rooms',function(req,res,next){
    //console.log("reached here successfully");
    Room.find(function(err,rooms){
      if(err)console.log(err);
      res.render('rooms',{
        rooms:rooms
      })
    })
  })

  // option to createRoom

  router.get('/createRoom',function(req,res,next){
    res.render('createRoom',{
      spotifyId:req.user.spotifyId,
    });
  })

  //post request of createRoom

  router.post('/createRoom',function(req,res,next){

    console.log("reached here and creating room");

    var newRoom=new Room({
      roomName:req.body.roomName,
      djRefreshToken:req.user.refreshToken,
      djSpotifyId:req.user.spotifyId,
      imageURL : req.user.imageURL
    })

    console.log(newRoom);

    newRoom.save(function(err,room){
      if(err)console.log(err);
      else{
        res.send({
          roomName:room.roomName,
          djSpotifyId: room.djSpotifyId
        })
      }
    })

  })

  // joinRoom takes you to this page first but this needs to be modified later


  // socket stuff

  io.on('connection',function(socket){

    socket.on('spotifySetup', function(spotifyId) {
      console.log("spotify setup");

      var spotifyApi = new SpotifyWebApi({
        clientId : process.env.SPOTIFY_ID,
        clientSecret : process.env.SPOTIFY_SECRET,
        redirectUri : process.env.CALLBACK_URL
      });

      User.findOne({spotifyId: spotifyId}, function(err, user){
          if (!user) {
            console.log("user not found");
            return;
          }
          spotifyApi.setRefreshToken(user.refreshToken);
          socket.emit('getRefreshToken', user.refreshToken);
          spotifyApi.refreshAccessToken()
          .then(function(data) {
            spotifyApi.setAccessToken(data.body['access_token']);
            socket.emit('getAccessToken', spotifyApi.getAccessToken());
          },function (err) {
            console.log("could not refresh");
          })
      })

    })

    socket.on('toRefresh',function(refreshToken){
      console.log("refreshing token");
      var spotifyApi = new SpotifyWebApi({
        clientId : process.env.SPOTIFY_ID,
        clientSecret : process.env.SPOTIFY_SECRET,
        redirectUri : process.env.CALLBACK_URL
      });
      spotifyApi.setRefreshToken(refreshToken);
      spotifyApi.refreshAccessToken()
        .then(function(data){
          spotifyApi.setAccessToken(data.body['access_token']);
          socket.emit('getAccessToken', spotifyApi.getAccessToken());
        },function(error){
          console.log(error);
        })
    })

    socket.on('startRoom',function(socketObj){

      console.log("reached here", socketObj);

      var getDJData = function(DJAccessToken, room) {

        console.log("getting dj data being callled every ten seconds.");

        var DJSpotifyApi = new SpotifyWebApi({
          clientId : 'c4da077a73534dcda6b92ae6f5f93375',
          clientSecret : 'd56d7c6648f049d3bfc3df246d3613f0',
          redirectUri : process.env.CALLBACK_URL
        });

        DJSpotifyApi.setAccessToken(DJAccessToken);

        DJSpotifyApi.getMyCurrentPlaybackState()
        .then(function(data) {

          if ( !io.sockets.adapter.rooms[room].songURI ) {
            console.log("****FIRST TIME IT SHOULD ENTER HERE****");
            console.log(data);
            io.sockets.adapter.rooms[room].timeProgress = data.body.progress_ms;
            io.sockets.adapter.rooms[room].songURI = data.body.item.uri;

            // major change made here in case stuff goes wrong
            io.to(room).emit("DJSetting",{a:data.body.progress_ms,b:data.body.item.uri});

            io.sockets.adapter.rooms[room].lastSongs = [data.body.item.name];


          }
          else {
            console.log("****same song****");
            if(!data.body.is_playing){

            }
            if( io.sockets.adapter.rooms[room].songURI !== data.body.item.uri ) {
              console.log("song changed altogether");
              io.sockets.adapter.rooms[room].timeProgress = data.body.progress_ms;
              io.sockets.adapter.rooms[room].songURI = data.body.item.uri;

              //change made here
              io.to(room).emit("DJSetting",{a:data.body.progress_ms,b:data.body.item.uri});

              io.sockets.adapter.rooms[room].lastSongs.push(data.body.item.name);
              console.log("lasts songs are",io.sockets.adapter.rooms[room].lastSongs)
              io.to(room).emit('lastSongsChanged',io.sockets.adapter.rooms[room].lastSongs);
              //socket.broadcast.to(room).emit("DJSetting",{a:data.body.progress_ms,b:data.body.item.uri});

            }
            else {
              if(data.body.is_playing){
                if(Math.abs(data.body.progress_ms - io.sockets.adapter.rooms[room].timeProgress) > 20000 ){
                  console.log("****same song but change in time*****");
                  //change made here
                  io.to(room).emit("DJSetting",{a:data.body.progress_ms,b:data.body.item.uri});
                }
                io.sockets.adapter.rooms[room].timeProgress = data.body.progress_ms;
              }
            }
          }

        })
        .catch(function(error){
          console.log("here");
          console.log(error);
        })

      }

      var room = socketObj['room'];

      var spotifyId = socketObj['spotifyId'];

      var imageURL = socketObj['imageURL'];

      socket.room = room;

      var spotifyApi = new SpotifyWebApi({
        clientId : process.env.SPOTIFY_ID,
        clientSecret : process.env.SPOTIFY_SECRET,
        redirectUri : process.env.CALLBACK_URL
      });

      setInterval(function() {
        spotifyApi.refreshAccessToken()
        .then(function(data) {
          console.log('The access token has been refreshed !');
          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body['access_token']);
          io.sockets.adapter.rooms[room].DJToken = spotifyApi.getAccessToken();

        }, function(err) {
          console.log('Could not refresh access token', err);
        });
      }, 60000 *30 );

      User.findOne({spotifyId: spotifyId}, function(err, user){
        spotifyApi.setRefreshToken(user.refreshToken);
        spotifyApi.refreshAccessToken()
        .then(function(data) {
          spotifyApi.setAccessToken(data.body['access_token']);
        })
        .then(function(){
          socket.join(room);
          io.sockets.adapter.rooms[room].DJToken = spotifyApi.getAccessToken();
          io.sockets.adapter.rooms[room].imageURL = imageURL;

          socket.emit('djRoomInfo', {room:room, djPhoto: io.sockets.adapter.rooms[room].imageURL})
          io.sockets.adapter.rooms[room].listeners = [];
          console.log("set listeners array", io.sockets.adapter.rooms[room].listeners);

          var x= setInterval(function(){
            if(io.sockets.adapter.rooms[room]){
              return getDJData(io.sockets.adapter.rooms[room].DJToken, room);
            }else{
              console.log("room gone");
              clearInterval(x);
            }}, 5000);
          // io.sockets.adapter.rooms[room].clearVar = clearVar ;
        })
      })

    })

    //fixed

    socket.on('joinRoom', function(requestedRoom, username, imageURL){

      console.log("joining room", username);

      socket.emit("roomInfo", {room:requestedRoom,
        djPhoto: io.sockets.adapter.rooms[requestedRoom].imageURL,
        listeners: io.sockets.adapter.rooms[requestedRoom].listeners})

      var forJoining = function(DJAccessToken) {
        console.log("forJoining",DJAccessToken);
        var DJSpotifyApi = new SpotifyWebApi({
          clientId : process.env.SPOTIFY_ID,
          clientSecret : process.env.SPOTIFY_SECRET,
          redirectUri : process.env.CALLBACK_URL
        });

        var startData;

        DJSpotifyApi.setAccessToken(DJAccessToken);

        return DJSpotifyApi.getMyCurrentPlaybackState()
        .then(function(data){
          console.log(data, 'there is no data here');
          startData = {a: data.body.progress_ms, b: data.body.item.uri};
          return startData;
        })


      }

      if (!requestedRoom) {
        return socket.emit('errorMessage', 'No room!');
      }
      if (socket.room) {
        socket.leave(socket.room);
      }
      socket.room = requestedRoom;
      socket.join(requestedRoom);
      var userObj = {
        username: username,
        imageURL: imageURL,
      }
      io.sockets.adapter.rooms[requestedRoom].listeners.push(userObj); //add user to room
      io.to(requestedRoom).emit('newUserJoined', userObj);
      forJoining(io.sockets.adapter.rooms[requestedRoom].DJToken)
      .then(function(data){
        socket.emit("DJSetting",{a: data.a, b: data.b});
      })
      .catch(function(error){
        console.log(error);
      })
    })

    socket.on('getRooms',function(){
      console.log("reached getRooms");
      console.log(io.sockets.adapter.rooms);
      socket.emit('rooms', io.sockets.adapter.rooms);
    })

    socket.on('djCloseRoom',function(roomName){
      console.log("Dj close room", roomName);
      io.to(roomName).emit("disconnectFromRoom",roomName);

    })

    socket.on('leaveRoom',function(obj){
      socket.leave(obj.roomName);
      io.sockets.to(obj.roomName).emit('userLeft', obj.username);
      var array = io.sockets.adapter.rooms[obj.roomName].listeners;
      for(var i=0;i<array.length;i++){
        if(array[i].username===obj.username){
          array.splice(i,1);
        }
      }
      io.sockets.adapter.rooms[obj.roomName].listeners = array;
    })

    socket.on('newDj', function(newDjUsername){

      var room = socket.room;

      console.log("came here for newDj", newDjUsername);

      var array = io.sockets.adapter.rooms[room].listeners;
      for(var i=0;i<array.length;i++){
        if(array[i].username===newDjUsername){
          array.splice(i,1);
        }
      }
      io.sockets.adapter.rooms[room].listeners = array;

      var spotifyApi2 = new SpotifyWebApi({
        clientId : process.env.SPOTIFY_ID,
        clientSecret : process.env.SPOTIFY_SECRET,
        redirectUri : process.env.CALLBACK_URL
      });

      User.findOne({username: newDjUsername}, function(err, user){
        console.log("user", user);
        spotifyApi2.setRefreshToken(user.refreshToken);
        spotifyApi2.refreshAccessToken()
        .then(function(data) {
          console.log("first successs");
          spotifyApi2.setAccessToken(data.body['access_token']);
        })
        .then(function(){
          console.log("second success");
          io.sockets.adapter.rooms[room].DJToken = spotifyApi2.getAccessToken();
          io.sockets.adapter.rooms[room].imageURL = user.image;
          console.log("*********", room, io.sockets.adapter.rooms[room].imageURL, io.sockets.adapter.rooms[room].listeners );
          io.sockets.to(room).emit('newDjRoomInfo', {THEDJ:newDjUsername,room: room,
            djPhoto: io.sockets.adapter.rooms[room].imageURL,
          listeners: io.sockets.adapter.rooms[room].listeners});
          console.log("fuck you");
        })
        .catch(function(error){
          console.log(error);
        })
      })
    })

    socket.on('leaveRoomDj', function(){
      var room = socket.room;
      socket.leave(room);

      socket.emit('djLeftRoom', room);
    })

  })

  return router;
}
