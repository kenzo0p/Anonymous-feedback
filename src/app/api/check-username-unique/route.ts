import UserModel from "@/model/User.model";
import dbConnect from "@/lib/dbConnect";
import { z } from "zod";
import { usernameValidation } from "@/schemas/signUpSchema";

const usernameQuerySchema = z.object({
  username: usernameValidation,
});

export async function GET(request: Request) {
    // todo :use this is all other routes now in newer versions of next there no need to check it next js did this for us
    // if(request.method !== 'GET'){
    //     return Response.json({success:false , message:"Method not allowed"} , {status:405})
    // }

    
    await dbConnect();

  // localhost:3000/api/check-?username=om
  try {
    const { searchParams } = new URL(request.url);
    const queryParam = {
      username: searchParams.get("username"),
    };
    const result = usernameQuerySchema.safeParse(queryParam);
    console.log(result); // todo:remove
    if (!result.success) {
      const usernameErrors = result.error.format().username?._errors || [];
      return Response.json(
        {
          success: false,
          message:
            usernameErrors?.length > 0
              ? usernameErrors.join(", ")
              : "Invalid query parameters",
        },
        { status: 500 }
      );
    }

    const {username} = result.data

    const existingVerifiedUser = await UserModel.findOne({username,isVerified:true})
    if(existingVerifiedUser) {
        return Response.json({success:false ,message:'Username is already taken.'},{status:400})
    }
    return Response.json({success:true ,message:'Username is unique'},{status:200})
  } catch (error) {
    console.error("Error checking username", error);
    return Response.json(
      { success: false, message: "Error in checking username" },
      { status: 500 }
    );
  }
}
