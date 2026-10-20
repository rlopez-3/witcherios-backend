import { db } from "@config/firebase";

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "customer" | "admin";
  phone?: string;
  shippingAddress?: ShippingAddress;
  language?: string;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export class UserService {
  private collection = db.collection("users");

  async syncUser(
    uid: string,
    email: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<UserProfile> {
    const userRef = this.collection.doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      const newUser: UserProfile = {
        uid,
        email,
        displayName: displayName || email.split("@")[0],
        photoURL: photoURL || "",
        role: "customer",
        language: "es",
        currency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userRef.set(newUser);
      return newUser;
    }

    return doc.data() as UserProfile;
  }

  async getProfile(uid: string): Promise<UserProfile | null> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) return null;
    return doc.data() as UserProfile;
  }

  async updateProfile(
    uid: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const userRef = this.collection.doc(uid);
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Evitar que el cliente intente modificar campos restringidos
    delete payload.uid;
    delete payload.role;
    delete payload.createdAt;

    await userRef.update(payload);
    const updatedDoc = await userRef.get();
    return updatedDoc.data() as UserProfile;
  }
}
