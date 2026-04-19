/**
 * @file historyManager.ts
 * Manages undo/redo stacks and handles action execution via the Command-Pattern.
 */

import { LayoutEngine } from './layoutEngine';
import { Envelope } from './manifest';
import { stateEvents } from './state';

/**
 * Interface for any action that can be executed and undone.
 */
export interface Action {
    execute(): void;
    undo(): void;
    focus?(): string | null; // Returns the ID of the node to focus after action
}

interface HistoryOptions {
    maxStackSize?: number;
    persistenceKey?: string;
}

/**
 * Manages the undo/redo stacks and handles action execution.
 */
export class HistoryManager {
    public undoStack: Action[] = [];
    public redoStack: Action[] = [];
    private maxStackSize: number;
    public persistenceKey: string | null;
    private dirty: boolean = false;

    constructor(options: HistoryOptions = {}) {
        this.maxStackSize = options.maxStackSize || 50;
        this.persistenceKey = options.persistenceKey || null;
    }

    /**
     * Executes an action and adds it to the undo stack.
     */
    execute(action: Action, envelope: Envelope): void {
        console.log('[HISTORY] Executing action:', action.constructor.name);
        action.execute();
        this.undoStack.push(action);
        this.redoStack = []; // Clear redo stack on new action
        this.dirty = true;

        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }

        this.saveSnapshot(envelope);

        // Trigger automatic re-render on data change
        stateEvents.emit({ type: 'RENDER_REQUESTED' });
        stateEvents.emit({ type: 'DIRTY_STATE_CHANGED', isDirty: true });
    }

    /**
     * Reverts the last executed action.
     */
    undo(envelope: Envelope): void {
        const action = this.undoStack.pop();
        if (action) {
            console.log('[HISTORY] Undoing action:', action.constructor.name);
            action.undo();
            this.redoStack.push(action);
            this.dirty = true;
            this.saveSnapshot(envelope);
            stateEvents.emit({ type: 'RENDER_REQUESTED' });
            stateEvents.emit({ type: 'DIRTY_STATE_CHANGED', isDirty: true });
        }
    }

    /**
     * Re-executes the last undone action.
     */
    redo(envelope: Envelope): void {
        const action = this.redoStack.pop();
        if (action) {
            console.log('[HISTORY] Redoing action:', action.constructor.name);
            action.execute();
            this.undoStack.push(action);
            this.dirty = true;
            this.saveSnapshot(envelope);
            stateEvents.emit({ type: 'RENDER_REQUESTED' });
            stateEvents.emit({ type: 'DIRTY_STATE_CHANGED', isDirty: true });
        }
    }

    /**
     * Returns true if there are unsaved changes.
     */
    isDirty(): boolean {
        return this.dirty;
    }

    /**
     * Marks the current state as saved.
     */
    markSaved(): void {
        this.dirty = false;
        if (this.persistenceKey) {
            localStorage.removeItem(this.persistenceKey);
        }
        stateEvents.emit({ type: 'DIRTY_STATE_CHANGED', isDirty: false });
    }

    /**
     * Clears the history stacks.
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.dirty = false;
        stateEvents.emit({ type: 'DIRTY_STATE_CHANGED', isDirty: false });
    }

    /**
     * Saves a snapshot of the current state to local storage for recovery.
     */
    private saveSnapshot(envelope: Envelope): void {
        if (!this.persistenceKey || typeof window === 'undefined') return;
        
        try {
            // TRICK: We use a custom replacer to avoid circular references during JSON stringify.
            // This is safer than manual cleanup which might miss some internal fields.
            const cache = new Set();
            const safeJson = JSON.stringify(envelope, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (cache.has(value)) return; // Discard circular reference
                    cache.add(value);
                }
                // Skip internal calculation fields starting with '_'
                if (key.startsWith('_')) return;
                return value;
            });

            const snapshot = {
                timestamp: Date.now(),
                envelope: JSON.parse(safeJson)
            };
            localStorage.setItem(this.persistenceKey, JSON.stringify(snapshot));
        } catch (e) {
            console.error('[HISTORY] Failed to save snapshot:', e);
        }
    }

    /**
     * Recovers a snapshot from local storage.
     */
    recover(): { timestamp: number, envelope: Envelope } | null {
        if (!this.persistenceKey || typeof window === 'undefined') return null;
        
        try {
            const data = localStorage.getItem(this.persistenceKey);
            if (data) {
                const snapshot = JSON.parse(data);
                this.dirty = true; // Recovered data is considered dirty until saved
                return snapshot;
            }
        } catch (e) {
            console.error('[HISTORY] Failed to recover snapshot:', e);
        }
        return null;
    }
}
