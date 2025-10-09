import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'dev@nrajesh.com'; // This domain must be verified in Resend

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY secret in Supabase project');
    return new Response(JSON.stringify({ error: 'Email service is not configured: Missing API Key.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { recipientEmail, matchReasoning, attachCv, cvPdfBase64 } = await req.json();

    if (!recipientEmail || !matchReasoning) {
      return new Response(JSON.stringify({ error: 'Missing required fields: recipientEmail or matchReasoning' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const attachments = [];
    if (attachCv && cvPdfBase64) {
      attachments.push({
        filename: 'Rajesh_Narayanan_CV.pdf',
        content: cvPdfBase64,
      });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `CareerFit Analyst <${FROM_EMAIL}>`,
        to: [recipientEmail],
        subject: `Your Career Fit Analysis for Rajesh Narayanan`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Career Fit Analysis Results</h2>
            <p>Dear Candidate,</p>
            <p>Here is the detailed analysis of how Rajesh Narayanan's profile aligns with your provided job description:</p>
            <div style="background-color: #f8f8f8; padding: 15px; border-radius: 8px; margin-top: 20px;">
              ${matchReasoning.replace(/\n/g, '<br>')}
            </div>
            ${attachCv ? `<p style="margin-top: 20px;">Your CV has been attached as a PDF.</p>` : ''}
            <p style="margin-top: 20px;">For more details, you can visit Rajesh's portfolio: <a href="https://your-portfolio-url.com/portfolio">https://your-portfolio-url.com/portfolio</a></p>
            <p>Best regards,</p>
            <p>The CareerFit Analyst Team</p>
          </div>
        `,
        attachments: attachments,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API Error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    return new Response(JSON.stringify({ message: 'Email sent successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }
});