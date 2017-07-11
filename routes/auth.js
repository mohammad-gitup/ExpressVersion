var express = require('express');
var router = express.Router();
var models = require('../models/models');
var User = models.User;

module.exports = function(passport) {

  //not in use right now.

  router.get('/signup',function(req,res){
    res.render('signup');
  })

  //not in use right now.

  router.post('/signup',function(req,res){
        var newUser=new User({
          username:req.body.username,
          password:req.body.password,
          phone:req.body.number
        })
      newUser.save(function(err,user){
        if(err)console.log(err);
        else{
          res.redirect('login');
        }
      })

  })

  router.get('/login',function(req,res){
    res.render('login');
  })

  router.get('/auth/spotify',passport.authenticate('spotify',{scope: ['user-read-email', 'user-read-private','user-modify-playback-state', 'user-read-playback-state'] }));

  router.get('/auth/spotify/callback',passport.authenticate('spotify', { failureRedirect: '/login' }),
    function(req, res) {
      console.log("HERE");
    res.redirect('/');
  });

  router.get('/logout',function(req,res){
    req.logout();
    res.redirect('/login');
  })

  return router;
}
