/**
 * @file networkService.ts
 * Specialized service for REST API (Load/Save/Locks) communication.
 */

import { AppState } from './state';
import { LoggerProxy } from './loggerProxy';
import { GraphNode, Envelope, ListEntryInfo, MultiLangProp, collectAllNodes, getLangValue, newEnvelope, LayoutType } from './manifest';
import { LayoutEngine } from './layoutEngine'; 
import { HistoryManager } from './historyManager';
import { StateManager } from './stateManager';

export interface NetworkCallbacks {
    updateEditButton: () => void;
    updatePadlockIcon: () => void;
    showLockModal: (message: string) => void;
    showNotification: (title: string, message: string, type?: 'info' | 'warning' | 'error') => void;
    showRecoveryModal: (message: string) => Promise<boolean>;
    showSaveBeforeLeaveModal: (message: string) => Promise<'save' | 'discard' | 'cancel'>;
    refreshGraph: () => Promise<void>;
    centerGraph: () => void;
    updateCanvasSize: () => void;
    updateHistoryButtons: () => void;
    resetSelection: () => void;
    envelopeLoadedCallback: (name: MultiLangProp) => void;
}

export class NetworkService {
    private stateManager: StateManager;
    private state: AppState;
    private history: HistoryManager;
    private callbacks: NetworkCallbacks;
    private apiLoggerProxy: LoggerProxy;

    constructor(stateManager: StateManager, history: HistoryManager, callbacks: NetworkCallbacks) {
        this.stateManager = stateManager;
        this.state = (stateManager as any).state;
        this.history = history;
        this.callbacks = callbacks;
        this.apiLoggerProxy = new LoggerProxy('NETWORK');
    }

    async loadDataFilesFromServerFS(): Promise<{ fileList: ListEntryInfo[] }> {
        try {
            const response = await fetch('/api/fs/dataFiles');
            const data = await response.json();
            if (data.success) {
                return { fileList: (data.rawList || []).map((f: any) => ({ ...f, source: 'fs' as const })) };
            }
            return { fileList: [] };
        } catch (error) {
            return { fileList: [] };
        }
    }

    async loadEnvelopesFromServer(): Promise<{ envelope: Envelope, items: ListEntryInfo[] }> {
        try {
            const response = await fetch('/api/age/envelopes');
            const data = await response.json();
            if (data.success) {
                const envelope = LayoutEngine.cleanupEnvelopeForPersistence(data.envelopes);
                const validatedEnvelope = LayoutEngine.validateAndTransformGraph(envelope);
                const items = (validatedEnvelope.nodes || []).map((u: GraphNode) => {
                    let finalLayout = (u as any).layoutType || validatedEnvelope.layoutType;
                    if (!finalLayout || finalLayout === LayoutType.Flow || finalLayout === 'Flow') {
                        finalLayout = LayoutType.ForceAtlas;
                    }
                    return {
                        fileName: getLangValue(u.name),
                        lastModified: Date.now(),
                        size: 0,
                        type: u.type,
                        layoutType: finalLayout as LayoutType,
                        id: u.id,
                        name: u.name,
                        description: u.description,
                        source: 'age' as const
                    };
                });
                return { envelope: validatedEnvelope, items };
            }
            return { envelope: newEnvelope(), items: [] };
        } catch (error) {
            return { envelope: newEnvelope(), items: [] };
        }
    }

    async loadEnvelopesFromFirebase(): Promise<{ items: ListEntryInfo[] }> {
        try {
            const response = await fetch('/api/firebase/envelopes');
            const data = await response.json();
            if (data.success) {
                return { items: (data.items || []).map((i: any) => ({ ...i, source: 'firebase' as const })) };
            }
            return { items: [] };
        } catch (error) {
            return { items: [] };
        }
    }

    async loadUsecasesFromServer(): Promise<{ envelope: Envelope, items: ListEntryInfo[] }> {
        try {
            const response = await fetch('/api/age/usecases');
            const data = await response.json();
            if (data.success) {
                const envelope = LayoutEngine.cleanupEnvelopeForPersistence(newEnvelope(null, null, null, LayoutType.ForceAtlas, null, data.usecases.nodes));
                const validatedEnvelope = LayoutEngine.validateAndTransformGraph(envelope);
                const items = (validatedEnvelope.nodes || []).map((u: GraphNode) => {
                    let finalLayout = (u as any).layoutType || validatedEnvelope.layoutType;
                    if (!finalLayout || finalLayout === LayoutType.Flow || finalLayout === 'Flow') {
                        finalLayout = LayoutType.ForceAtlas;
                    }
                    return {
                        fileName: getLangValue(u.name),
                        lastModified: Date.now(),
                        size: 0,
                        type: u.type,
                        layoutType: finalLayout as LayoutType,
                        id: u.id,
                        name: u.name,
                        description: u.description,
                        source: 'age' as const
                    };
                });
                return { envelope: validatedEnvelope, items };
            }
            return { envelope: newEnvelope(), items: [] };
        } catch (error) {
            return { envelope: newEnvelope(), items: [] };
        }
    }

