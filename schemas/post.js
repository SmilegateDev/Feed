const mongoose = require('mongoose');
const {Schema} = mongoose;

console.log('check');

const postSchema = new mongoose.Schema({
    id:{type: Number, required:true, unique:true, index:true},
    title:{type: String, required:true},
    writer:{type: String, required:true},
    contents:{type: String, required:true},
    file:{type: String, default:null},
    reply_num:{type: Number, required:true, default:0},
    likes_num:{type: Number, required:true, default:0},
    createdAt:{type: Date, default:Date.now},
    lati:{type: Number, default:null},
    long:{type: Number ,default:null},
    userId:{type: Number,required:true},
    unixTime:{type:Number,required:true}
},
{
    collection:'posts',
    timestamp:true
});

module.exports = mongoose.model('Post', postSchema);
