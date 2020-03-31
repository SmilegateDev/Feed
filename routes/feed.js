var express = require('express');
var router = express.Router();
var Post = require('../schemas/post');
var { Follow } = require('../models');
var {Likes} = require('../models');
var nJwt = require('njwt');
//var Client = require('mongodb').MongoClient;
var dotenv = require('dotenv');
var client = require('../cache_redis');
var cache = require('../cache_Feed');
var {promisify} = require('util');
const getRedis = promisify(client.get).bind(client);
const getCache = promisify(cache.get).bind(cache);

function sleep (delay) {
  var start = new Date().getTime();
  while (new Date().getTime() < start + delay);
}

function PrintTime() {
  var today = new Date();
  var hh = today.getHours();
  var mi = today.getMinutes();
  var ss = today.getSeconds();
  document.getElementById("result").innerHTML = hh + ":" + mi + ":" + ss;
}

function Unix_timeStampConv(){
  return Math.floor(new Date().getTime()/1000);
}//날짜 계산을 위한 timestamp

var checkOver = function (newYear,newMonth,newToday){
  if (newMonth < 10 && newToday < 10) {
    return checkDate = newYear.toString() + '0' + newMonth.toString() + '0' + newToday.toString();
  } else if (newMonth < 10 && newToday >= 10) {
    return checkDate = newYear.toString() + '0' + newMonth.toString() + newToday.toString();
  } else if (newMonth >= 10 && newToday < 10) {
    return checkDate = newYear.toString() + newMonth.toString() + '0' + newToday.toString();
  } else {
    return checkDate = newYear.toString() + newMonth.toString() + newToday.toString();
  }
}

var isEmpty = function (value) {
  if (value == "" || value == null || value == undefined || (value != null && typeof value == "object" && !Object.keys(value).length)) {
    return true
  } else {
    return false
  }
};

var checkLike = async function(myId,posts){
  /*
  let isLikeList=[];
  let LikeObject={};
  let objectId;
  let isLike;
  console.log("check : "+isEmpty(posts._id));
  if(isEmpty(posts)){
    return {};
  }
  if(isEmpty(posts._id)==false){
    objectId=posts._id;
    await Likes.findOne({
      where:{
        liker:myId,
        object_Id:objectId.toString()
      },
    })
    .then(result=>{
      //console.log(result[0].object_Id);
      if(isEmpty(result)){
        isLike=0;
      }else{
        isLike=1;
      }
      LikeObject[objectId]=isLike;
    });
  }else{
    for(var i=0;i<Object.keys(posts).length;i++){
      objectId=posts[i]._id;
      await Likes.findOne({
        where:{
          liker:myId,
          object_Id:objectId.toString()
        },
      })
      .then(result=>{
        //console.log(result[0].object_Id);
        if(isEmpty(result)){
          isLike=0;
        }else{
          isLike=1;
        }
        LikeObject[objectId]=isLike;
      });
    }
  }
  //console.log(LikeObject);
  return LikeObject;
  */
 let objectIdList=[];
 let likeObject={};

 const postLen = posts.length;

  if(isEmpty(posts._id)==false){
    objectId=posts._id;
    await Likes.findOne({
      where:{
        liker:myId,
        object_Id:objectId.toString()
      },
    })
    .then(result=>{
      //console.log(result[0].object_Id);
      if(isEmpty(result)){
        isLike=0;
      }else{
        isLike=1;
      }
      LikeObject[objectId]=isLike;
    });
  }else{
    for (let i = 0; i < postLen; i++) {
      objectIdList.push(posts[i]._id.toString());
      likeObject[posts[i]._id.toString()] = 0;
    }
  
    await Likes.findAll({
      where:{
        liker: myId,
        object_Id: objectIdList
      },
      attributes:['object_Id']
    })
    .then(result=>{
      const resultLen = result.length;
  
      for (let i = 0; i < resultLen; i++) {
        likeObject[result[i].object_Id] = 1;
      }
    })
    //console.log(likeObject);
    return likeObject;
  }
}

