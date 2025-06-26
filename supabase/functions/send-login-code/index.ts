import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  email: string
  displayName?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, displayName }: RequestBody = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Check if user exists by looking for profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('email', email)
      .single()

    const isNewUser = !existingProfile

    // Store the code in database
    const { error: codeError } = await supabase
      .from('login_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (codeError) {
      console.error('Error storing login code:', codeError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate login code' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send email using Resend (you'll need to add RESEND_API_KEY to your environment variables)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Squat Challenge <noreply@yourdomain.com>', // Replace with your domain
            to: [email],
            subject: `Your Squat Challenge login code: ${code}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1; text-align: center;">Squat Challenge</h1>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #1e293b; margin-top: 0;">Your login code</h2>
                  <p style="color: #475569; font-size: 16px;">
                    ${isNewUser ? 'Welcome to Squat Challenge!' : 'Welcome back!'} 
                    Use this code to sign in:
                  </p>
                  <div style="background: white; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${code}</span>
                  </div>
                  <p style="color: #64748b; font-size: 14px;">
                    This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
                  </p>
                  ${isNewUser && displayName ? `<p style="color: #475569;">Your display name will be: <strong>${displayName}</strong></p>` : ''}
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                  Build strength, track progress, and crush your goals!
                </p>
              </div>
            `,
          }),
        })

        if (!emailResponse.ok) {
          console.error('Failed to send email via Resend:', await emailResponse.text())
        } else {
          console.log('Email sent successfully via Resend')
        }
      } catch (emailError) {
        console.error('Error sending email via Resend:', emailError)
      }
    } else {
      console.log('RESEND_API_KEY not configured, email not sent')
      console.log(`Login code for ${email}: ${code}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser,
        message: 'Login code sent successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-login-code function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})