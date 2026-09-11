import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import {
  supabase,
  Student,
  Teacher,
  Admin,
} from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = Student | Teacher | Admin;

export type AuthResult = {
  error?: string;
  needsEmailConfirmation?: boolean;
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: Role | null;
  profile: Profile | null;

  studentSignUp: (fields: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    rollNo: string;
  }) => Promise<AuthResult>;

  studentSignIn: (
    email: string,
    password: string
  ) => Promise<AuthResult>;

  teacherSignIn: (
    email: string,
    password: string
  ) => Promise<AuthResult>;

  adminSignIn: (
    email: string,
    password: string
  ) => Promise<AuthResult>;

  forgotPassword: (
    email: string
  ) => Promise<AuthResult>;

  signOut: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  const [session, setSession] =
    useState<Session | null>(null);

  const [role, setRole] =
    useState<Role | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  /*
   * CLEAR AUTH STATE
   */
  const clearAuthState = () => {
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  /*
   * RESOLVE CURRENT USER PROFILE
   *
   * Teacher -> user_id
   * Student -> email
   * Admin   -> email
   */
  const resolveProfile = async (
    currentSession: Session | null
  ) => {
    if (!currentSession) {
      setRole(null);
      setProfile(null);
      return;
    }

    const uid = currentSession.user.id;

    const email =
      currentSession.user.email
        ?.trim()
        .toLowerCase();

    if (!email) {
      setRole(null);
      setProfile(null);
      return;
    }

    /*
     * =========================
     * TEACHER
     * =========================
     */
    const {
      data: teacher,
      error: teacherError,
    } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (teacherError) {
      console.error(
        '[Auth] Teacher profile error:',
        teacherError
      );
    }

    if (teacher) {
      setRole('teacher');
      setProfile(teacher as Teacher);
      return;
    }

    /*
     * =========================
     * STUDENT
     * =========================
     */
    const {
      data: student,
      error: studentError,
    } = await supabase
      .from('students')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (studentError) {
      console.error(
        '[Auth] Student profile error:',
        studentError
      );
    }

    if (student) {
      setRole('student');
      setProfile(student as Student);
      return;
    }

    /*
     * =========================
     * ADMIN
     * =========================
     */
    const {
      data: admin,
      error: adminError,
    } = await supabase
      .from('admins')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (adminError) {
      console.error(
        '[Auth] Admin profile error:',
        adminError
      );
    }

    if (admin) {
      setRole('admin');
      setProfile(admin as Admin);
      return;
    }

    setRole(null);
    setProfile(null);
  };

  /*
   * =========================
   * RESTORE SESSION
   * =========================
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error(
            '[Auth] Session error:',
            error
          );

          clearAuthState();
          setLoading(false);

          return;
        }

        setSession(data.session);

        await resolveProfile(data.session);

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error(
          '[Auth] Initialization failed:',
          error
        );

        if (mounted) {
          clearAuthState();
          setLoading(false);
        }
      }
    };

    initialize();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        void resolveProfile(newSession);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /*
   * =========================
   * STUDENT SIGN UP
   * =========================
   */
  const studentSignUp: AuthContextValue['studentSignUp'] =
    async ({
      firstName,
      lastName,
      email,
      password,
      rollNo,
    }) => {
      const cleanEmail =
        email.trim().toLowerCase();

      const cleanRollNo =
        rollNo.trim();

      const fullName =
        `${firstName.trim()} ${lastName.trim()}`.trim();

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: fullName,
              roll_no: cleanRollNo,
              role: 'student',
            },
          },
        });

      if (error) {
        return {
          error: error.message,
        };
      }

      /*
       * EMAIL CONFIRMATION
       */
      if (!data.session) {
        return {
          needsEmailConfirmation: true,
        };
      }

      setSession(data.session);

      /*
       * FIND STUDENT PROFILE
       */
      const {
        data: student,
        error: profileError,
      } = await supabase
        .from('students')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error: profileError.message,
        };
      }

      if (!student) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'Student account was created, but no student profile was found.',
        };
      }

      if (student.active === false) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'Your student account has been disabled.',
        };
      }

      setRole('student');
      setProfile(student as Student);

      return {};
    };

  /*
   * =========================
   * STUDENT SIGN IN
   * =========================
   */
  const studentSignIn: AuthContextValue['studentSignIn'] =
    async (email, password) => {
      const cleanEmail =
        email.trim().toLowerCase();

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        return {
          error: error.message,
        };
      }

      if (!data.user || !data.session) {
        return {
          error:
            'Authentication failed.',
        };
      }

      setSession(data.session);

      const {
        data: student,
        error: profileError,
      } = await supabase
        .from('students')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error: profileError.message,
        };
      }

      if (!student) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'This account is not registered as a student.',
        };
      }

      if (student.active === false) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'Your student account has been disabled.',
        };
      }

      setRole('student');
      setProfile(student as Student);

      return {};
    };

  /*
   * =========================
   * TEACHER SIGN IN
   * =========================
   */
  const teacherSignIn: AuthContextValue['teacherSignIn'] =
    async (email, password) => {
      const cleanEmail =
        email.trim().toLowerCase();

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        return {
          error: error.message,
        };
      }

      if (!data.user || !data.session) {
        return {
          error:
            'Authentication failed.',
        };
      }

      setSession(data.session);

      const {
        data: teacher,
        error: profileError,
      } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error: profileError.message,
        };
      }

      if (!teacher) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'This account is not registered as a teacher.',
        };
      }

      if (teacher.active === false) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'Your teacher account has been disabled.',
        };
      }

      setRole('teacher');
      setProfile(teacher as Teacher);

      return {};
    };

  /*
   * =========================
   * ADMIN SIGN IN
   * =========================
   *
   * Simple email + password.
   *
   * Admin is verified using
   * admins.email.
   */
  const adminSignIn: AuthContextValue['adminSignIn'] =
    async (email, password) => {
      const cleanEmail =
        email.trim().toLowerCase();

      /*
       * FIRST:
       * Authenticate with Supabase
       */
      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        return {
          error: error.message,
        };
      }

      if (!data.user || !data.session) {
        return {
          error:
            'Authentication failed.',
        };
      }

      setSession(data.session);

      /*
       * SECOND:
       * Find admin using email
       */
      const {
  data: admin,
  error: profileError,
} = await supabase
  .from('admins')
  .select('*')
  .eq('user_id', data.user.id)
  .maybeSingle();

      if (profileError) {
        console.error(
          '[AdminSignIn] Admin query error:',
          profileError
        );

        await supabase.auth.signOut();

        clearAuthState();

        return {
          error: profileError.message,
        };
      }

      /*
       * ADMIN NOT FOUND
       */
      if (!admin) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'This account is not registered as an admin.',
        };
      }

      /*
       * ADMIN DISABLED
       */
      if (admin.active === false) {
        await supabase.auth.signOut();

        clearAuthState();

        return {
          error:
            'Your admin account has been disabled.',
        };
      }

      /*
       * ADMIN LOGIN SUCCESS
       */
      setRole('admin');
      setProfile(admin as Admin);

      return {};
    };

  /*
   * =========================
   * FORGOT PASSWORD
   * =========================
   */
  const forgotPassword: AuthContextValue['forgotPassword'] =
    async (email) => {
      const cleanEmail =
        email.trim().toLowerCase();

      const redirectTo =
        Linking.createURL(
          'reset-password'
        );

      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        return {
          error: error.message,
        };
      }

      return {};
    };

  /*
   * =========================
   * SIGN OUT
   * =========================
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        '[Auth] Sign out error:',
        error
      );
    } finally {
      clearAuthState();
    }
  };

  /*
   * =========================
   * CONTEXT VALUE
   * =========================
   */
  const value: AuthContextValue = {
    loading,
    session,
    user: session?.user ?? null,
    role,
    profile,

    studentSignUp,
    studentSignIn,
    teacherSignIn,
    adminSignIn,

    forgotPassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/*
 * =========================
 * USE AUTH
 * =========================
 */
export function useAuth(): AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}