import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const Login = () => {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex justify-center items-center h-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Administrator Access</CardTitle>
          <CardDescription>Please sign in with the administrator account to manage your portfolio.</CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    inputText: "white",
                  },
                },
              },
            }}
            providers={[]}
            theme="dark"
            view="sign_in"
            showLinks={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default Login;