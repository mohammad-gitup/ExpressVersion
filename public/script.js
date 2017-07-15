$(document).ready(function() {

  var socket = io();

  socket.on('connect', function() {
    console.log('Connected!');
    socket.emit('spotifySetup', localStorage.getItem("spotifyId")); //change this asap
  });

  socket.on('getRefreshToken', function(refreshToken){
      localStorage.setItem("refreshToken",refreshToken);
      setInterval(function(){
        socket.emit("toRefresh", localStorage.getItem("refreshToken"));
      },60000*30);
  })

  socket.on('getAccessToken', function(userAccessToken) {
    localStorage.setItem("accessToken", userAccessToken);
  })

  socket.on('DJSetting', function(data) {

    console.log("reaching dj setting");
    var songProgress = data.a ;
    var songURI = data.b;
    //ajax call will be done here
    $.ajax({
      url:'https://api.spotify.com/v1/me/player/play',
      method:'PUT',
      headers: { 'Authorization':'Bearer ' + localStorage.getItem("accessToken"), "Content-Type": "application/json"},
      data: JSON.stringify({
        "uris" :[songURI]
      }),
      dataType: "JSON",
      success: function(data){
        console.log("this is it bitch");
        $.ajax({
          url: `https://api.spotify.com/v1/me/player/seek?position_ms=${songProgress}`,
          headers: { 'Authorization': 'Bearer ' +  localStorage.getItem("accessToken")},
          method:'put',
          json:true,
          success:function(something){
            console.log("lets go home");
          }

        })
      }
    })
  })

  $('.wrapper').on('click' , '#createRoom ',function(event) {
    $('.wrapper').empty();
    var createTemplate = $(
      `<div class="main">
      <div class="container-fluid">
        <div class="center topLevel" style="width: 60%; margin-right: auto; margin-left: auto;">
          <input name="roomNameBar" id="roomName" placeholder="Enter a room name here" class="ghost-input text-center"></input>
        </div>
        <div class="center" >
          <h1 class="text-center text label-text boxed raise" name="button" id="startRoom">Go Live</h1>
        </div>
      </div>
    </div>`
    )
    $('.wrapper').append(createTemplate);
  })

  $('.wrapper').on('click', '#startRoom', function(event){
    event.preventDefault();
    var room = $('#roomName').val();
    var spotifyId = localStorage.getItem('spotifyId');
    var imageURL = localStorage.getItem('imageURL')
    var socketObj = {'room': room, 'spotifyId': spotifyId, imageURL:imageURL};
    socket.emit('startRoom', socketObj);
  })

  $('.wrapper').on('click', '#joinRoom', function(event){
    event.preventDefault();
    console.log("reached jquery.");
    socket.emit('getRooms');
  })

  $('.wrapper').on('click', '.joinexistingRoom', function(event){
    event.preventDefault();
    var roomName = $(this).attr("data-id");
    var username = localStorage.getItem('username');
    console.log("joining room" + roomName);
    socket.emit('joinRoom', roomName, username);
  });

  $('.wrapper').on('click', '.closeRoom', function(event){
    event.preventDefault();
    var roomName = $(this).attr("data-id");
    socket.emit('djCloseRoom', roomName);
  });

  $('.wrapper').on('click', '.leaveRoom', function(event){
    event.preventDefault();
    var roomName = $(this).attr("data-id");
    socket.emit('leaveRoom', roomName);
    var home = `<div class="container-fluid" >
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

  socket.on('roomInfo', function(roomInfo) {
    var users = `<div class="singleDot"> ... </div>`
    var djRoom=`<div>
          <div>
            Room Name ${roomInfo.room}
          </div>

          <div>
            Dj Photo: <img src="${roomInfo.djPhoto}" style="width:304px;height:228px;">
          </div>

          <ul class="activeUsers">

          </ul >
          <button type="button" class="leaveRoom" data-id="${info.room}">Leave room</button>
          </div>`;
    var users = roomInfo.listeners;
    for(var i=0 ;i<users.length; i++){
      var userObj = users[i];
      $('.activeUsers').append(`<li> | ${userObj.username} | <img src=${userObj.imageURL}> </li>`);
    }

      $('.wrapper').empty();
      $('.wrapper').append(djRoom);
    })

  socket.on('rooms', function(rooms){
    console.log(rooms);
    var listofRooms = [];
    for(var key in rooms){
      if(rooms[key].hasOwnProperty('DJToken')){
        listofRooms.push(key);
      }
    }


    console.log(listofRooms);
    $('.wrapper').empty();
    $('.wrapper').append(`<h3 style="color:white">List of available rooms</h3>`);
    $('.wrapper').append(`<input type="text" id="myInput" onkeyup="searchFunction()"
    placeholder="Search for names..">`)
    $('.wrapper').append(`<ul id="listofRooms"> </ul>`);

    for(var i =0  ; i< listofRooms.length ;i++){
      var roomItem = $(`<li>
            <button type="button" class="joinexistingRoom" data-id='${listofRooms[i]}'>${listofRooms[i]}</button>
                  </li>`);
      $('#listofRooms').append(roomItem);

    }

  })

  socket.on('djRoomInfo', function(info) {
      var users = `<div class="singleDot"> ... </div>`
      var djRoom=`<div>
      <div>
        Room Name ${info.room}
      </div>

      <div>
        Dj Photo: <img src="${info.djPhoto}" style="width:304px;height:228px;">
      </div>

      <ul class="activeUsers">

      </ul>
      <button type="button" class="closeRoom" data-id="${info.room}">Close room</button>
    </div>`;
    $('.wrapper').empty();
    $('.wrapper').append(djRoom);

  });

  socket.on('disconnectFromRoom', function(roomName) {
    socket.emit('leaveRoom', roomName);
    var home = `<div class="container-fluid" >
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

  socket.on('newUserJoined', function(userObj){
    console.log("newuserjoined", userObj.username);
    $('.activeUsers').append(`<li> | ${userObj.username} | <img src=${userObj.imageURL}> </li>`);
  })

});
