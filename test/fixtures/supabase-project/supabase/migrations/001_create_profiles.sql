-- Create profiles table linked to auth.users
CREATE TABLE profiles (
  id        UUID REFERENCES auth.users PRIMARY KEY,
  username  TEXT UNIQUE NOT NULL,
  bio       TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
