import mongoose, { Schema, Document } from "mongoose";

export interface User extends Document {
  username: string;
  email: string;
  // Optional: OAuth (Google/GitHub) accounts have no local password or
  // verification code — the provider vouches for the email.
  password?: string;
  verifyCode?: string;
  verifyCodeExpiry?: Date;
  verifyAttempts: number;
  resetPasswordCode?: string;
  resetPasswordCodeExpiry?: Date;
  resetPasswordAttempts?: number;
  blockedSenders: string[];
  prompt: string;
  digestEnabled: boolean;
  lastDigestSentAt?: Date;
  isVerified:boolean;
  isAcceptingMessages: boolean;
}


const userSchema : Schema<User> = new Schema({
    username : {
        type:String,
        required:[true , "Username is required"],
        trim:true,
        unique:true
    },
    email:{
        type:String,
        required:[true, "Email is required"],
        unique:true,
        match:[/.+\@.+\..+/, "Please use a valid email address"]
    },
    password:{
        type:String,
    },
    verifyCode : {
        type:String,
    },
    verifyCodeExpiry : {
        type:Date,
    },
    verifyAttempts : {
        type:Number,
        default:0
    },
    resetPasswordCode : {
        type:String,
    },
    resetPasswordCodeExpiry : {
        type:Date,
    },
    resetPasswordAttempts : {
        type:Number,
        default:0
    },
    blockedSenders : {
        type:[String],
        default:[]
    },
    prompt : {
        type:String,
        default:"",
        maxlength:150,
        trim:true
    },
    digestEnabled : {
        type:Boolean,
        default:true
    },
    lastDigestSentAt : {
        type:Date,
    },
    isVerified : {
        type:Boolean,
        default:false
    },
    isAcceptingMessages : {
        type:Boolean,
        default:true,
    },
}, { timestamps: true })

const UserModel = (mongoose.models.User as mongoose.Model<User>) || (mongoose.model<User>("User",userSchema))

export default UserModel