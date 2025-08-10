import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { phoneAuthRateLimit } from "../../../../middlewares/phone-auth-rate-limit"

const sendOtpSchema = z.object({
  phone_number: z.string().min(1, "Phone number is required")
})

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  return phoneAuthRateLimit(req, res, async () => {
  try {
    const validatedData = sendOtpSchema.parse(req.body)
    
    const phoneAuthService: any = req.scope.resolve("phone_auth")
    const result = await phoneAuthService.sendOtp(validatedData)

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

    console.error("Send OTP error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    })
  }
  })
}