    async loadDataForDisplayAndEdit(fileName: string | null, listEntryInfo: ListEntryInfo | null): Promise<void> {
        try {
            if (this.history.isDirty()) {
                const decision = await this.callbacks.showSaveBeforeLeaveModal(`Änderungen speichern?`);
                if (decision === 'cancel') return;
                if (decision === 'save' && this.state.currentFileName) {
                    await this.saveData(this.state.currentFileName, listEntryInfo?.source || 'fs');
                }
                this.history.clear();
            }

            this.callbacks.resetSelection();
            if (this.state.network.currentEnvelopeLock) {
                await this.releaseLock(this.state.network.currentEnvelopeLock.envelope);
            }
            
            this.stateManager.setEditable(false);
            const targetId = fileName || listEntryInfo?.id || 'unknown';
            this.state.currentFileName = targetId;
            this.state.currentDataSource = listEntryInfo?.source || 'fs';
            this.history.persistenceKey = 'mylife_snapshot_' + targetId;
            
            const recoveredSnapshot = this.history.recover();
            if (recoveredSnapshot) {
                const useRecovered = await this.callbacks.showRecoveryModal(`Snapshot wiederherstellen?`);
                if (useRecovered === true) {
                    const allNodes = collectAllNodes(recoveredSnapshot.envelope, true);
                    this.stateManager.setEnvelope(recoveredSnapshot.envelope, allNodes);
                    this.callbacks.envelopeLoadedCallback(recoveredSnapshot.envelope.name);
                    await this.callbacks.refreshGraph();
                    this.callbacks.centerGraph();
                    return;
                }
                this.history.clear();
            }

            let url = '';
            if (listEntryInfo?.source === 'firebase') {
                url = `/api/firebase/envelope/${listEntryInfo.id}?t=${Date.now()}`;
            } else if (fileName) {
                url = `/api/fs/envelope/${fileName}?t=${Date.now()}`;
            } else {
                url = `/api/age/usecase/${listEntryInfo?.id}?t=${Date.now()}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                const defaultLayoutForSource = (listEntryInfo?.source === 'age' || listEntryInfo?.source === 'firebase') ? LayoutType.ForceAtlas : LayoutType.Flow;
                const rawEnvelope = (fileName || listEntryInfo?.source === 'firebase') ? (result.data || result.envelope) : newEnvelope(null, null, null, defaultLayoutForSource, null, result.allLoadedNodes);
                const envelope = LayoutEngine.cleanupEnvelopeForPersistence(rawEnvelope);
                const validated = await LayoutEngine.validateAndTransformGraph(envelope);
                
                if (validated) {
                    const allNodes = collectAllNodes(validated, true);
                    this.stateManager.setEnvelope(validated, allNodes);
                    this.callbacks.envelopeLoadedCallback(validated.name);
                    
                    await this.callbacks.refreshGraph();
                    this.callbacks.updateCanvasSize(); 
                    this.callbacks.centerGraph();
                    this.history.clear();
                }
            } else {
                this.callbacks.showNotification('Ladefehler', result.error, 'error');
            }
        } catch (error: any) {
            this.callbacks.showNotification('Systemfehler', error.message, 'error');
        }
    }

    async saveData(name: string, source: 'fs' | 'age' | 'firebase' = 'fs'): Promise<void> {
        if (!this.state.envelope || !this.state.interaction.isEditable) return;
        try {
            const cleanEnvelope = LayoutEngine.cleanupEnvelopeForPersistence(this.state.envelope, true);
            let url = '';
            if (source === 'firebase') url = '/api/firebase/envelope';
            else if (source === 'fs') url = '/api/fs/envelope/' + name;
            else url = '/api/age/envelopes'; // Placeholder for AGE save

            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanEnvelope) });
            const result = await response.json();
            if (result.success) {
                this.stateManager.setDirty(false);
                this.callbacks.updateHistoryButtons();
            } else {
                this.callbacks.showNotification('Speicherfehler', result.error, 'error');
            }
        } catch (error: any) {
             this.callbacks.showNotification('Systemfehler', error.message, 'error');
        }
    }
    
    async requestLock(envelopeName: string): Promise<boolean> {
        try {
            const clientId = typeof window !== 'undefined' ? (localStorage.getItem('mylife_clientId') || 'unknown') : 'unknown';
            const response = await fetch('/api/locks/acquire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ envelope: envelopeName, clientId }) });
            const result = await response.json();
            if (result.success) {
                this.state.network.currentEnvelopeLock = result.lock;
                this.state.network.isLockedByOther = false;
                this.callbacks.updatePadlockIcon();
                return true;
            }
            this.state.network.isLockedByOther = true;
            this.callbacks.updatePadlockIcon();
            this.callbacks.showLockModal(result.message);
            return false;
        } catch (error) { return false; }
    }

    async releaseLock(envelopeName: string): Promise<void> {
        try {
            const clientId = typeof window !== 'undefined' ? (localStorage.getItem('mylife_clientId') || 'unknown') : 'unknown';
            await fetch('/api/locks/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ envelope: envelopeName, clientId }) });
            this.state.network.currentEnvelopeLock = null;
            this.state.network.isLockedByOther = false;
            this.callbacks.updatePadlockIcon();
        } catch (error) {}
    }

    async requestForceAtlasLayout(nodes: GraphNode[]): Promise<{id: string, x: number, y: number}[]> {
        try {
            const edges: {source: string, target: string, weight: number}[] = [];
            nodes.forEach(node => {
                (node.outgoing || []).forEach(edge => {
                    edges.push({ source: node.id, target: edge.id, weight: edge.weight || 1 });
                });
            });
            const response = await fetch('/api/layout/force-atlas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodes: nodes.map(n => ({ id: n.id, x: n._x, y: n._y })), edges, config: RENDER_CONFIG.layout.forceAtlas2 }) });
            const result = await response.json();
            if (result.success) return result.positions;
            return nodes.map(n => ({ id: n.id, x: n._x || 0, y: n._y || 0 }));
        } catch (error) {
            return nodes.map(n => ({ id: n.id, x: n._x || 0, y: n._y || 0 }));
        }
    }
}
