/**
 * @file historyManager.ts
 * Generic History Manager for Command-Pattern Actions.
 * Handles Undo, Redo, and LocalStorage Persistence.
 */

import { ScenarioNode, TaskCollectionScenario } from './manifest.js';

export interface Action {
    execute(): void;
    undo(): void;
}

export interface HistoryOptions {
    maxSteps?: number;
    persistenceKey?: string;
}

export class HistoryManager {
    public maxSteps: number;
    public persistenceKey: string;
    public undoStack: Action[];
    public redoStack: Action[];
    public savePointer: number;
    private tabId: string | null = null;

    /**
     * @param {HistoryOptions} options
     */
    constructor(options: HistoryOptions = {}) {
        this.maxSteps = options.maxSteps || 50;
        this.persistenceKey = options.persistenceKey || 'mylife_snapshot';
        this.undoStack = [];
        this.redoStack = [];
        this.savePointer = -1;
    }

    /**
     * Executes a new action and adds it to the undo stack.
     * Clears the redo stack.
     * @param {Action} action - Must implement execute() and undo()
     * @param {TaskCollectionScenario} currentScenario - The current state of scenario to persist
     */
    execute(action: Action, currentScenario: TaskCollectionScenario): void {
        action.execute();
        this.undoStack.push(action);
        this.redoStack = [];

        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
            if (this.savePointer >= 0) {
                this.savePointer--;
            } else {
                // If we shift the stack and savePointer was -1, it means the "saved" state
                // is now lost from history (older than maxSteps). 
                // We keep it at -2 or something to indicate it's unreachable.
                this.savePointer = -2; 
            }
        }

        this.updatePersistence(currentScenario);
    }

    /**
     * Undoes the last action.
     * @param {TaskCollectionScenario} currentScenario - The current state of scenario to persist
     * @returns {Action|null} The undone action or null
     */
    undo(currentScenario: TaskCollectionScenario): Action | null {
        if (this.undoStack.length === 0) return null;

        const action = this.undoStack.pop()!;
        action.undo();
        this.redoStack.push(action);

        this.updatePersistence(currentScenario);
        return action;
    }

    /**
     * Redoes the last undone action.
     * @param {TaskCollectionScenario} currentScenario - The current state of scenario to persist
     * @returns {Action|null} The redone action or null
     */
    redo(currentScenario: TaskCollectionScenario): Action | null {
        if (this.redoStack.length === 0) return null;

        const action = this.redoStack.pop()!;
        action.execute();
        this.undoStack.push(action);

        this.updatePersistence(currentScenario);
        return action;
    }

    /**
     * Marks the current state as saved.
     */
    markSaved(): void {
        this.savePointer = this.undoStack.length - 1;
        // Also clear local storage because it's now synced with server
        localStorage.removeItem(this.persistenceKey);
    }

    /**
     * Resets the history stacks.
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.savePointer = -1;
        localStorage.removeItem(this.persistenceKey);
    }

    /**
     * Updates persistence in LocalStorage based on dirty state.
     */
    private updatePersistence(scenario: TaskCollectionScenario): void {
        if (this.isDirty()) {
            this.persist(scenario);
        } else {
            localStorage.removeItem(this.persistenceKey);
        }
    }

    /**
     * Persists the current scenario state to LocalStorage.
     * @param {TaskCollectionScenario} scenario 
     */
    private persist(scenario: TaskCollectionScenario): void {
        try {
            const snapshot = {
                nodes: scenario.nodes,
                scenarioName: scenario.scenarioName,
                layoutType: scenario.layoutType,
                timestamp: Date.now(),
                version: 1, // Schema version for future compatibility
                tabId: this.tabId || (this.tabId = Math.random().toString(36).substring(2, 9)),
            };
            localStorage.setItem(this.persistenceKey, JSON.stringify(snapshot));
        } catch (e) {
            console.error('[HISTORY] Failed to persist state to LocalStorage. Changes can not be buffered and might get lost, proceed with caution.', e);
        }
    }

    /**
     * Recovers state from LocalStorage.
     * @returns {any} Recovered scenario data or null
     */
    recover(): any {
        try {
            const data = localStorage.getItem(this.persistenceKey);
            if (!data) return null;
            const snapshot = JSON.parse(data);
            
            // Check if snapshot is from a different tab
            if (snapshot.tabId && snapshot.tabId !== this.tabId) {
                console.warn('[HISTORY] Snapshot from different tab detected. Proceeding with caution.');
            }
            
            // Check schema version
            if (snapshot.version && snapshot.version > 1) {
                console.warn('[HISTORY] Snapshot has newer schema version. Data might be incompatible.');
            }
            
            return {
                nodes: snapshot.nodes,
                scenarioName: snapshot.scenarioName,
                layoutType: snapshot.layoutType,
                timestamp: snapshot.timestamp
            };
        } catch (e) {
            console.error('[HISTORY] Failed to recover state from LocalStorage. Buffered changes are lost, proceed with caution.', e);
            return null;
        }
    }

    /**
     * Checks if there are unsaved changes.
     * @returns {boolean}
     */
    isDirty(): boolean {
        // We are dirty if the current undoStack pointer differs from savePointer
        const currentPointer = this.undoStack.length - 1;
        return currentPointer !== this.savePointer;
    }
}

// Global exposure for browser (legacy)
if (typeof window !== 'undefined') {
    (window as any).HistoryManager = HistoryManager;
}
