import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const verifyOtpSchema = z.object({
  phone_number: z.string().min(1, "Phone number is required"),
  otp_code: z.string().min(6, "OTP code must be 6 digits").max(6, "OTP code must be 6 digits")
})

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const validatedData = verifyOtpSchema.parse(req.body)
    
    const phoneAuthService: any = req.scope.resolve("phone_auth")
    const result = await phoneAuthService.verifyOtp(validatedData)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      })
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      verification_id: result.verification_id
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.issues
      })
    }

    console.error("Verify OTP error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    })
  }
}