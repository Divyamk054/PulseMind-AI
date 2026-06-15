// Firebase SDK Client Initialization & Auth Wrapper with Offline Mock Fallback
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";

// Firebase credentials (to be filled by user in .env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let app = null;
let useMock = true;

if (firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    useMock = false;
    console.log("Firebase client initialized successfully.");
  } catch (e) {
    console.error("Firebase init failed, using mock auth fallback:", e);
  }
}

export const isFirebaseConfigured = () => !useMock;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface IAuthService {
  getCurrentUser(): UserProfile | null;
  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void;
  login(email: string, pass: string): Promise<UserProfile>;
  register(email: string, pass: string, name: string): Promise<UserProfile>;
  loginWithGoogle(): Promise<UserProfile>;
  logout(): Promise<void>;
}

// Real Firebase Auth Implementation
class FirebaseAuthService implements IAuthService {
  private auth;

  constructor(appInstance: any) {
    this.auth = getAuth(appInstance);
  }

  getCurrentUser(): UserProfile | null {
    const fUser = this.auth.currentUser;
    if (!fUser) return null;
    return this.mapFirebaseUser(fUser);
  }

  private mapFirebaseUser(user: FirebaseUser): UserProfile {
    return {
      id: user.uid,
      email: user.email || "",
      name: user.displayName || user.email?.split("@")[0] || "User",
      role: (user.email && user.email.includes("admin")) ? "admin" : "patient"
    };
  }

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => {
      if (user) {
        callback(this.mapFirebaseUser(user));
      } else {
        callback(null);
      }
    });
  }

  async login(email: string, pass: string): Promise<UserProfile> {
    const credential = await signInWithEmailAndPassword(this.auth, email, pass);
    return this.mapFirebaseUser(credential.user);
  }

  async register(email: string, pass: string, name: string): Promise<UserProfile> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, pass);
    await updateProfile(credential.user, { displayName: name });
    return this.mapFirebaseUser(credential.user);
  }

  async loginWithGoogle(): Promise<UserProfile> {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    return this.mapFirebaseUser(credential.user);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}

// Mock Auth Class for Offline Flow
class MockAuthService implements IAuthService {
  private listeners: ((user: UserProfile | null) => void)[] = [];

  private getStorageUser(): UserProfile | null {
    const user = localStorage.getItem("medimind_user");
    return user ? JSON.parse(user) : null;
  }

  getCurrentUser(): UserProfile | null {
    return this.getStorageUser();
  }

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    const user = this.getCurrentUser();
    this.listeners.forEach((l) => l(user));
  }

  async register(email: string, pass: string, name: string): Promise<UserProfile> {
    const users = JSON.parse(localStorage.getItem("medimind_users") || "[]");
    if (users.find((u: any) => u.email === email)) {
      throw new Error("Email already registered.");
    }
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      role: email.includes("admin") ? "admin" : "patient"
    };
    users.push({ ...newUser, pass });
    localStorage.setItem("medimind_users", JSON.stringify(users));
    localStorage.setItem("medimind_user", JSON.stringify(newUser));
    this.notifyListeners();
    return newUser;
  }

  async login(email: string, pass: string): Promise<UserProfile> {
    // Admin override
    if (email === "admin@medimind.ai" && pass === "admin123") {
      const adminUser = { id: "admin-id", email, name: "Dr. Administrator", role: "admin" };
      localStorage.setItem("medimind_user", JSON.stringify(adminUser));
      this.notifyListeners();
      return adminUser;
    }

    const users = JSON.parse(localStorage.getItem("medimind_users") || "[]");
    const found = users.find((u: any) => u.email === email && u.pass === pass);
    if (!found) {
      throw new Error("Invalid email or password.");
    }
    const userProfile = { id: found.id, email: found.email, name: found.name, role: found.role };
    localStorage.setItem("medimind_user", JSON.stringify(userProfile));
    this.notifyListeners();
    return userProfile;
  }

  async loginWithGoogle(): Promise<UserProfile> {
    const mockGoogleUser = {
      id: "google-" + Math.random().toString(36).substr(2, 9),
      email: "google.user@example.com",
      name: "Google User",
      role: "patient"
    };
    localStorage.setItem("medimind_user", JSON.stringify(mockGoogleUser));
    this.notifyListeners();
    return mockGoogleUser;
  }

  async logout(): Promise<void> {
    localStorage.removeItem("medimind_user");
    this.notifyListeners();
  }
}

export const authService: IAuthService =
  app && !useMock ? new FirebaseAuthService(app) : new MockAuthService();
