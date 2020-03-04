var express = require('express');
var router = express.Router();
var Post = require('../schemas/post');
var { Follow } = require('../models');
var nJwt = require('njwt');
var Client = require('mongodb').MongoClient;
var dotenv = require('dotenv');
var client = require('../cache_redis');
var async = require('async');

var isEmpty = function (value) {
  if (value == "" || value == null || value == undefined || (value != null && typeof value == "object" && !Object.keys(value).length)) {
    return true
  } else {
    return false
  }
};

function getCurrentDate() {
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth();
  var today = date.getDate();
  collection_name = year.toString() + month.toString() + today.toString();
  return collection_name;
};//오늘 날짜 체크

function getCurrentNow() {
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth();
  var today = date.getDate();
  var time = date.getTime();
  collection_name = year.toString() + month.toString() + today.toString() + time.toString();
  return collection_name;
};

// follower: 팔로잉을 하는 사람
router.post('/getFeed', async function (req, res) {
  var posts = [];
  const tokenvalue = nJwt.verify(req.headers.authorization, 'nodebird', 'HS256');
  const myNickName = tokenvalue.body.nickname;
  const myId = tokenvalue.body.id; // req.decoded.id
  var followingInform;
  var currentDateId;
  var postlist;
  var followingIdList = new Array();
  var postlist;
  var indexDate, lastIndexDate;
  var data = {};
  var newDate, newYear, newMonth, newToday, newPostDate;
  const minimumDate = 20200129;
  var checkDate;
  console.log(req.body.year);

  await Follow.findAll({
    where: {
      followerId: myId
    },
    attributes: ['followingId', 'like_num', 'comment_num'],
    paranoid: true
  })
  .then(result => {
    followingInform = JSON.parse(JSON.stringify(result));
  });
  //console.log(myId);

  for (var i = 0; i < followingInform.length; i++) {
    followingIdList.push(followingInform[i].followingId);
  }
  console.log(followingIdList);

  //console.log(dateNow);
  client.get(myId, async function (err, result) {
    postlist = result;
    //console.log(postlist,isEmpty(data),req.body.year);
    do {
      /* 완전한 첫번째 요청 */
      if (req.body.year == null && isEmpty(data) && postlist == null) {
        console.log("first req");
        var dateNow = new Date();
        var nowToday = dateNow.getDate();
        dateNow.setDate(nowToday - 2);
        newYear = dateNow.getFullYear();
        newMonth = dateNow.getMonth();
        newToday = dateNow.getDate();
        indexDate = newYear.toString() + newMonth.toString() + newToday.toString();

        if (newMonth < 10 && newToday < 10) {
          checkDate = newYear.toString() + '0' + newMonth.toString() + '0' + newToday.toString();
        } else if (newMonth < 10 && newToday >= 10) {
          checkDate = newYear.toString() + '0' + newMonth.toString() + newToday.toString();
        } else if (newMonth >= 10 && newToday < 10) {
          checkDate = newYear.toString() + newMonth.toString() + '0' + newToday.toString();
        } else {
          checkDate = newYear.toString() + newMonth.toString() + newToday.toString();
        }//값비교 고정

        console.log(checkDate, minimumDate);
        if (Number(checkDate) <= minimumDate) {
          console.log("small");
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          indexDate = minimumDate;
          await Post.find({
            userId: followingIdList,
            id: { '$gt': 0 }
          })
          .then(result => {
            data.Feed = result;
            data.Year = newYear;
            data.Month = newMonth;
            data.Date = newToday;
            data.isLastFeed = 1;
            client.set(myId, JSON.stringify(data));
            callback(null, 'callback good');
          })
        }

        await Post.findOne({ date: indexDate })
          .then(result => {
            //console.log(result)
            currentDateId = result.id;
          });

        await Post.find({
          userId: followingIdList,
          id: { '$gt': currentDateId }
        })
          .then(result => {
            data.Feed = result;
            data.Year = newYear;
            data.Month = newMonth;
            data.Date = newToday;
            data.isLastFeed = 0;
            console.log(Object.keys(data.Feed).length);
            client.set(myId, JSON.stringify(data));
            console.log("redis finish");
          })
        newPostDate = indexDate;
      } else if (req.body.year != null && Object.keys(JSON.parse(postlist)).length < 30 && postlist != null) {//redis에 저장된 게시물이 30개 이하일때, redis에 저장한 게시물 없을떄
        //2번째 요청부터
        console.log('check');
        var lastDate = req.body.year.toString() + req.body.month.toString() + req.body.date.toString();
        newDate = new Date(req.body.year, req.body.month, req.body.date - 2);
        newYear = newDate.getFullYear();
        newMonth = newDate.getMonth();
        newToday = newDate.getDate();
        newPostDate = newYear.toString() + newMonth.toString() + newToday.toString();
        await Post.findOne({ date: newPostDate })
          .then(result => {
            console.log(result);
            if (result == null) {
              console.log("check2");
              res.json({
                code: 200,
                isLastFeed: 1
              });
            }
          });
      } else if (req.body.year == null && data.Feed != null && Object.keys(data.Feed).length < 30) {
        //첫번째 요청에서 30개가 되지 않았을때
        console.log('case3 check');
        var lastdata;
        var lastDate = newPostDate; //이전에 저장된 date
        var lastDateId;
        console.log(newYear, newMonth, newToday);
        var dateNow = new Date(newYear, newMonth, newToday - 2);
        newYear = dateNow.getFullYear();
        newMonth = dateNow.getMonth();
        newToday = dateNow.getDate();
        indexDate = newYear.toString() + newMonth.toString() + newToday.toString();

        if (newMonth < 10 && newToday < 10) {
          checkDate = newYear.toString() + '0' + newMonth.toString() + '0' + newToday.toString();
        } else if (newMonth < 10 && newToday >= 10) {
          checkDate = newYear.toString() + '0' + newMonth.toString() + newToday.toString();
        } else if (newMonth >= 10 && newToday < 10) {
          checkDate = newYear.toString() + newMonth.toString() + '0' + newToday.toString();
        } else {
          checkDate = newYear.toString() + newMonth.toString() + newToday.toString();
        }//값비교 고정

        console.log(indexDate);
        if (Number(checkDate) <= minimumDate) {
          console.log('small');
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          indexDate = minimumDate;

          await Post.findOne({ date: lastDate })
            .then(result => {
              //console.log(result)
              lastDateId = result.id;
            });

          await Post.find({
            userId: followingIdList,
            id: { '$gt': 0, '$lt': lastDateId }
          })
            .then(result => {
              client.get(myId, async function (err, result2) {
                lastdata = JSON.parse(result2);
                //console.log(lastdata);
                lastdata.Feed.push(result);
                lastdata.Year = 'last';
                lastdata.Month = 'last';
                lastdata.Date = 'last';
                lastdata.isLastFeed = 1;
              })
            })
        } else {
          client.get(myId, async function (err, result) {
            data = result;
            await Post.findOne({ date: indexDate })
              .then(result => {
                console.log(result)
                currentDateId = result.id;
              });

            await Post.find({
              userId: followingIdList,
              id: { '$gt': currentDateId, '$lt': lastDate }
            })
              .then(result => {
                data.Feed.push(result);
              });
          });
        }
      }//30개 이하로 redis에 저장될때 조건 끝
    } while (data.Feed != undefined && Object.keys(data.Feed).length < 30);

  });


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


module.exports = router;