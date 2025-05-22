export interface Agent {
  id: string; // Firestore document ID
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
