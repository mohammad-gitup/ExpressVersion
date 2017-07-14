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
    event.preventDefault();
    var room = $('#roomName').val();
    var id = localStorage.getItem('userObj').spotifyId;
    var imageURL= localStorage.getItem('userObj').imageURL;
    var socketObj = {'room': room, 'id': id};
    socket.emit('createRoom', socketObj);
    $.ajax({
      url: '/createRoom',
      method: 'post',
      data: {
        roomName:room,
        djSpotifyId:id,
        imageURL: imageURL
      },
      success: function(response){
        console.log("logging here",response);
        $('.main').append('<p>You are live now</p>')
        var offButton = $(`<button type="submit" id="closeRoom" data-id=${response.djSpotifyId}> Go offline </button>`);
        $('.main').append(offButton);
      }
    })
  })

  $('.joinexistingRoom').on('click',function(event){
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
      Dj Photo:
    </div>

    <div>
      Users: ${users}
    </div>

    </div>`;
      $('.wrapper').empty();
      $('.wrapper').append(djRoom);
    })


  $('#closeRoom').on('click',function(){
    var id=$(this).attr('data-id');

  })




});
