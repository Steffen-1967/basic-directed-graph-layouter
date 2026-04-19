/**
 * @file lockManager.ts
 * @description In-memory manager for scenario locks. 
 * Note: In a multi-server environment, this would be replaced by a database or Redis.
 */

interface LockInfo {
    clientId: string;
    expiresAt: number;
}

const locks = new Map<string, LockInfo>();
const LOCK_TIMEOUT = 5 * 60 * 1000;

export function pruneLocks() {
    const now = Date.now();
    locks.forEach((info, envelope) => {
        if (now > info.expiresAt) {
            locks.delete(envelope);
        }
    });
}

export function getLockStatus(envelope: string) {
    pruneLocks();
    const info = locks.get(envelope);
    return {
        locked: !!info,
        holder: info ? info.clientId : null
    };
}

export function acquireLock(envelope: string, clientId: string) {
    pruneLocks();
    const current = locks.get(envelope);
    if (!current || current.clientId === clientId) {
        locks.set(envelope, { clientId, expiresAt: Date.now() + LOCK_TIMEOUT });
        return { success: true };
    }
    return { success: false, holder: current.clientId };
}

export function heartbeatLock(envelope: string, clientId: string) {
    pruneLocks();
    const current = locks.get(envelope);
    if (current && current.clientId === clientId) {
        current.expiresAt = Date.now() + LOCK_TIMEOUT;
        return { success: true };
    }
    return { success: false };
}

export function releaseLock(envelope: string, clientId: string) {
    const current = locks.get(envelope);
    if (current && current.clientId === clientId) {
        locks.delete(envelope);
        return true;
    }
    return false;
}
