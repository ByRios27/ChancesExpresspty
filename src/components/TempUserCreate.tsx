import { useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebase';

const TempUserCreate = () => {
  useEffect(() => {
    const createUser = async () => {
      const auth = getAuth(app);
      const email = 'jrios5061@gmail.com';
      const password = 'admin123';

      try {
        console.log('[TempCreate] Attempting to create user:', email);
        await createUserWithEmailAndPassword(auth, email, password);
        console.log('[TempCreate] User creation successful. You can now log in.');
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log('[TempCreate] User email already exists. You can now log in.');
        } else {
          console.error('[TempCreate] An unexpected error occurred during temporary user creation:', error);
        }
      }
    };

    createUser();
  }, []);

  return null; // This component renders nothing.
};

export default TempUserCreate;
