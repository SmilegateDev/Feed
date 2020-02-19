var express = require('express');
var router = express.Router();
var Post = require('../schemas/post');
var {Follow} = require('../models');
var nJwt = require('njwt');
var Client = require('mongodb').MongoClient;

// follower: 팔로잉을 하는 사람

function getCurrentDate(){
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth();
  var today = date.getDate();
  collection_name=year.toString()+month.toString()+today.toString();
  return collection_name;
}

router.get('/getFeed', function(req, res, next) {
  console.log('connect');
  const tokenvalue=nJwt.verify(req.headers.authorization,'nodebird', 'HS256');
  const userID = tokenvalue.body.id; // req.decoded.id
  //for(let i=0; i<3 ;i++){
    var todayCollection=Number(getCurrentDate());
    var collectionName=todayCollection.toString();
    Client.connect('mongodb://localhost:27017/Post',function(err,db){
    if(err){
        console.log(err);
        res.send(err);
    }
    else{
      console.log('connect');
      var dbo = db.db('Post');
      var field = {writer:tokenvalue.body.nickname};
      var cursor = dbo.collection(collectionName).find(field).toArray(function(err,result){
        console.log(result);
        res.send(JSON.stringify(result));
      });
    }
  });
/*
router.get('/getFeed', function(req, res, next) {
  const tokenvalue=nJwt.verify(req.headers.authorization,'nodebird', 'HS256');
  const userID = tokenvalue.body.id; // req.decoded.id
  //for(let i=0; i<3 ;i++){
    var todayCollection=Number(getCurrentDate());
    collectionName=todayCollection.toString();
    Post.find({writer:tokenvalue.body.nickname},async function(err,Post){
      console.log(JSON.stringify(Post));
      try{
        res.send(JSON.stringify(Post));
      }catch(err){
        res.send(err);
      }
    });
    */
  //}
  /*
  const follow = [
    {"following": 3, "follower": 7, "friendship": 55, "status": 1},
    {"following": 10, "follower": 17, "friendship": 7, "status": 1},
    {"following": 1, "follower": 33, "friendship": 15, "status": 1},
    {"following": 15, "follower": 52, "friendship": 9, "status": 1},
    {"following": 33, "follower": 12, "friendship": 25, "status": 1},
    {"following": 42, "follower": 52, "friendship": 17, "status": 1},
    {"following": 9, "follower": 41, "friendship": 13, "status": 1},
    {"following": 7, "follower": 15, "friendship": 19, "status": 1},
    {"following": 12, "follower": 9, "friendship": 29, "status": 1},
    {"following": 15, "follower": 7, "friendship": 33, "status": 1},
    {"following": 51, "follower": 52, "friendship": 35, "status": 0},
    {"following": 52, "follower": 1, "friendship": 21, "status": 1},
    {"following": 37, "follower": 22, "friendship": 22, "status": 1},
    {"following": 12, "follower": 52, "friendship": 31, "status": 1},
    {"following": 38, "follower": 31, "friendship": 35, "status": 1},
    {"following": 32, "follower": 39, "friendship": 1, "status": 1},
    {"following": 66, "follower": 40, "friendship": 41, "status": 1},
    {"following": 41, "follower": 44, "friendship": 5, "status": 1},
    {"following": 19, "follower": 52, "friendship": 53, "status": 1}
  ];

  const post = [
    {"objectID": "zxmskqwea", "writer": 15, "title": "TITLE1", "content": "TEST1", "createAt": 6},
    {"objectID": "sxmzxcwea", "writer": 42, "title": "TITLE1", "content": "TEST2", "createAt": 1},
    {"objectID": "eqwrwqwea", "writer": 19, "title": "TITLE1", "content": "TEST3", "createAt": 10},
    {"objectID": "zsadqwexa", "writer": 51,"title": "TITLE1", "content": "TEST4", "createAt": 31},
    {"objectID": "vbsdfweeea", "writer": 21, "title": "TITLE1","content": "TEST5", "createAt": 7},
    {"objectID": "cvbrtyerwea", "writer": 12,"title": "TITLE1", "content": "TEST6", "createAt": 22},
    {"objectID": "ertrtydfwea", "writer": 33,"title": "TITLE1", "content": "TEST7", "createAt": 3},
    {"objectID": "iuyiyccvxwq", "writer": 8,"title": "TITLE1", "content": "TEST8", "createAt": 7},
    {"objectID": "poiasdzxcsa", "writer": 3,"title": "TITLE1", "content": "TEST9", "createAt": 6},
    {"objectID": "zyqxcvasdq", "writer": 37, "title": "TITLE1","content": "TEST10", "createAt": 11},
    {"objectID": "zqazxcadqw", "writer": 12, "title": "TITLE1","content": "TEST11", "createAt": 17},
    {"objectID": "bnvnrtytyea", "writer": 42,"title": "TITLE1", "content": "TEST12", "createAt": 14},
    {"objectID": "poipofdgdfg", "writer": 15, "title": "TITLE1","content": "TEST13", "createAt": 2}
  ];
*/
/*
  const today = 50;

  const userFollowRec = follow.filter(rec => { // 팔로워가 userID와 일치하는 레코드
    return rec.follower === userID;
  });

  let userFollowing = new Array();

  for (let i = 0; i < userFollowRec.length; i++) { // 위의 userFollowRec에서 Following만 추출
    userFollowing.push(userFollowRec[i].following);
  }

  const userFeed = post.filter(rec => { // Feed에서 writer가 userFollowing인 레코드만 경우만 추출
    return userFollowing.includes(rec.writer);
  });

  let tempRec = new Object();
  let tempFriendship = new Object();
  let result = new Array();

  for (let i = 0; i < userFeed.length; i++) {
    tempRec = userFollowRec.filter(rec => {
      return userFeed[i].writer === rec.following;
    });

    tempFriendship = tempRec[0].friendship * tempRec[0].status;

    if (tempFriendship)
      result.push([userFeed[i].objectID, userFeed[i].title, userFeed[i].content, Math.pow((today - userFeed[i].createAt) * tempFriendship,-2)]);
  }

  result.sort(function compare(kv1, kv2) {
    return kv2[3] - kv1[3];
  });
  console.log(result);
  res.send(result);
  */
});

module.exports = router;