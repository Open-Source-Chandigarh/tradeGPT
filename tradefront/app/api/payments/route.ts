import Razorpay from "razorpay"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import dbConnect from "../../utlis/dbConn"
import User from "../../models/Users"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    await dbConnect()

    const { email } = await req.json()
    const currency = "INR";
    const amount = 99;
    if (!amount || !currency || !email)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt: `tradegpt_${Date.now()}`,
      notes: { email },
    })

    return NextResponse.json(order)
  } catch (err: any) {
    console.error("Error creating Razorpay order:", err)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

// ✅ Manual payment verify/update (for local dev)
export async function PUT(req: NextRequest) {
  try {
    await dbConnect()

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, email } =
      await req.json()

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !email)
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 })

    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex")

    if (expectedSignature !== razorpay_signature)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })

    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          paidacc: true,
          subscriptiontill: nextMonth,
          razorpayPaymentId: razorpay_payment_id,
        },
      },
      { new: true }
    )

    return NextResponse.json({ success: true, updatedUser })
  } catch (err: any) {
    console.error("Manual verify error:", err)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
