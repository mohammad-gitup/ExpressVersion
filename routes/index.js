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
    console.log(req.user);
    res.render('home',{
      id:req.user.spotifyId
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
      djSpotifyId:req.user.spotifyId
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
          console.log(err, user);
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

    socket.on('createRoom',function(socketObj){

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
            socket.broadcast.to(room).emit("DJSetting",{a:data.body.progress_ms,b:data.body.item.uri});
          }
          else {
            console.log("****same song****");
            if(!data.body.is_playing){

            }
            if( io.sockets.adapter.rooms[room].songURI !== data.body.item.uri ) {
              console.log("song changed altogether");
              io.sockets.adapter.rooms[room].timeProgress = data.body.progress_ms;
              io.sockets.adapter.rooms[room].songURI = data.body.item.uri;
              socket.broadcast.to(room).emit("DJSetting",{a:data.body.progress_ms,b:data.body.item.uri});
            }
            else {
              if(data.body.is_playing){
                if(Math.abs(data.body.progress_ms - io.sockets.adapter.rooms[room].timeProgress) > 20000 ){
                  console.log("****same song but change in time*****");
                  socket.broadcast.to(room).emit("DJSetting",{a:data.body.progress_ms,b:data.body.item.uri});
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

      var spotifyId = socketObj['id'];

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
          setInterval(function(){return getDJData(io.sockets.adapter.rooms[room].DJToken, room)}, 5000);

        })
      })

    })

    socket.on('joinRoom', function(requestedRoom){

      console.log("joining room");

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
      forJoining(io.sockets.adapter.rooms[requestedRoom].DJToken)
      .then(function(data){
        socket.emit("DJSetting",{a: data.a, b: data.b});
      })
      .catch(function(error){
        console.log(error);
      })
    })


  })

  return router;
}