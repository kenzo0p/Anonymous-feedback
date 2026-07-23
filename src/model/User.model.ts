import mongoose, { Schema, Document } from "mongoose";

export interface User extends Document {
  username: string;
  email: string;
  password: string;
  verifyCode: string;
  verifyCodeExpiry: Date;
  verifyAttempts: number;
  resetPasswordCode?: string;
  resetPasswordCodeExpiry?: Date;
  resetPasswordAttempts?: number;
  blockedSenders: string[];
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
        required:[true , "Password is required"],
    },
    verifyCode : {
        type:String,
        required:[true , "Veriy code is required"]
    },
    verifyCodeExpiry : {
        type:Date,
        required : [true , "Verify code Expiry is required"]
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