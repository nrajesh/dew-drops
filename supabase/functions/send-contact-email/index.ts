import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// These are automatically set by Supabase
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const TO_EMAIL = 'myself@nrajesh.com'
// IMPORTANT: The domain for this email (nrajesh.com) must be verified in your Resend account.
const FROM_EMAIL = 'dev@nrajesh.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This is needed for CORS and preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY secret in Supabase project');
    return new Response(JSON.stringify({ error: 'Email service is not configured: Missing API Key.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Portfolio Contact Form <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        subject: `New Contact Form Submission: ${subject}`,
        reply_to: email,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>New Message via Portfolio</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="border: none; border-top: 1px solid #eee;" />
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
        `,
      }),
    })

    const data = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API Error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(JSON.stringify({ message: 'Email sent successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})