// follower: 팔로잉을 하는 사람
router.post('/getFeed', async function (req, res) {
  var posts = [];
  const tokenvalue = nJwt.verify(req.headers.authorization, 'nodebird', 'HS256');
  const myNickName = tokenvalue.body.nickname;
  const myId = tokenvalue.body.id; // req.decoded.id
  var finddate=3;
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
  var loop=0;
  var onePageValue=10;
  var friendShip={};
  var dateFactor = -2;
  console.log("first test:"+req.body.date);
  console.log(req.body.year,req.body.month,req.body.date);
  var obejctLengthCheck;
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

  for (let i = 0; i < followingInform.length; i++) {
    followingIdList.push(followingInform[i].followingId);
  }

  for(let i=0; i<followingInform.length; i++){
    friendShip[followingIdList[i]]=followingInform[i].like_num+(followingInform[i].comment_num*2)+1;
  }//친밀도 계산
  //console.log(friendShip);
  console.log(followingIdList);

  if(req.body.isLastFeed==1){
    res.json({
      code:200,
      message:"마지막 게시물입니다."
    });
  }
  let feedKey='_feed_'+myId;
  var cacheData=await getCache(feedKey);
  if(req.body.year==null){
    client.del(myId);
    console.log('redis reset success');
    if(cacheData!=null){
      client.set(myId,cacheData);
    }
  };

  var timeNow=Unix_timeStampConv();
  console.log(followingIdList.length);
  client.get(myId, async function (err, result) {
    if(result==null){
      console.log('first');
    }else if(req.body.year!=null){  
      newYear=req.body.year;
      newMonth=req.body.month;
      newToday=req.body.date;//사용자에게서 온 Date를 설정
      postlist = JSON.parse(result);
    }else if(req.body.year==null&&result!=null){
      postlist = JSON.parse(result);
      if(isEmpty(postlist._id)==false){
        obejctLengthCheck=1;
      }
      //console.log(Object.keys(postlist).length);
    }
    do {
      /* cache에 자료가 없는 첫 요청 */
      if (req.body.year == null && isEmpty(data) && postlist == null) {
        console.log("first req");
        var dateNow = new Date();
        var nowToday = dateNow.getDate();
        dateNow.setDate(nowToday - finddate);
        newYear = dateNow.getFullYear();
        newMonth = dateNow.getMonth();
        newToday = dateNow.getDate();
        indexDate = newYear.toString() + newMonth.toString() + newToday.toString();
        checkDate = checkOver(newYear,newMonth,newToday);
        if (Number(checkDate) <= minimumDate) {
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          console.log("첫번째 피드요청인데 첫날까지 돌아감");
          indexDate = minimumDate;
          let tempdata={};
          let Posts=[];
          for(let i=0;i<followingIdList.length;i++){
            await Post.find({
              userId: followingIdList[i],
              id: { '$gt': 0 }
            })
            .then(async result => {
              for(let j=0;j<Object.keys(result).length;i++){
                tempdata=JSON.parse(JSON.stringify(result[j]));
                tempdata['value']=friendShip[followingIdList[i]]*Math.pow(timeNow-tempdata.unixTime,dateFactor);
                Posts.push(tempdata);
              }
            });
          }

          Posts.Feed.sort(function(a,b){
            return a.value>b.seq ? -1 : a.value > b.value ? 1: 0;
          })

          let isLikeList=await checkLike(myId,Posts);

          data.Feed = Posts;
          data.isLiked=isLikeList;
          data.Year = 2020;
          data.Month = 1;
          data.Date = 29;
          data.isLastFeed = 1;
          client.del(myId);
          res.json(data);
          break;
        }else{
          console.log("첫번째 find");
          console.log(indexDate);
          let tempdata={};
          let Posts=[];
          await Post.findOne({ date: indexDate })
          .then(result => {
            console.log("first find Index");
            currentDateId = result.id;
          });
          for(let i=0;i<followingIdList.length;i++){
            await Post.find({
              userId: followingIdList[i],
              id: { '$gt': currentDateId }
            })
            .then(async result => {
              for(let j=0;j<Object.keys(result).length;j++){
                tempdata=JSON.parse(JSON.stringify(result[j]));
                tempdata['value']=friendShip[followingIdList[i]]*Math.pow(timeNow-tempdata.unixTime,dateFactor);
                Posts.push(tempdata);
              }
            });
          }
          Posts.sort(function(a,b){
            return a.value > b.value ? -1 : a.value > b.value ? 1: 0;
          })
          console.log(newYear,newMonth,newToday);
          var isLikeList=await checkLike(myId,Posts);
          console.log(Posts.length,Object.keys(isLikeList).length)
          data.Feed = Posts;
          data.isLiked=isLikeList;
          data.Year = newYear;
          data.Month = newMonth;
          data.Date = newToday;
          data.isLastFeed = 0;
          postlist=data;
          //console.log(data);
          console.log("first find Post");
          console.log("first update Success");
          //console.log(data);
          client.set(myId, JSON.stringify(data));
        }
      }else if(req.body.year==null&&postlist!=null&&isEmpty(postlist._id)&&Object.keys(postlist).length>=onePageValue&&isEmpty(postlist.Feed)){
        console.log("cache call");
        console.log(isEmpty(postlist._id),Object.keys(postlist).length);
        //console.log(Object.keys(postlist).length);
        let dateNow = new Date();
        let nowToday = dateNow.getDate();
        dateNow.setDate(nowToday);
        let newYear = dateNow.getFullYear();
        let newMonth = dateNow.getMonth();
        let newToday = dateNow.getDate();
        //console.log(postlist);
        let sendLike={};
        let sendData={};//front로 보내주는애들
        let isLikeList;
        let updateData={};//front에 보낸 게시물을 제외한 나머지 애들을 다시 redis로
        let pageValue;
        if(Object.keys(postlist).length>onePageValue){
          pageValue=10;
        }else{
          pageValue=Object.keys(postlist).length;
        }
        isLikeList=await checkLike(myId,postlist);
        //console.log("isLike is : "+isLikeList+Object.keys(postlist).length);
        updateData.isLiked={};
        for(let i=0;i<Object.keys(postlist).length;i++){
          let getFeedId=postlist[i]._id;
          updateData.isLiked[getFeedId]=isLikeList[getFeedId];
        }
        Posts=postlist.splice(0,pageValue);
        sendData.isLiked={};
        for(let i=0;i<pageValue;i++){
          let getId=Posts[i]._id.toString();
          sendData.isLiked[getId]=updateData.isLiked[getId];
          //console.log(sendData.isLiked[getId]);
          delete updateData.isLiked[getId];
        }
        sendData.Feed=Posts;
        sendData.isLiked=sendData.isLiked;
        sendData.Year = newYear;
        sendData.Month = newMonth;
        sendData.Date = newToday;
        sendData.isLastFeed = 0;
        updateData.Feed=postlist;
        updateData.isLiked=updateData.isLiked;
        updateData.Year=newYear;
        updateData.Month=newMonth;
        updateData.Date=newToday;
        updateData.isLastFeed=0;
        postlist=updateData;
        client.set(myId,JSON.stringify(updateData));
        res.json(sendData);
        break;
      }else if (req.body.year != null && (postlist==null||postlist.Feed==null||Object.keys(postlist.Feed).length < onePageValue)) {
        //2번째 요청부터 redis에 저장된 게시물이 30개 이하일때, redis에 저장한 게시물 없을때
        console.log('redis에 저장된 게시물 개수 : '+Object.keys(postlist.Feed).length);
        var lastDate = newYear.toString() + newMonth.toString() + newToday.toString();
        newDate = new Date(newYear, newMonth, newToday-finddate);
        newYear = newDate.getFullYear();
        newMonth = newDate.getMonth();
        newToday = newDate.getDate();
        newPostDate = newYear.toString() + newMonth.toString() + newToday.toString();
        console.log(lastDate,newPostDate);
        checkDate=checkOver(newYear,newMonth,newToday);

        await Post.findOne({ date: lastDate })
        .then(resultDate => {
          lastDateId = resultDate.id;
        });

        if (Number(checkDate) <= minimumDate) {
          console.log('재 피드요청 but 30개 못넘고 마지막날까지 탐색');
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          indexDate = minimumDate;
          let tempdata={};
          let Posts=[];
          let getlast=await getRedis(myId);
          let lastdata = JSON.parse(getlast);
          for(let i=0;i<followingIdList.length;i++){
            await Post.find({
              userId: followingIdList[i],
              'id': { '$gt':0, '$lt':lastDateId}
            })
            .then(async result => {
              for(let j=0;j<Object.keys(result).length;j++){
                tempdata=JSON.parse(JSON.stringify(result[i]));
                tempdata['value']=friendShip[followingIdList[i]]*Math.pow(timeNow-tempdata.unixTime,dateFactor);
                Posts.push(tempdata);
              }
            })
            .catch(err=>{
              console.log(err);
            });
          }
          Posts.sort(function(a,b){
            return a.value > b.value ? -1 : a.value > b.value ? 1: 0;
          })
          let isLikeList=await checkLike(myId,Posts);
          //console.log(isLikeList);
          for(var i=0;i<Object.keys(Posts).length;i++){
            let getFeedId=Posts[i]._id;
            lastdata.Feed.push(Posts[i]);
            lastdata.isLiked[getFeedId]=isLikeList[getFeedId];
          }
          lastdata.Year = 2020;
          lastdata.Month = 1;
          lastdata.Date = 29;
          lastdata.isLastFeed = 1;
          //client.set(myId, JSON.stringify(lastdata));
          client.del(myId);
          res.json(lastdata);
          break;
        } else {
          console.log("재 피드요청 but not over 30");
          indexDate=newPostDate;
          let getlast=await getRedis(myId);
          let lastdata = JSON.parse(getlast);
          //console.log("last는"+JSON.stringify(lastdata));
          await Post.findOne({ 
            date: indexDate 
          })
          .then(result => {
            currentDateId = result.id;
          });
          let data={};
          let Posts=[];
          for(let i=0;i<followingIdList.length;i++){
            await Post.find({
              userId: followingIdList[i],
              id: { '$gt': currentDateId, '$lt': lastDateId }
            })
            .then(async result4 => {
              for(let j=0;j<Object.keys(result4).length;j++){
                data=JSON.parse(JSON.stringify(result4[j]));
                data['value']=friendShip[followingIdList[i]]*Math.pow(timeNow-data.unixTime,dateFactor);
                Posts.push(data);
              }
            });
          }
          Posts.sort(function(a,b){
            return a.value > b.value ? -1 : a.value > b.value ? 1: 0;
          })
          let isLikeList=await checkLike(myId,Posts);
          console.log("추가할 게시물:"+Object.keys(Posts).length);
          if(lastdata.Feed!=undefined){
            let alreadyPush=[];
            for(var i=0;i<Object.keys(Posts).length;i++){
              let getFeedId=Posts[i]._id.toString();
              if(lastdata.Feed==null){
                for(let j=0;j<Object.keys(lastdata).length;j++){
                  if(Posts[i]._id==lastdata[j]._id){
                    console.log("push!");
                    alreadyPush.push(i);
                    break;
                  }
                }
                let a = alreadyPush.find(a=>{
                  return a===i;
                })
                if(a==null||isEmpty(alreadyPush))
                  lastdata.Feed.push(Posts[i]);
              }else{
                for(let j=0;j<Object.keys(lastdata.Feed).length;j++){
                  if(Posts[i]._id==lastdata.Feed[j]._id){
                    console.log("push!");
                    alreadyPush.push(i);
                    break;
                  }
                }
                let a = alreadyPush.find(a=>{
                  return a===i;
                })
                if(a==null||isEmpty(alreadyPush)){
                  lastdata.Feed.push(Posts[i]);
                }
              }
              lastdata.isLiked[getFeedId]=isLikeList[getFeedId];
            }
            
            //console.log(lastdata);
            //sleep(100000);
            /*
          for(var i=0;i<Object.keys(Posts).length;i++){
            let getFeedId=Posts[i]._id;
            lastdata.Feed.push(Posts[i]);
            lastdata.isLiked[getFeedId]=isLikeList[getFeedId];
          }
          */
        }
        console.log("재피드 요청 개수 :"+Object.keys(lastdata.Feed).length)
        lastdata.Year=newYear;
        lastdata.Month=newMonth;
        lastdata.Date=newToday;
        lastdata.isLastFeed=0;
        postlist=lastdata;
        client.set(myId,JSON.stringify(lastdata));
        
      }
      } else if (req.body.year == null && (postlist==null||postlist.Feed==null||Object.keys(postlist.Feed).length < onePageValue)) {
        //첫번째 요청에서 30개가 되지 않았을때
        if(postlist.Feed!=null){
          console.log("check last posts : "+Object.keys(postlist.Feed).length);
        }
        if(obejctLengthCheck==1||Object.keys(postlist).length==1||postlist.Feed==null){
          var dateNow = new Date();
          var nowToday = dateNow.getDate();
          dateNow.setDate(nowToday);
          newYear = dateNow.getFullYear();
          newMonth = dateNow.getMonth();
          newToday = dateNow.getDate();
          obejctLengthCheck=0;
        }//캐시에서 불러온 게시물이 1개일때
        console.log('첫번째 요청 but not over 30');
        var lastdata={};
        var lastDate = newYear.toString() + newMonth.toString() + newToday.toString();//이전에 저장된 date
        var lastDateId;
        console.log(newYear, newMonth, newToday,lastDate);
        var dateNow = new Date(newYear, newMonth, newToday - finddate);
        newYear = dateNow.getFullYear();
        newMonth = dateNow.getMonth();
        newToday = dateNow.getDate();
        indexDate = newYear.toString() + newMonth.toString() + newToday.toString();

        checkDate=checkOver(newYear,newMonth,newToday);//날짜 자리수
        //console.log(postlist);
        console.log(indexDate);
        if (Number(checkDate) <= minimumDate) {
          console.log('첫번째 요청인데 30개가 안되는데 가다보니 첫번째 날일때');
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          indexDate = minimumDate;
          let tempdata={};
          let Posts=[];
          await Post.findOne({ date: lastDate })
          .then(result => {
            //console.log(result)
            lastDateId = result.id;
          });
          for(let i=0;i<followingIdList.length;i++){
            await Post.find({
              userId: followingIdList[i],
              id: { '$gt': 0, '$lt': lastDateId }
            })
            .then(result2=>{
              for(let j=0;j<Object.keys(result2).length;j++){
                tempdata=JSON.parse(JSON.stringify(result2[j]));
                tempdata['value']=friendShip[followingIdList[i]]*Math.pow(timeNow-tempdata.unixTime,dateFactor);
                Posts.push(tempdata);
              }
            });
          }
          Posts.sort(function(a,b){
            return a.value > b.value ? -1 : a.value > b.value ? 1: 0;
          })
          
          var getLastData = await getRedis(myId);
          var lastdataFromCache = JSON.parse(getLastData);
          console.log(lastdataFromCache);
          if(isEmpty(lastdataFromCache._id)==false){
            lastdata.Feed=lastdataFromCache;
          }else{
            lastdata=lastdataFromCache;
          }
          //console.log(lastdata);
          let isLikeList=await checkLike(myId,Posts);
          for(var i=0;i<Object.keys(Posts).length;i++){
            let getFeedId=Posts[i]._id;
            lastdata.Feed.push(Posts[i]);
            lastdata.isLiked[getFeedId]=isLikeList[getFeedId];
          }
          lastdata.Year = 2020;
          lastdata.Month = 1;
          lastdata.Date = 29;
          lastdata.isLastFeed = 1;
          //client.set(myId, JSON.stringify(lastdata));
          //console.log(lastdata);
          res.json(lastdata);
          break;
        } else {
          console.log('첫번째 요청인데 30개가 안될때');
          let lastDateId;
          let lastdataFromCache;//캐시로부터 온 데이터
          await Post.findOne({ 
            date: lastDate 
          })
          .then(result=>{
            lastDateId=result.id;
          });
          var Posts=[];
          let data={};
          await Post.findOne({ 
            date: indexDate 
          })
          .then(async result => {
            currentDateId = result.id;//2일전 날짜
            for(let i=0;i<followingIdList.length;i++){
              if(obejctLengthCheck==0){
                await Post.find({
                  userId: followingIdList[i],
                  id: { '$gt': lastDateId }
                })
                .then(result => {
                  for(let j=0;j<Object.keys(result).length;j++){
                    data=JSON.parse(JSON.stringify(result[j]));
                    data['value']=friendShip[followingIdList[i]]*Math.pow(timeNow-data.unixTime,dateFactor);
                    Posts.push(data);
                  }
                });
                Posts.sort(function(a,b){
                  return a.value > b.value ? -1 : a.value > b.value ? 1: 0;
                })
              }else{
                console.log("console:"+followingIdList.length);
                await Post.find({
                  userId: followingIdList[i],
                  id: { '$gt': currentDateId, '$lt': lastDateId }
                })
                .then(result => {
                  for(let j=0;j<Object.keys(result).length;j++){
                    data=JSON.parse(JSON.stringify(result[j]));
                    data['value']=friendShip[followingIdList[i]]*Math.pow(timeNow-data.unixTime,dateFactor);
                    Posts.push(data);
                  }
                });
                console.log("Post개수:"+Posts.length)
                Posts.sort(function(a,b){
                  return a.value > b.value ? -1 : a.value > b.value ? 1: 0;
                })
              }
            }
            var getLastData=await getRedis(myId);
              //console.log(getLastData);
            lastdataFromCache = JSON.parse(getLastData);
            
            console.log("Test:"+lastdataFromCache.Feed);
            if(isEmpty(lastdataFromCache._id)==false){
              lastdata.Feed=[];
              lastdata.isLiked={};
              lastdata.Feed.push(lastdataFromCache);
              let isLikeList=await checkLike(myId,lastdata.Feed);
              lastdata.isLiked=isLikeList;
              console.log(isLikeList);
              console.log("--------------------------");
            }else if(Object.keys(lastdataFromCache).length==1){
              lastdata.Feed=[];
              lastdata.isLiked={};
              lastdata.Feed.push(lastdataFromCache[0]);
              let isLikeList=await checkLike(myId,lastdata.Feed);
              lastdata.isLiked=isLikeList;
              console.log(lastdata);
              console.log("--------------------------");
            }else if(lastdataFromCache.Feed==null){
              //미리 푸시해놓은 캐시를 불러올때
              lastdata.Feed=[];
              lastdata.isLiked={};
              for(let i=0;i<Object.keys(lastdataFromCache).length;i++){
                //console.log(lastdataFromCache[i]);
                lastdata.Feed.push(lastdataFromCache[i]);
              }
              let isLikeList=await checkLike(myId,lastdata.Feed);
              lastdata.isLiked=isLikeList;
            }else{
              lastdata=lastdataFromCache;
            }
            //console.log(lastdata);
            
            let isLikeList=await checkLike(myId,Posts);
            if(lastdata.Feed!=undefined){
              //console.log("lastdata.Feed가 있냐?"+lastdata.Feed);
              let alreadyPush=[];
              for(var i=0;i<Object.keys(Posts).length;i++){
                let getFeedId=Posts[i]._id.toString();
                //console.log(a);
                if(lastdataFromCache.Feed==null){
                  for(let j=0;j<Object.keys(lastdataFromCache).length;j++){
                    if(Posts[i]._id==lastdataFromCache[j]._id){
                      console.log("push!");
                      alreadyPush.push(i);
                      break;
                    }
                  }
                  var a = alreadyPush.find(a=>{
                    return a===i;
                  });
                  console.log(a);
                  if(a==null||isEmpty(alreadyPush)){
                    lastdata.Feed.push(Posts[i]);
                  }
                }else{
                  for(let j=0;j<Object.keys(lastdataFromCache.Feed).length;j++){
                    //console.log("넣기전:"+Object.keys(lastdataFromCache.Feed).length);
                    if(Posts[i]._id==lastdataFromCache.Feed[j]._id){
                      console.log("push!");
                      alreadyPush.push(i);
                      break;
                    }
                  }
                  var a = alreadyPush.find(a=>{
                    return a===i;
                  });
                  //console.log("check : "+a);
                  if(a==null||isEmpty(alreadyPush)||a==undefined){
                    lastdata.Feed.push(Posts[i]);
                  }
                }
                lastdata.isLiked[getFeedId]=isLikeList[getFeedId];
              }
            }
            console.log(Object.keys(isLikeList).length,Object.keys(Posts).length);
            console.log(Object.keys(lastdata.isLiked).length,Object.keys(lastdata.Feed).length);
            //console.log(Posts);
            lastdata.Year=newYear;
            lastdata.Month=newMonth;
            lastdata.Date=newToday;
            lastdata.isLastFeed=0;
            postlist=lastdata;
            client.set(myId,JSON.stringify(lastdata));
            console.log('redis 설정 완료'+Object.keys(lastdata).length)
          });
        }//30개 이하로 redis에 저장될때 조건 끝
      }else if(req.body.year!=null&&Object.keys(postlist.Feed).length>=onePageValue){//30개 이상 redis에 있을때
        console.log("재 피드요청 over 30");
        let lastdata;
        let Feed=[];
        let Likes={};
        let sendData={};//front로 보내주는애들
        let updateData={};//front에 보낸 게시물을 제외한 나머지 애들을 다시 redis로
        let afterFeed=[];
        let afterLike={};
        client.get(myId,function(err,result){
          lastdata=JSON.parse(result);
          for(let i=0;i<onePageValue;i++){
            let getFeedId=lastdata.Feed[i]._id;
            Feed.push(lastdata.Feed[i]);
            Likes[getFeedId]=lastdata.isLiked[getFeedId];
          }
          console.log("레디스에서 불러온 게시물 : "+Object.keys(lastdata.Feed).length);
          for(let i=0;i<Object.keys(lastdata.Feed).length;i++){
            let getFeedId=lastdata.Feed[i]._id;
            afterFeed.push(lastdata.Feed[i]);
            afterLike[getFeedId]=lastdata.isLiked[getFeedId];
          }
          
          for(let i=0;i<onePageValue;i++){
            let getFeedId=lastdata.Feed[i]._id;
            delete afterLike[getFeedId];
          }//이미 띄운 피드 삭제
          afterFeed.splice(0,onePageValue);
          sendData.Feed=Feed;
          sendData.isLiked=Likes;
          sendData.Year=lastdata.Year;
          sendData.Month=lastdata.Month;
          sendData.Date=lastdata.Date;
          sendData.isLastFeed=0;
          console.log(Object.keys(afterFeed).length);
          console.log(Object.keys(afterLike).length);
          updateData.Feed=afterFeed;
          updateData.isLiked=afterLike;
          updateData.Year=lastdata.Year;
          updateData.Month=lastdata.Month;
          updateData.Date=lastdata.Date;
          updateData.isLastFeed=0;
          postlist=updateData;
          client.set(myId,JSON.stringify(updateData));
          res.json(sendData);
        });
        break;
      }else if(req.body.year==null&&Object.keys(postlist.Feed).length>=onePageValue){
        console.log("첫 피드 요청 over 30");
        let lastdata;
        let sendData={};
        let updateData={};
        let Feed=[];
        let Likes={};
        let afterFeed=[];
        let afterLike={};
        //let dateNow = new Date();
        //newYear = dateNow.getFullYear();
        //newMonth = dateNow.getMonth();
        //newToday = dateNow.getDate();
        client.get(myId,function(err,result){
          lastdata=JSON.parse(result);
          for(let i=0;i<onePageValue;i++){
            let getFeedId=lastdata.Feed[i]._id;
            Feed.push(lastdata.Feed[i]);
            Likes[getFeedId]=lastdata.isLiked[getFeedId];
          }
          //console.log(Likes);
          for(let i=0;i<Object.keys(lastdata.Feed).length;i++){
            let getFeedId=lastdata.Feed[i]._id;
            afterFeed.push(lastdata.Feed[i]);
            afterLike[getFeedId]=lastdata.isLiked[getFeedId];
          }
          afterFeed.splice(0,onePageValue);//이미 보낸 Post삭제
          for(let i=0;i<onePageValue;i++){
            let getFeedId=lastdata.Feed[i]._id;
            delete afterLike[getFeedId];
          }//이미 보낸 LikeList삭제
          sendData.Feed=Feed;
          sendData.isLiked=Likes;
          sendData.Year=lastdata.Year;
          sendData.Month=lastdata.Month;
          sendData.Date=lastdata.Date;
          sendData.isLastFeed=0;
          console.log(Object.keys(afterFeed).length);
          console.log(Object.keys(afterLike).length);
          updateData.Feed=afterFeed;
          updateData.isLiked=afterLike;
          updateData.Year=lastdata.Year;
          updateData.Month=lastdata.Month;
          updateData.Date=lastdata.Date;
          updateData.isLastFeed=0;
          postlist=updateData;
          client.set(myId,JSON.stringify(updateData));
          res.json(sendData);
        });
        break;
      }
      //console.log("다시 위로"+Object.keys(postlist.Feed).length+req.body.year);
    } while (1);
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