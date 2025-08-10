import { MedusaService, Modules } from "@medusajs/framework/utils"
import { PhoneVerification } from "./models"

interface SendOtpInput {
  phone_number: string
}

interface VerifyOtpInput {
  phone_number: string
  otp_code: string
}

interface OtpValidationResult {
  success: boolean
  message: string
  verification_id?: string
}

class PhoneAuthService extends MedusaService({
  PhoneVerification,
}) {
  private container_: any
  
  constructor(container: any) {
    super(container)
    this.container_ = container
  }
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private validatePhoneNumber(phoneNumber: string): boolean {
    const nepalPhoneRegex = /^(98|97)\d{8}$/
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "")
    
    if (cleanPhone.startsWith("+977")) {
      return nepalPhoneRegex.test(cleanPhone.slice(4))
    }
    if (cleanPhone.startsWith("977")) {
      return nepalPhoneRegex.test(cleanPhone.slice(3))
    }
    return nepalPhoneRegex.test(cleanPhone)
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "")
    
    if (cleanPhone.startsWith("+977")) {
      cleanPhone = cleanPhone.slice(4)
    } else if (cleanPhone.startsWith("977")) {
      cleanPhone = cleanPhone.slice(3)
    }
    
    return cleanPhone
  }

  async sendOtp(input: SendOtpInput): Promise<OtpValidationResult> {
    const { phone_number } = input

    if (!this.validatePhoneNumber(phone_number)) {
      return {
        success: false,
        message: "Invalid phone number format. Please provide a valid Nepal phone number."
      }
    }

    const normalizedPhone = this.normalizePhoneNumber(phone_number)

    const existingVerification = await this.listPhoneVerifications({
      phone_number: normalizedPhone,
      expires_at: {
        $gte: new Date()
      }
    }, { 
      take: 1,
      order: { created_at: "DESC" } 
    })

    if (existingVerification.length > 0 && existingVerification[0].attempts >= existingVerification[0].max_attempts) {
      return {
        success: false,
        message: "Maximum OTP attempts exceeded. Please try again later."
      }
    }

    const otpCode = this.generateOtp()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5)

    const verification = await this.createPhoneVerifications({
      phone_number: normalizedPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      is_verified: false,
      attempts: 0,
      max_attempts: 3
    })

    try {
      // Send SMS using notification service
      const notificationService = this.container_.resolve(Modules.NOTIFICATION)
      
      const message = `Your OTP code is: ${otpCode}. This code will expire in 5 minutes. - GAG Nepal`
      
      await notificationService.createNotifications({
        to: `+977${normalizedPhone}`,
        channel: "sms",
        template: "",
        data: {
          message: message
        },
        provider_id: "spydo-sms"
      })

      return {
        success: true,
        message: "OTP sent successfully to your mobile number.",
        verification_id: verification.id
      }
    } catch (error) {
      await this.deletePhoneVerifications([verification.id])
      
      console.error("SMS sending error:", error)
      return {
        success: false,
        message: "Failed to send OTP SMS. Please try again."
      }
    }
  }

  async verifyOtp(input: VerifyOtpInput): Promise<OtpValidationResult> {
    const { phone_number, otp_code } = input
    const normalizedPhone = this.normalizePhoneNumber(phone_number)

    const verification = await this.listPhoneVerifications({
      phone_number: normalizedPhone,
      expires_at: {
        $gte: new Date()
      },
      is_verified: false
    }, { 
      take: 1,
      order: { created_at: "DESC" } 
    })

    if (verification.length === 0) {
      return {
        success: false,
        message: "Invalid or expired OTP code."
      }
    }

    const phoneVerification = verification[0]

    if (phoneVerification.attempts >= phoneVerification.max_attempts) {
      return {
        success: false,
        message: "Maximum OTP attempts exceeded. Please request a new OTP."
      }
    }

    await this.updatePhoneVerifications({
      selector: { id: phoneVerification.id },
      data: { attempts: phoneVerification.attempts + 1 }
    })

    if (phoneVerification.otp_code !== otp_code) {
      return {
        success: false,
        message: "Invalid OTP code. Please try again."
      }
    }

    await this.updatePhoneVerifications({
      selector: { id: phoneVerification.id },
      data: { is_verified: true }
    })

    return {
      success: true,
      message: "Phone number verified successfully",
      verification_id: phoneVerification.id
    }
  }

  async resendOtp(input: SendOtpInput): Promise<OtpValidationResult> {
    const { phone_number } = input
    const normalizedPhone = this.normalizePhoneNumber(phone_number)

    const recentVerifications = await this.listPhoneVerifications({
      phone_number: normalizedPhone,
      created_at: {
        $gte: new Date(Date.now() - 60000)
      }
    })

    if (recentVerifications.length > 0) {
      return {
        success: false,
        message: "Please wait at least 1 minute before requesting a new OTP."
      }
    }

    return await this.sendOtp(input)
  }

  async isPhoneVerified(phoneNumber: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber)
    
    const verifiedEntries = await this.listPhoneVerifications({
      phone_number: normalizedPhone,
      is_verified: true,
      expires_at: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    })

    return verifiedEntries.length > 0
  }

  async cleanupExpiredOtps(): Promise<void> {
    const expiredVerifications = await this.listPhoneVerifications({
      expires_at: {
        $lt: new Date()
      }
    })

    if (expiredVerifications.length > 0) {
      await this.deletePhoneVerifications(
        expiredVerifications.map(v => v.id)
      )
    }
  }
}

export default PhoneAuthService