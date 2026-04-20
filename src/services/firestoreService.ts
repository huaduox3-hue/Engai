import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  onSnapshot,
  setDoc,
  increment,
  limit,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null = null) {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown Firestore Error',
    operationType: operation,
    path: path,
    authInfo: user ? {
      userId: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerInfo: user.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName,
        email: p.email
      }))
    } : null
  };
  
  if (error.code === 'permission-denied') {
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

export const firestoreService = {
  async createQuote(data: any) {
    try {
      const docRef = await addDoc(collection(db, 'quotes'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Auto-trigger trial if not started
      if (data.userId) {
        await this.activateTrial(data.userId);
      }

      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, 'create', 'quotes');
    }
  },

  async getQuotes(userId: string) {
    try {
      const q = query(
        collection(db, 'quotes'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'quotes');
    }
  },

  async getPurchaseOrders(userId: string) {
    try {
      const q = query(
        collection(db, 'purchaseOrders'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'purchaseOrders');
    }
  },

  async getPurchaseOrder(id: string) {
    try {
      const snap = await getDoc(doc(db, 'purchaseOrders', id));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      handleFirestoreError(e, 'get', `purchaseOrders/${id}`);
    }
  },

  async updatePurchaseOrder(id: string, data: any) {
    try {
      await updateDoc(doc(db, 'purchaseOrders', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `purchaseOrders/${id}`);
    }
  },

  async deletePurchaseOrder(id: string) {
    try {
      await deleteDoc(doc(db, 'purchaseOrders', id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `purchaseOrders/${id}`);
    }
  },

  async findAIEstimate(queryText: string) {
    try {
      const q = query(collection(db, 'aiEstimates'), where('query', '==', queryText));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].data().result;
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async saveAIEstimate(queryText: string, result: any) {
    try {
      await addDoc(collection(db, 'aiEstimates'), {
        query: queryText,
        result,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  },

  async createPurchaseOrder(data: any) {
    try {
      const docRef = await addDoc(collection(db, 'purchaseOrders'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Auto-trigger trial if not started
      if (data.userId) {
        await this.activateTrial(data.userId);
      }

      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, 'create', 'purchaseOrders');
    }
  },

  async getQuote(id: string) {
    try {
      const docRef = doc(db, 'quotes', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      handleFirestoreError(e, 'get', `quotes/${id}`);
    }
  },

  async deleteQuote(id: string) {
    try {
      const docRef = doc(db, 'quotes', id);
      await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, 'delete', `quotes/${id}`);
    }
  },

  async getUserProfile(id: string) {
    try {
      const docRef = doc(db, 'users', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      handleFirestoreError(e, 'get', `users/${id}`);
    }
  },

  onUserProfileUpdated(id: string, callback: (profile: any) => void) {
    return onSnapshot(doc(db, 'users', id), (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    });
  },

  async createUserProfile(userId: string, data: any) {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...data,
        billingCycle: 'annual', // Set default
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'create', `users/${userId}`);
    }
  },

  async updateUserProfile(userId: string, data: any) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${userId}`);
    }
  },

  async updateQuote(id: string, data: any) {
    try {
      const docRef = doc(db, 'quotes', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `quotes/${id}`);
    }
  },

  async addPayment(data: any) {
    try {
      const { receivedDate, ...rest } = data;
      await addDoc(collection(db, 'payments'), {
        ...rest,
        receivedDate: receivedDate ? Timestamp.fromDate(new Date(receivedDate)) : serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'create', 'payments');
    }
  },

  async deletePayment(id: string) {
    try {
      await deleteDoc(doc(db, 'payments', id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `payments/${id}`);
    }
  },

  async updatePayment(id: string, data: any) {
    try {
      const { receivedDate, ...rest } = data;
      const docRef = doc(db, 'payments', id);
      await updateDoc(docRef, {
        ...rest,
        receivedDate: receivedDate ? Timestamp.fromDate(new Date(receivedDate)) : serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `payments/${id}`);
    }
  },

  async getPayments(quoteId: string) {
    try {
      const q = query(
        collection(db, 'payments'), 
        where('quoteId', '==', quoteId),
        where('userId', '==', auth.currentUser?.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.receivedDate?.toMillis() || 0) - (a.receivedDate?.toMillis() || 0));
    } catch (e) {
      handleFirestoreError(e, 'list', 'payments');
    }
  },

  // --- Admin Methods ---
  async getAllUsers() {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'users');
    }
  },

  async getAllQuotes() {
    try {
      const snapshot = await getDocs(collection(db, 'quotes'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'quotes');
    }
  },

  async getAllPayments() {
    try {
      const snapshot = await getDocs(collection(db, 'payments'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'payments');
    }
  },

  async updateUserPlan(userId: string, plan: 'free' | 'pro' | 'pro_trial', billingCycle: 'monthly' | 'annual' = 'monthly', role: 'user' | 'admin' = 'user') {
    try {
      await updateDoc(doc(db, 'users', userId), { plan, billingCycle, role });
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${userId}`);
    }
  },

  async cancelSubscription(userId: string) {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        plan: 'free',
        billingCycle: 'monthly'
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${userId}`);
    }
  },

  // --- Plan Management ---
  async adminUpdateUserProfile(userId: string, data: any) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${userId}`);
    }
  },

  async updatePaymentStatus(paymentId: string, status: string) {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `payments/${paymentId}`);
    }
  },

  async getPlans() {
    try {
      const snap = await getDocs(collection(db, 'plans'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'plans');
    }
  },

  async updatePlan(id: string, data: any) {
    try {
      await setDoc(doc(db, 'plans', id), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'update', `plans/${id}`);
    }
  },

  async activateTrial(userId: string) {
    try {
      const profile = await this.getUserProfile(userId);
      if (profile && !profile.trialStartedAt) {
        const now = new Date();
        const expires = new Date();
        expires.setDate(now.getDate() + 7); // 7-day trial
        
        await updateDoc(doc(db, 'users', userId), {
          trialStartedAt: serverTimestamp(),
          trialExpiresAt: Timestamp.fromDate(expires),
          plan: 'pro_trial',
          updatedAt: serverTimestamp()
        });
        return { trialStartedAt: now, trialExpiresAt: expires, plan: 'pro_trial' };
      }
      return null;
    } catch (e) {
      console.error('Failed to activate trial:', e);
      return null;
    }
  },

  async ensureDefaultPlans() {
    try {
      const plans = await this.getPlans();
      const hasPro = plans?.some((p: any) => p.id === 'pro');
      if (!hasPro) {
        await this.updatePlan('pro', {
          name: '匠心專業版 / PRO',
          monthlyPrice: 150,
          annualPrice: 1200,
          features: [
            "AI 智慧成本估算與材料推薦",
            "極致簡約、現代、古典多樣合約樣式",
            "數位存證合約與法律條款範本",
            "1對1 專員線上支援服務"
          ]
        });
      }
    } catch (e) {
      console.error('Failed to ensure default plans:', e);
    }
  },

  // --- Real-time Listeners ---
  onQuotesUpdated(userId: string, callback: (quotes: any[]) => void) {
    const q = query(
      collection(db, 'quotes'), 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  onPaymentsUpdated(userId: string, callback: (payments: any[]) => void) {
    const q = query(
      collection(db, 'payments'), 
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  onPurchaseOrdersUpdated(userId: string, callback: (pos: any[]) => void) {
    const q = query(
      collection(db, 'purchaseOrders'), 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  onAllUsersUpdated(callback: (users: any[]) => void) {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  onAllQuotesUpdated(callback: (quotes: any[]) => void) {
    return onSnapshot(collection(db, 'quotes'), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  onAllPaymentsUpdated(callback: (payments: any[]) => void) {
    return onSnapshot(collection(db, 'payments'), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  // --- Client & Supplier Methods ---
  async getClients(userId: string) {
    try {
      const q = query(collection(db, 'clients'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'clients');
    }
  },

  async createClient(data: any) {
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...data,
        isFavorite: data.isFavorite || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, 'create', 'clients');
    }
  },

  async updateClient(id: string, data: any) {
    try {
      await updateDoc(doc(db, 'clients', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `clients/${id}`);
    }
  },

  async deleteClient(id: string) {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `clients/${id}`);
    }
  },

  async getSuppliers(userId: string) {
    try {
      const q = query(collection(db, 'suppliers'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, 'list', 'suppliers');
    }
  },

  async createSupplier(data: any) {
    try {
      const docRef = await addDoc(collection(db, 'suppliers'), {
        ...data,
        isFavorite: data.isFavorite || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, 'create', 'suppliers');
    }
  },

  async updateSupplier(id: string, data: any) {
    try {
      await updateDoc(doc(db, 'suppliers', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `suppliers/${id}`);
    }
  },

  async deleteSupplier(id: string) {
    try {
      await deleteDoc(doc(db, 'suppliers', id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `suppliers/${id}`);
    }
  },

  async findContactByName(userId: string, name: string, type: 'clients' | 'suppliers') {
    try {
      const q = query(
        collection(db, type), 
        where('userId', '==', userId), 
        where('name', '==', name)
      );
      const snap = await getDocs(q);
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
      return null;
    } catch (e) {
      console.error(`Failed to find ${type} by name:`, e);
      return null;
    }
  },

  async awardReferralPoints(referralCode: string, points: number = 100) {
    try {
      // Find the user who owns this referral code
      const q = query(
        collection(db, 'users'), 
        where('referralCode', '==', referralCode),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        // Use increment for atomic safety and matching the security rules
        await updateDoc(doc(db, 'users', userDoc.id), {
          points: increment(points)
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to award referral points:', e);
      return false;
    }
  },

  async grantTestPoints(userId: string, points: number = 5000) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        points: increment(points),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${userId}`);
      return false;
    }
  },

  async deductPoints(userId: string, amount: number) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const success = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userDocRef);
        if (!snap.exists()) return false;
        const currentPoints = snap.data().points || 0;
        if (currentPoints < amount) return false;
        
        transaction.update(userDocRef, {
          points: currentPoints - amount,
          updatedAt: serverTimestamp()
        });
        return true;
      });
      return success;
    } catch (e) {
      console.error('Failed to deduct points:', e);
      return false;
    }
  },

  async redeemProWithPoints(userId: string, cost: number = 2000) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const success = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userDocRef);
        if (!snap.exists()) return false;

        const userData = snap.data();
        const currentPoints = userData.points || 0;

        if (currentPoints < cost) return false;

        // Calculate new expiration date (30 days from now or from current expiry)
        const currentExpiry = userData.trialExpiresAt?.toDate() || new Date();
        const startFrom = currentExpiry > new Date() ? currentExpiry : new Date();
        const newExpiry = new Date(startFrom.getTime() + 30 * 24 * 60 * 60 * 1000);

        transaction.update(userDocRef, {
          points: currentPoints - cost,
          plan: 'pro',
          trialExpiresAt: Timestamp.fromDate(newExpiry),
          updatedAt: serverTimestamp()
        });
        return true;
      });

      return success;
    } catch (e) {
      console.error('Failed to redeem Pro with points:', e);
      return false;
    }
  },

  async redeemBrandKitWithPoints(userId: string, cost: number = 800) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const success = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userDocRef);
        if (!snap.exists()) return false;

        const userData = snap.data();
        const currentPoints = userData.points || 0;

        if (currentPoints < cost) return false;

        transaction.update(userDocRef, {
          points: currentPoints - cost,
          hasBrandKit: true,
          updatedAt: serverTimestamp()
        });
        return true;
      });

      return success;
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${userId}`);
      return false;
    }
  },

  async redeemAIInsightWithPoints(userId: string, cost: number = 1200) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const success = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userDocRef);
        if (!snap.exists()) return false;

        const userData = snap.data();
        const currentPoints = userData.points || 0;

        if (currentPoints < cost) return false;

        transaction.update(userDocRef, {
          points: currentPoints - cost,
          hasAIInsight: true,
          updatedAt: serverTimestamp()
        });
        return true;
      });
      return success;
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${userId}`);
      return false;
    }
  },

  async submitFeedback(userId: string, data: { type: string, content: string, email?: string, name?: string }) {
    try {
      await addDoc(collection(db, 'feedback'), {
        ...data,
        userId,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'create', 'feedback');
    }
  },

  onAllFeedbackUpdated(callback: (feedback: any[]) => void) {
    const q = query(
      collection(db, 'feedback'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },

  async updateFeedbackStatus(id: string, status: string) {
    try {
      await updateDoc(doc(db, 'feedback', id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `feedback/${id}`);
    }
  },
};
