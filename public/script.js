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
    var songProgress = data.a;
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

  $('#createRoom').on('click' ,function(event) {
    $('.wrapper').empty();
    var createTemplate = $(
      `<div class="main">
        <input type="text" name="roomNameBar" id="roomName"> </br>
        <button type="submit" name="button" id="startRoom"> Submit </button>
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

  $('#joinRoom').on('click', function(event){
    event.preventDefault();
    console.log("reached jquery.");
    socket.emit('getRooms');
  })

  $('.wrapper').on('click', '.joinexistingRoom', function(event){
    event.preventDefault();
    var roomName = $(this).attr("data-id");
    console.log("joining room" + roomName);
    socket.emit('joinRoom', roomName);
  });

  socket.on('roomInfo', function(info) {
    var users = `<div class="singleDot"> ... </div>`
    var djRoom=`<div>
    <div>
      Room Name ${info.room}
    </div>

    <div>
      Dj Photo: <img src="${info.djPhoto}" style="width:304px;height:228px;">
    </div>

    <div>
      Users:
    </div>
    <button type="button" class="leaveRoom" data-id="${info.room}">Leave room</button>
    </div>`;
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
    function myFunction() {
        // Declare variables
        var input, filter, ul, li, a, i;
        input = document.getElementById('myInput');
        filter = input.value.toUpperCase();
        ul = document.getElementById("listofRooms");
        li = ul.getElementsByTagName('li');

        // Loop through all list items, and hide those who don't match the search query
        for (i = 0; i < li.length; i++) {
            a = li[i].getElementsByTagName("button")[0];
            if (a.innerHTML.toUpperCase().indexOf(filter) > -1) {
                li[i].style.display = "";
            } else {
                li[i].style.display = "none";
            }
        }
    };

    console.log(listofRooms);
    $('.wrapper').empty();
    $('.wrapper').append(`<h3 style="color:white">List of available rooms</h3>`);
    $('.wrapper').append(`<input type="text" id="myInput" onkeyup="myFunction()"
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
        Dj Photo:
      </div>

      <div>
        Users: ${info.djPhoto}
      </div>
      <button type="button" class="closeRoom" data-id="${info.room}">Leave room</button>
      </div>`;
        $('.wrapper').empty();
        $('.wrapper').append(djRoom);
      })

  $('#closeRoom').on('click',function(){
    var id=$(this).attr('data-id');
  })


});
