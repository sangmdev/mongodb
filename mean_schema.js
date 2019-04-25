const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var meanSchema = new Schema({
    userName: {
        type: String,
        index: true,
        unique: true,
        required: [function(){return this.userName != null}, 'UserName is a required field!'],
        maxlength: 50},
    password: {
        type: String,
        required: [true, 'Password is a required field!']},
    firstName: {
        type: String,
        maxlength: 50},
    lastName: {
        type: String,
        maxlength: 50},
    profileImage: {
        type: Buffer},
    interests: {
        type: String,
        maxlength: 2000},
    state: {
        type: String,
        maxlength: 52}
}, {collection: 'profiles'});

exports.meanSchema = meanSchema;