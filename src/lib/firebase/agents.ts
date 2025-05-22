import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client'; // Assuming db is initialized and exported from client.ts
import type { Agent } from '../types';

/**
 * Adds a new agent to the Firestore 'agents' collection.
 * @param agentData - An object containing the name and email of the agent.
 * @returns A Promise that resolves to the newly created Agent object, including its Firestore ID and timestamps.
 */
export async function addAgent(agentData: { name: string; email: string }): Promise<Agent> {
  try {
    const dataToSave = {
      ...agentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'agents'), dataToSave);

    // Fetch the document to get the server-generated timestamps
    const newDocSnap = await getDoc(doc(db, 'agents', docRef.id));
    if (!newDocSnap.exists()) {
      throw new Error('Failed to fetch newly created agent document.');
    }

    const newAgentData = newDocSnap.data();
    const newAgent: Agent = {
      id: newDocSnap.id,
      name: newAgentData.name,
      email: newAgentData.email,
      createdAt: (newAgentData.createdAt as Timestamp).toDate(),
      updatedAt: (newAgentData.updatedAt as Timestamp).toDate(),
    };
    return newAgent;
  } catch (error) {
    console.error('Error adding agent:', error);
    throw new Error(`Failed to add agent: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Lists all agents from the Firestore 'agents' collection.
 * @returns A Promise that resolves to an array of Agent objects.
 */
export async function listAgents(): Promise<Agent[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'agents'));
    const agents: Agent[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as Agent; // Type assertion needed as Firestore data is loosely typed
    });
    return agents;
  } catch (error) {
    console.error('Error listing agents:', error);
    throw new Error(`Failed to list agents: ${error instanceof Error ? error.message : String(error)}`);
  }
}
