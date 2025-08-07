import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { Resend } from 'https://esm.sh/resend@3.4.0'

// This function uses Resend to send emails.
// You'll need to get an API key from Resend and add it as a secret.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
        throw new Error("Resend API key is not set. Please add it to your project's secrets.");
    }
    
    const resend = new Resend(RESEND_API_KEY)
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send the email using Resend
    const { error } = await resend.emails.send({
      // NOTE: 'onboarding@resend.dev' is for testing. For production, you must
      // verify your own domain with Resend and use an email from that domain.
      from: 'Portfolio Contact Form <onboarding@resend.dev>',
      to: ['dev@nrajesh.com'],
      subject: `New Message from ${name}: ${subject}`,
      reply_to: email,
      html: `<p>You have a new message from <strong>${name}</strong> (${email}):</p><p>${message}</p>`,
    });

    if (error) {
      console.error({ error })
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})