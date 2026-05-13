import type { ProjectFile } from '../sources/types';

function f(relativePath: string, content: string): ProjectFile {
  const buf = Buffer.from(content, 'utf8');
  return { relativePath, content: buf, size: buf.length };
}

const PKG = JSON.stringify({
  name: 'my-saas-app',
  version: '0.1.0',
  private: true,
  scripts: {
    dev: 'vite',
    build: 'tsc && vite build',
    preview: 'vite preview',
    test: 'vitest run',
  },
  dependencies: {
    '@radix-ui/react-avatar': '^1.0.4',
    '@radix-ui/react-dialog': '^1.0.5',
    '@radix-ui/react-dropdown-menu': '^2.0.6',
    '@supabase/supabase-js': '^2.39.0',
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
    'react-router-dom': '^6.22.0',
  },
  devDependencies: {
    '@types/react': '^18.2.56',
    '@types/react-dom': '^18.2.19',
    '@vitejs/plugin-react': '^4.2.1',
    'autoprefixer': '^10.4.18',
    'postcss': '^8.4.35',
    'tailwindcss': '^3.4.1',
    'typescript': '^5.2.2',
    'vite': '^5.1.4',
    'vitest': '^1.3.1',
  },
}, null, 2);

export const DEMO_FILES: ProjectFile[] = [
  f('package.json', PKG),

  f('tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      paths: { '@/*': ['./src/*'] },
    },
    include: ['src'],
  }, null, 2)),

  f('vite.config.ts', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
`),

  f('tailwind.config.ts', `import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
`),

  f('.lovable', JSON.stringify({ version: '1.0', project: 'my-saas-app', generated: '2024-01-15' })),

  f('.env.example', [
    'VITE_SUPABASE_URL=',
    'VITE_SUPABASE_ANON_KEY=',
    'VITE_APP_URL=',
    'VITE_STRIPE_PUBLIC_KEY=',
  ].join('\n') + '\n'),

  f('src/App.tsx', `import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Index     from './pages/Index'
import Auth      from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Settings  from './pages/Settings'
import Profile   from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Index />} />
        <Route path="/auth"      element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/profile"   element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}
`),

  f('src/main.tsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`),

  f('src/lib/supabase.ts', `import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signIn  = (email: string, pw: string) =>
  supabase.auth.signInWithPassword({ email, password: pw })

export const signOut = () => supabase.auth.signOut()
export const getUser = () => supabase.auth.getUser()
`),

  f('src/lib/storage.ts', `import { supabase } from './supabase'

export async function uploadAvatar(file: File, userId: string) {
  return supabase.storage
    .from('avatars')
    .upload(\`\${userId}/avatar.\${file.name.split('.').pop()}\`, file)
}

export function getAvatarUrl(path: string) {
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}
`),

  f('src/lib/realtime.ts', `import { supabase } from './supabase'

export function subscribeToTeam(teamId: string, onUpdate: (payload: unknown) => void) {
  return supabase
    .channel(\`team-\${teamId}\`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, onUpdate)
    .subscribe()
}
`),

  f('src/components/ui/button.tsx', `import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
}

export function Button({ variant = 'default', className = '', ...props }: ButtonProps) {
  return <button className={\`btn btn-\${variant} \${className}\`} {...props} />
}
`),

  f('src/pages/Index.tsx', `export default function Index() {
  return <main><h1>Welcome to my-saas-app</h1></main>
}
`),

  f('src/pages/Auth.tsx', `export default function Auth() {
  return <main><h1>Sign in</h1></main>
}
`),

  f('src/pages/Dashboard.tsx', `export default function Dashboard() {
  return <main><h1>Dashboard</h1></main>
}
`),

  f('src/pages/Settings.tsx', `export default function Settings() {
  return <main><h1>Settings</h1></main>
}
`),

  f('src/pages/Profile.tsx', `export default function Profile() {
  return <main><h1>Profile</h1></main>
}
`),

  f('supabase/migrations/20240101000000_initial.sql', `CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL UNIQUE,
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
`),

  f('supabase/migrations/20240115000000_add_teams.sql', `CREATE TABLE teams (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (team_id, user_id)
);
`),

  f('supabase/functions/send-email/index.ts', `import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, subject, html } = await req.json()
  // Integrate with Resend / SendGrid here
  return new Response(JSON.stringify({ success: true, to }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
`),

  f('supabase/functions/process-payment/index.ts', `import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { amount, currency, customerId } = await req.json()
  // Stripe integration via import.meta.env.VITE_STRIPE_PUBLIC_KEY
  return new Response(JSON.stringify({ success: true, amount, currency }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
`),
];
