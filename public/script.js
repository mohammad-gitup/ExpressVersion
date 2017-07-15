$(document).ready(function () {

        var socket = io();
        //first connect
        socket.on('connect', function () {
            console.log('Connected!');
            socket.emit('spotifySetup', localStorage.getItem("spotifyId")); //change this asap
        });

        socket.on('getRefreshToken', function (refreshToken) {
            localStorage.setItem("refreshToken", refreshToken);
            setInterval(function () {
                socket.emit("toRefresh", localStorage.getItem("refreshToken"));
            }, 60000 * 30);
        })

        socket.on('getAccessToken', function (userAccessToken) {
            localStorage.setItem("accessToken", userAccessToken);
        })
        // ajax call on client side to grab dj song
        socket.on('DJSetting', function (data) {

            console.log("reaching dj setting");
            var songProgress = data.a;
            var songURI = data.b;
            //ajax call will be done here
            $.ajax({
                url: 'https://api.spotify.com/v1/me/player/play',
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem("accessToken"),
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "uris": [songURI]
                }),
                dataType: "JSON",
                success: function (data) {
                    console.log("this is it bitch");
                    $.ajax({
                        url: `https://api.spotify.com/v1/me/player/seek?position_ms=${songProgress}`,
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem("accessToken")
                        },
                        method: 'put',
                        json: true,
                        success: function (something) {
                            console.log("lets go home");
                        }
                    })
                }
            })
        })

        $('.wrapper').on('click', '#createRoom ', function (event) {
                $('.wrapper')
                    .empty();
                var createTemplate = $(`
                  <div class="main">
                    <div class="container-fluid">
                      <div class="center topLevel" style="width: 60%; margin-right: auto; margin-left: auto;">
                        <input name="roomNameBar" id="roomName" placeholder="Enter a room name here" class="ghost-input text-center"></input>
                      </div>
                      <div class="center" >
                        <h1 class="text-center text label-text boxed raise" name="button" id="startRoom">Go Live</h1>
                      </div>
                    </div>
                  </div>`);
                $('.wrapper').append(createTemplate);
            })

        $('.wrapper').on('click', '#startRoom', function (event) {
                event.preventDefault();
                var room = $('#roomName')
                    .val();
                var spotifyId = localStorage.getItem('spotifyId');
                var imageURL = localStorage.getItem('imageURL')
                var socketObj = {
                    'room': room,
                    'spotifyId': spotifyId,
                    imageURL: imageURL
                };
                socket.emit('startRoom', socketObj);
            });

        $('.wrapper').on('click', '#joinRoom', function (event) {
                event.preventDefault();
                console.log("reached jquery.");
                socket.emit('getRooms');
            })

        $('.wrapper').on('click', '.joinexistingRoom', function (event) {
                event.preventDefault();
                var roomName = $(this).attr("data-id");
                var username = localStorage.getItem('username');
                var imageURL = localStorage.getItem('imageURL');
                console.log("joining room" + roomName);
                socket.emit('joinRoom', roomName, username, imageURL);
            });

        $('.wrapper').on('click', '.closeRoom', function (event) {
                event.preventDefault();
                var roomName = $(this).attr("data-id");
                socket.emit('djCloseRoom', roomName);
            });

        $('.wrapper').on('click', '.leaveRoom', function (event) {
                event.preventDefault();
                var roomName = $(this).attr("data-id");
                var username = localStorage.getItem('username');
                socket.emit('leaveRoom', {
                    roomName: roomName,
                    username: username
                });

                var home = `
                <div class="container-fluid">
                  <div style="display: flex; justify-content: center; margin-left: 50%; margin-right: auto; margin-top: 5%">
                    <a class="topLevel text" id="createRoom" ><span class="text-center raise boxed headertext text">Create</span></a>
                    <img src="/static/images/leftaux.svg" class="img-responsive" style="position: sticky; margin-top: 10%;">
                  </div>
                  <br><br>
                    <h2 class="text middle">OR</h2>
                    <br><br>
                      <div style="display: flex; justify-content: center; margin-right: 50%; margin-left: auto;">
                        <img style="position: sticky;" class="img-responsive text" src="/static/images/rightaux.svg" alt="">
                        <a class="text" id="joinRoom"><span class="text-center raise boxed text headertext"><span class="text headertext" style="opacity: 0">1</span>Join<span class="text headertext" style="opacity: 0">1</span></span></a>
                      </div>
                  </div>`;
                $('.wrapper').empty();
                $('.wrapper').append(home);
            })

        $('.wrapper').on('click', '.passDJ', function (event) {
                var newDjUsername = $(this)
                    .attr('data-id');
                console.log("new dj name", newDjUsername);
                socket.emit('newDj', newDjUsername);
                socket.emit('leaveRoomDj');
            })

        socket.on('newRoomCreated', function (room) {
            var roomItem = $(`<h1 class="raise-room joinexistingRoom" data-id='${room}'>${room}</h1>`);
            if ($('#listofRooms')) {
                $('#listofRooms').append(roomItem);
                var numberOfRooms = $('#numberOfRooms').attr('data-id');

            }
        })

        socket.on('rooms', function (rooms) {
            console.log(rooms);
            var listofRooms = [];
            for (var key in rooms) {
                if (rooms[key].hasOwnProperty('DJToken')) {
                    listofRooms.push(key);
                }
            }
            console.log(listofRooms);
            $('.wrapper')
                .empty();
            // $('.wrapper').append(`<h1 class="text headertext"></h1>`);
            $('.wrapper')
                .append(`
                <div class="center">
                  <h1 class="text-center text" data-id="${listofRooms.length}">There are <span id="numberOfRooms">${listofRooms.length}</span> rooms to browse</h1>
                </div>
                <div class="center" style="width: 40%; margin-right: auto; margin-left: auto;">
                  <input id="myInput" style="font-size: 30px;" placeholder="Search for a room..." class="ghost-input text-center" id="myInput" onkeyup="searchFunction()"></input>
                </div>`)
            $('.wrapper')
                .append(`<div id="listofRooms" class="text-center standard-text" style="width: 35%; margin-right: auto; margin-left: auto; overflow: auto;"></div>`);

            for (var i = 0; i < listofRooms.length; i++) {
                var roomItem = $(`<h1 class="raise-room joinexistingRoom" data-id='${listofRooms[i]}'>${listofRooms[i]}</h1>`);
                $('#listofRooms')
                    .append(roomItem);
            }

            $('.wrapper')
                .append(`
              <div class="center">
                <h1 class="text-center text middle boxed raise">Or start your own party</h1>
              </div>`);
        })

        socket.on('roomInfo', function (roomInfo) {
            var djRoom = `
              <div>
                <div class="row">
                  <div class="col-sm-3">
                    <h1 data-id="${roomInfo.room}" style="margin-left: 5%; margin-right: 5%;"class="leaveRoom text-center text small boxed raise">Leave</h1>
                  </div>
                  <div class="col-sm-6">
                    <h1 class="text-center standard-text medium animated slideInDown">${roomInfo.room}</h1>
                    <div id="djphoto" class='center'>
                      <img src=${roomInfo.djPhoto} class="img-responsive animated wobble" style="border-radius: 50%; width: 10%; height: 20%;" >
                      </div>
                      <h2 class="text-center standard-text small">Hosted by: ${roomInfo.djusername}</h2>
                    </div>
                  </div>
                  <ul class="activeUsersforUser">
                  </ul >
                  <ul class="lastSongs">
                  </ul >
              </div>`;

            $('.wrapper')
                .empty();
            $('.wrapper')
                .append(djRoom);
            var users = roomInfo.listeners;
            for (var i = 0; i < users.length; i++) {
                var userObj = users[i];
                $('.activeUsersforUser')
                    .append(`<li data-id="${userObj.username}"> | ${userObj.username} | <img src=${userObj.imageURL}> </li>`);
            }

        })

        socket.on('djRoomInfo', function (info) {
            var djRoom = `
                <div>
                  <div class="row">
                    <div class="col-sm-3">
                      <h1 data-id="${info.room}" style="margin-left: 5%; margin-right: 5%;"class="closeRoom text-center text small boxed raise">Close Room</h1>
                    </div>
                    <div class="col-sm-6">
                      <h1 class="text-center standard-text medium animated slideInDown">${info.room}</h1>
                      <div id="djphoto" class='center'>
                        <img src=${info.djPhoto} class="img-responsive animated wobble" style="border-radius: 50%; width: 10%; height: 20%;" >
                        </div>
                        <h2 class="text-center standard-text small">You are the host</h2>
                      </div>
                    </div>
                    <ul class="activeUsers">
                    </ul>
                    <ul class="lastSongs">
                    </ul >
                  </div>`;
            $('.wrapper').empty();
            $('.wrapper').append(djRoom);
        });

        //FIX this select specific socket id
        socket.on('newDjRoomInfo', function (info) {
            if (info.djusername === localStorage.getItem('username')) {
                $('.wrapper').empty();
                var djRoom = `
              <div>
                <div class="row">
                  <div class="col-sm-3">
                    <h1 data-id="${info.room}" style="margin-left: 5%; margin-right: 5%;" class="closeRoom text-center text small boxed raise">Close Room</h1>
                  </div>
                  <div class="col-sm-6">
                    <h1 class="text-center standard-text medium animated slideInDown">${info.room}</h1>
                    <div id="djphoto" class='center'>
                      <img src=${info.djPhoto} class="img-responsive animated wobble" style="border-radius: 50%; width: 10%; height: 20%;" >
                      </div>
                      <h2 class="text-center standard-text small">You are the host</h2>
                    </div>
                  </div>
                  <ul class="activeUsers">
                  </ul>
                  <ul class="lastSongs">
                  </ul >
                </div>`;
                $('.wrapper').append(djRoom);
                var users = info.listeners;
                for (var i = 0; i < users.length; i++) {
                    var userObj = users[i];
                    $('.activeUsers').append(
                      `<li data-id="${userObj.username}">
                        | <button type="button" class="passDJ" data-id='${userObj.username}'>${userObj.username}</button>
                        | <img src=${userObj.imageURL}>
                      </li>`);
                }
            }
            else {
              $('.wrapper').empty();
                var djRoom = `
                  <div>
                    <div class="row">
                      <div class="col-sm-3">
                        <h1 data-id="${info.room}" style="margin-left: 5%; margin-right: 5%;"class="leaveRoom text-center text small boxed raise">Leave</h1>
                      </div>
                      <div class="col-sm-6">
                        <h1 class="text-center standard-text medium animated slideInDown">${info.room}</h1>
                        <div id="djphoto" class='center'>
                          <img src=${info.djPhoto} class="img-responsive animated wobble" style="border-radius: 50%; width: 10%; height: 20%;" >
                          </div>
                          <h2 class="text-center standard-text small">Hosted by: ${info.djusername}</h2>
                        </div>
                      </div>
                  <ul class="activeUsersforUser">
                  </ul >
                  <ul class="lastSongs">
                  </ul >
                </div>`;
                $('.wrapper').append(djRoom);
                var users = info.listeners;
                for (var i = 0; i < users.length; i++) {
                    var userObj = users[i];
                    $('.activeUsersforUser').append(
                      `<li
                        data-id="${userObj.username}">
                        | ${userObj.username} |
                        <img src=${userObj.imageURL}>
                        </li>`);
                }
            }
        });

        socket.on('disconnectFromRoom', function (roomName) {
          socket.emit('leaveRoom', roomName);
          var home = `
          <div class="container-fluid" >
            <div style="display: flex; justify-content: center; margin-left: 50%; margin-right: auto; margin-top: 5%">
              <a class="topLevel text" id="createRoom" ><span class="text-center raise boxed headertext text">Create</span></a>
              <img src="/static/images/leftaux.svg" class="img-responsive" style="position: sticky; margin-top: 10%;">
            </div>
            <br><br>
              <h2 class="text middle">OR</h2>
              <br><br>
                <div style="display: flex; justify-content: center; margin-right: 50%; margin-left: auto;">
                  <img style="position: sticky;" class="img-responsive text" src="/static/images/rightaux.svg" alt="">
                  <a class="text" id="joinRoom"><span class="text-center raise boxed text headertext"><span class="text headertext" style="opacity: 0">1</span>Join<span class="text headertext" style="opacity: 0">1</span></span></a>
                </div>
              </div>`;
              $('.wrapper').empty();
              $('.wrapper').append(home);
            });

        socket.on('newUserJoined', function (userObj) {
              console.log("newuserjoined", userObj.username);
              $('.activeUsers').append(
                `<li data-id="${userObj.username}">
                  | <button type="button" class="passDJ" data-id='${userObj.username}'>${userObj.username}</button>
                  | <img src=${userObj.imageURL}>
                </li>`);
                $('.activeUsersforUser').append(
                  `<li
                    data-id="${userObj.username}">
                    | ${userObj.username} |
                    <img src=${userObj.imageURL}>
                    </li>`);
        });

        socket.on('lastSongsChanged', function(lastSong) {
            console.log("lastSongsChanged", lastSong);
            $('.lastSongs').empty();
                    //length of lasts songs, if we want more than 5 we can change the info here
            for (var i = lastSong.length; i > lastSong.length - 6; i--) {
                if (lastSong[i]) {
                    $('.lastSongs').append(`<span style="color: black;" class="raise-room text">${lastSong[i]}</span>`);
                }
            }
        });

        socket.on('djLeftRoom', function (room) {
            var username = localStorage.getItem('username');
            var imageURL = localStorage.getItem('imageURL');
            socket.emit('joinRoom', room, username, imageURL);
        })

        socket.on('userLeftRoom', function (username) {
            console.log("reached here", username);
            $('.activeUsers')
                .find(`[data-id='${username}']`).remove();
            $('.activeUsersforUser')
                .find(`[data-id='${username}']`).remove();
        });

});
