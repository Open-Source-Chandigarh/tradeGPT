import dbConnect from "../../utlis/dbConn";
import Users from "../../models/Users";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";

console.log("Server started ");

export async function POST(req:NextRequest,res:NextResponse) {
  try {

    await dbConnect();

    const body = await req.json(); // get request body
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];


    if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

    if (!process.env.NEXTAUTH_SECRET) {
        throw new Error("NEXTAUTH_SECRET is not defined");
    }


    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET as string) as JwtPayload & { id: string };

    // const { email } = body; 
    const user = await Users.findOne({email:decoded.email}).exec();


    return NextResponse.json({chats:user.freechats},{ status: 200 })
  
  } catch (e) {
  console.error(e); 
  return NextResponse.json(
    { message: "Server error, please try again!" },
    { status: 500 }
  );
}
}
