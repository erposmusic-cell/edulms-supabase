/**
 * Email Service - Nodemailer Integration
 * 
 * Sends real email notifications for important events.
 * Configure SMTP settings in System Settings.
 * 
 * For production, use services like:
 * - Gmail SMTP (with App Password)
 * - SendGrid
 * - Mailgun
 * - Amazon SES
 */

import nodemailer from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Create email transporter from config
 */
function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

/**
 * Send email notification
 */
export async function sendEmail(options: EmailOptions, config: EmailConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(config)
    
    const result = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
    })

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { 
      success: false, 
      error: `Gagal mengirim email: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Send attendance notification email to parent
 */
export function generateAttendanceEmail(data: {
  parentName: string
  studentName: string
  className: string
  date: string
  timeIn: string
  status: string
  schoolName: string
}): { subject: string; html: string; text: string } {
  const statusLabel = data.status === 'hadir' ? 'Hadir' 
    : data.status === 'terlambat' ? 'Terlambat' 
    : data.status === 'izin' ? 'Izin' 
    : data.status === 'sakit' ? 'Sakit' 
    : 'Alpha/Tidak Hadir'

  return {
    subject: `[${data.schoolName}] Notifikasi Kehadiran - ${data.studentName}`,
    text: `Halo ${data.parentName}, Kehadiran ${data.studentName} (${data.className}) pada ${data.date}: Jam Masuk: ${data.timeIn}, Status: ${statusLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a7f64, #10b981); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${data.schoolName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 14px;">Notifikasi Kehadiran</p>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 15px;">Halo <strong>${data.parentName}</strong>,</p>
          <p style="margin: 0 0 20px; font-size: 14px; color: #555;">Informasi kehadiran <strong>${data.studentName}</strong> (${data.className}) pada <strong>${data.date}</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Jam Masuk</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${data.timeIn}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Status</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600; color: ${data.status === 'hadir' ? '#16a34a' : data.status === 'terlambat' ? '#ca8a04' : '#dc2626'};">${statusLabel}</td></tr>
          </table>
          <p style="margin: 20px 0 0; font-size: 12px; color: #999; text-align: center;">Pesan ini dikirim otomatis oleh sistem EduLMS</p>
        </div>
      </div>
    `,
  }
}

/**
 * Send grade notification email to parent
 */
export function generateGradeEmail(data: {
  parentName: string
  studentName: string
  className: string
  subject: string
  score: string
  grade: string
  schoolName: string
}): { subject: string; html: string; text: string } {
  return {
    subject: `[${data.schoolName}] Notifikasi Nilai - ${data.studentName}`,
    text: `Halo ${data.parentName}, Nilai ${data.studentName} (${data.className}) untuk ${data.subject}: Nilai: ${data.score}, Grade: ${data.grade}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a7f64, #10b981); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${data.schoolName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 14px;">Notifikasi Nilai</p>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 15px;">Halo <strong>${data.parentName}</strong>,</p>
          <p style="margin: 0 0 20px; font-size: 14px; color: #555;">Nilai <strong>${data.studentName}</strong> (${data.className}) untuk mata pelajaran <strong>${data.subject}</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Mata Pelajaran</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${data.subject}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Nilai</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${data.score}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Grade</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600; color: #1a7f64;">${data.grade}</td></tr>
          </table>
          <p style="margin: 20px 0 0; font-size: 12px; color: #999; text-align: center;">Pesan ini dikirim otomatis oleh sistem EduLMS</p>
        </div>
      </div>
    `,
  }
}

/**
 * Test email connection
 */
export async function testEmailConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(config)
    await transporter.verify()
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: `Koneksi email gagal: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}
