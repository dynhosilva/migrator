import { supabase } from './lib/supabase';

async function signOut() {
  await supabase.auth.signOut();
}

async function uploadFile(file: File) {
  await supabase.storage.from('avatars').upload(file.name, file);
}

export default function App() {
  return (
    <div>
      <button onClick={signOut}>Sign out</button>
      <button onClick={() => uploadFile(new File([''], 'test.png'))}>Upload</button>
    </div>
  );
}
